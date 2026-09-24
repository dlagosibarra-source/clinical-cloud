/**
 * Audio Transcription Service for WhatsApp Voice Notes
 * Integrates with Groq Whisper API (whisper-large-v3) using OpenAI standard format.
 */

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
}

export async function transcribeAudioVoiceNote(
  audioBuffer: Buffer,
  filename = "voice_note.ogg",
  mimeType = "audio/ogg"
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1";

  if (!apiKey || apiKey === "sk-placeholder") {
    return {
      success: false,
      error: "OPENAI_API_KEY no configurado para transcripción de audio.",
    };
  }

  try {
    const formData = new FormData();
    const file = new File([new Uint8Array(audioBuffer)], filename, { type: mimeType });
    formData.append("file", file);
    formData.append("model", "whisper-large-v3");
    formData.append("language", "es");

    const endpoint = `${baseUrl.replace(/\/+$/, "")}/audio/transcriptions`;
    console.log(
      `[Audio Transcription] 🎙️ Enviando audio a ${endpoint} (Tamaño: ${audioBuffer.length} bytes, Mime: ${mimeType})...`
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Audio Transcription] ❌ Error de Whisper API (${response.status}):`,
        errorText
      );
      return {
        success: false,
        error: `Error HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json()) as { text?: string };
    const text = data.text?.trim();

    if (!text) {
      return {
        success: false,
        error: "La transcripción no devolvió contenido de texto.",
      };
    }

    console.log(`[Audio Transcription] ✅ Transcripción exitosa: "${text}"`);
    return {
      success: true,
      text,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Audio Transcription] ❌ Excepción en transcripción:", msg);
    return {
      success: false,
      error: msg,
    };
  }
}
