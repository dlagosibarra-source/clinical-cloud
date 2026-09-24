export interface SendWhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  data?: unknown;
}

/**
 * Helper to execute a single POST request to Meta Graph API v21.0
 */
async function callMetaGraphApi(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const endpointUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      body: message,
    },
  };

  console.log(
    `[WhatsApp Service] 🚀 Enviando a Meta Graph API v21.0 -> Destinatario: ${to}`
  );

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch (err) {
    data = { rawText: String(err) };
  }

  return { ok: response.ok, status: response.status, data };
}

/**
 * Sends an outbound WhatsApp text message to a user via Meta Graph Cloud API.
 * Automatically cleans non-digits, formats Mexican numbers (52 vs 521), and logs all responses.
 *
 * @param to Recipient's phone number (e.g. "+52 1 55 1234 5678" or "5215512345678")
 * @param message The text body to deliver
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<SendWhatsAppMessageResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  // Clean the recipient number to digits only (remove +, spaces, dashes, parentheses)
  let cleanPhone = to.replace(/\D/g, "");

  if (!cleanPhone) {
    console.error("[WhatsApp Service] ❌ Número de teléfono inválido o vacío:", to);
    return {
      success: false,
      error: "Número de teléfono inválido o vacío.",
    };
  }

  // Simulation mode check for automated QA tests
  if (process.env.MOCK_WHATSAPP_DISPATCH === "true") {
    console.log(
      `[WhatsApp Service] 🧪 [MOCK DISPATCH] Entrega simulada a ${cleanPhone} (WhatsApp Cloud API bypass)`
    );
    return {
      success: true,
      messageId: `wamid.sim_${Date.now()}`,
    };
  }

  // Guard against missing credentials in development
  if (!phoneNumberId || !accessToken) {
    console.warn(
      "[WhatsApp Service] ⚠️ WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN no están configurados en .env.local."
    );
    console.log(
      `[WhatsApp Service] 🧪 [MODO SIMULACIÓN] Mensaje para ${cleanPhone}:\n"${message}"`
    );
    return {
      success: false,
      error:
        "Faltan credenciales de Meta (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN).",
    };
  }

  try {
    // Determine possible phone formats for Mexico:
    // When incoming from WhatsApp in Mexico, Meta sends '521' + 10 digits (13 digits).
    // In Meta Allowed Recipients (Test Mode), it is often registered as '52' + 10 digits (12 digits, no '1').
    const candidateNumbers: string[] = [cleanPhone];

    if (cleanPhone.startsWith("521") && cleanPhone.length === 13) {
      // Add standard 12-digit format without the mobile '1' prefix
      candidateNumbers.push("52" + cleanPhone.slice(3));
    } else if (cleanPhone.startsWith("52") && cleanPhone.length === 12) {
      // Add alternate 13-digit format with the mobile '1' prefix
      candidateNumbers.push("521" + cleanPhone.slice(2));
    }

    let lastResult: { ok: boolean; status: number; data: Record<string, unknown> } | null = null;

    for (const candidate of candidateNumbers) {
      const result = await callMetaGraphApi(
        phoneNumberId,
        accessToken,
        candidate,
        message
      );
      lastResult = result;

      if (result.ok) {
        const messageId =
          Array.isArray(result.data.messages) && result.data.messages[0]
            ? (result.data.messages[0] as { id?: string }).id
            : undefined;

        console.log(
          `[WhatsApp Service] ✅ Mensaje entregado a Meta con éxito (Status: ${result.status}). ID: ${messageId}`
        );
        console.log(
          "[WhatsApp Service] 📄 Respuesta completa de Meta:",
          JSON.stringify(result.data, null, 2)
        );

        return {
          success: true,
          messageId,
          data: result.data,
        };
      }

      // If it failed with 131030 (recipient not in allowed list), try the alternate candidate if available
      const errorCode = (result.data.error as { code?: number })?.code;
      console.warn(
        `[WhatsApp Service] ⚠️ Intento de envío a ${candidate} devolvió Status ${result.status} (Código: ${errorCode}).`
      );

      if (errorCode !== 131030) {
        // If it's another error (e.g. auth error, token expired), do not loop unnecessarily
        break;
      }
    }

    // If we reached here, sending failed
    console.error(
      `[WhatsApp Service] ❌ Error de Meta Graph API (Status: ${lastResult?.status}):`,
      JSON.stringify(lastResult?.data, null, 2)
    );

    const errorMessage =
      (lastResult?.data?.error as { message?: string })?.message ||
      `HTTP ${lastResult?.status} error de Meta Graph API`;

    return {
      success: false,
      error: errorMessage,
      data: lastResult?.data,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Error de red desconocido";
    console.error("[WhatsApp Service] ❌ Excepción al contactar Meta API:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export interface WhatsAppMediaInfo {
  url: string;
  mime_type?: string;
  sha256?: string;
  file_size?: number;
  id?: string;
}

/**
 * Retrieves the temporary download URL and metadata for a WhatsApp media file via Meta Graph API
 */
export async function getWhatsAppMediaInfo(
  mediaId: string
): Promise<{ success: boolean; data?: WhatsAppMediaInfo; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN no configurado." };
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${mediaId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        error: `Meta Graph error ${response.status}: ${errText}`,
      };
    }

    const data = (await response.json()) as WhatsAppMediaInfo;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al obtener info de medio",
    };
  }
}

/**
 * Downloads the binary data of a media attachment from Meta's CDN
 */
export async function downloadWhatsAppMediaBuffer(
  mediaUrl: string
): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    return { success: false, error: "WHATSAPP_ACCESS_TOKEN no configurado." };
  }

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ClinicalCloud/1.0",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Error al descargar archivo binario: HTTP ${response.status}`,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { success: true, buffer };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al descargar binario",
    };
  }
}
