const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const AI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "";
const AI_API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "";

export function isVoiceNote(numMedia: number, contentType: string): boolean {
  return numMedia > 0 && contentType.startsWith("audio/");
}

function contentTypeToExt(contentType: string): string {
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("mp4")) return "m4a";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("webm")) return "webm";
  return "ogg";
}

export async function downloadTwilioMedia(mediaUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const credentials = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const response = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!response.ok) {
    throw new Error(`Twilio media download failed: ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "audio/ogg";
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

export async function transcribeVoiceNote(buffer: Buffer, contentType: string): Promise<string> {
  if (!AI_BASE_URL || !AI_API_KEY) {
    throw new Error("OpenAI AI integration not configured — missing env vars");
  }

  const ext = contentTypeToExt(contentType);
  const blob = new Blob([buffer], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, `audio.${ext}`);
  formData.append("model", "gpt-4o-mini-transcribe");

  const response = await fetch(`${AI_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${AI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown error");
    throw new Error(`Transcription API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as { text?: string };
  return (data.text ?? "").trim();
}
