/**
 * TTS Service — OpenAI text-to-speech for operator WhatsApp voice replies.
 *
 * Converts Claude's reply text to an MP3 file, stores it in /tmp/cc-tts/,
 * and returns the filename. The API server serves these files at /api/tts/:filename.
 * Files auto-expire after 2 hours.
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const AI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "";
const AI_API_KEY  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";
const TTS_DIR     = "/tmp/cc-tts";
const TTL_MS      = 2 * 60 * 60 * 1000; // 2 hours

fs.mkdirSync(TTS_DIR, { recursive: true });

export function getTtsDir(): string { return TTS_DIR; }

/**
 * Convert text to MP3 using OpenAI TTS.
 * Returns the filename (served at /api/tts/:filename).
 */
export async function generateTTS(text: string): Promise<{ filename: string }> {
  if (!AI_BASE_URL || !AI_API_KEY) throw new Error("OpenAI integration not configured");

  const safeText = text.length > 1200 ? text.slice(0, 1200) + "." : text;

  const response = await fetch(`${AI_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: safeText,
      voice: "onyx",
      response_format: "mp3",
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "unknown");
    throw new Error(`TTS API error ${response.status}: ${err}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${randomUUID()}.mp3`;
  fs.writeFileSync(path.join(TTS_DIR, filename), buffer);
  cleanupOldFiles();
  return { filename };
}

function cleanupOldFiles(): void {
  try {
    const now = Date.now();
    for (const file of fs.readdirSync(TTS_DIR)) {
      const fp = path.join(TTS_DIR, file);
      if (now - fs.statSync(fp).mtimeMs > TTL_MS) fs.unlinkSync(fp);
    }
  } catch { /* non-fatal */ }
}
