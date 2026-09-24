import type { ClinicalChatMessage } from "./ai.service";
import fs from "fs";
import path from "path";

export interface StoredTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Memory file cache path for development persistence across fast-refreshes
const CACHE_FILE = path.join(process.cwd(), ".conversation_memory_cache.json");

/**
 * In-memory map indexed by cleaned phone number (wa_id)
 */
const memoryStore = new Map<string, StoredTurn[]>();

// Initialize from file cache if available
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    for (const [key, val] of Object.entries(parsed)) {
      if (Array.isArray(val)) {
        memoryStore.set(key, val);
      }
    }
  }
} catch {
  // Ignore cache read errors
}

function persistCache() {
  try {
    const obj: Record<string, StoredTurn[]> = {};
    for (const [key, val] of memoryStore.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch {
    // Ignore cache write errors
  }
}

/**
 * Service to manage multi-turn chat history indexed by wa_id (phone number)
 */
export class ConversationMemoryService {
  /**
   * Retrieves the last N turns for the given user's WhatsApp ID
   *
   * @param waId Recipient's phone number or wa_id
   * @param limit Maximum number of turns (defaults to 10)
   */
  static getHistory(waId: string, limit = 10): ClinicalChatMessage[] {
    const cleanId = waId.replace(/\D/g, "");
    const turns = memoryStore.get(cleanId) || [];

    // Return the last `limit` messages
    return turns.slice(-limit).map((t) => ({
      role: t.role,
      content: t.content,
    }));
  }

  /**
   * Appends a new user or assistant turn to the conversation history
   *
   * @param waId Recipient's phone number or wa_id
   * @param role 'user' or 'assistant'
   * @param content Text content of the message
   */
  static appendTurn(
    waId: string,
    role: "user" | "assistant",
    content: string
  ): void {
    const cleanId = waId.replace(/\D/g, "");
    const trimmed = content.trim();
    if (!trimmed) return;

    const existing = memoryStore.get(cleanId) || [];
    existing.push({
      role,
      content: trimmed,
      timestamp: new Date().toISOString(),
    });

    // Retain only the last 20 total turns to prevent context bloat
    if (existing.length > 20) {
      existing.splice(0, existing.length - 20);
    }

    memoryStore.set(cleanId, existing);
    persistCache();

    console.log(
      `[Conversation Memory] 💾 Turno guardado para ${cleanId} [${role}] (Total historial: ${existing.length})`
    );
  }

  /**
   * Clears the conversation history for a given wa_id
   */
  static clearHistory(waId: string): void {
    const cleanId = waId.replace(/\D/g, "");
    memoryStore.delete(cleanId);
    persistCache();
    console.log(`[Conversation Memory] 🧹 Historial limpiado para ${cleanId}`);
  }
}
