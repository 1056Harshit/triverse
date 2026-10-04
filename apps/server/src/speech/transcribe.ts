import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { env } from "../env.ts";

export interface Transcript { text: string; provider: "sarvam" | "whisper-local" }
export type SpeechLanguage = "hi" | "pa" | "en";

const WHISPER_LANG: Record<SpeechLanguage, string> = { hi: "hindi", pa: "punjabi", en: "english" };
const SARVAM_LANG: Record<SpeechLanguage, string> = { hi: "hi-IN", pa: "pa-IN", en: "en-IN" };

/**
 * Speech → text for voice messages (e.g. elderly users describing a crop problem).
 *   SARVAM_API_KEY set → Sarvam (hosted, tuned for Indian languages)
 *   otherwise           → Whisper running locally on this server (free, offline; model downloads once, ~250 MB)
 */
export async function transcribe(audio: Buffer, mimeType: string, language: SpeechLanguage = "hi"): Promise<Transcript> {
  if (env.SARVAM_API_KEY) return sarvam(audio, mimeType, language);
  return whisperLocal(audio, language);
}

async function sarvam(audio: Buffer, mimeType: string, language: SpeechLanguage): Promise<Transcript> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), `voice.${mimeType.split("/")[1] ?? "m4a"}`);
  form.append("model", env.SARVAM_STT_MODEL);
  form.append("language_code", SARVAM_LANG[language]);
  const res = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": env.SARVAM_API_KEY! }, body: form });
  if (!res.ok) throw new Error(`Sarvam ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { transcript?: string };
  return { text: (data.transcript ?? "").trim(), provider: "sarvam" };
}

/**
 * Decode any recording (m4a/aac/webm/wav) to 16 kHz mono float PCM, which Whisper expects.
 * Goes through a temp file: phone m4a files keep their index at the end, so ffmpeg can't read them from a pipe.
 */
async function decodeToPcm(audio: Buffer): Promise<Float32Array> {
  if (!ffmpegPath) throw new Error("ffmpeg binary not available");
  const file = path.join(tmpdir(), `triverse-voice-${randomUUID()}`);
  await writeFile(file, audio);
  try {
    return await new Promise((resolve, reject) => {
      const ff = spawn(ffmpegPath as unknown as string, ["-hide_banner", "-loglevel", "error", "-i", file, "-ac", "1", "-ar", "16000", "-f", "f32le", "pipe:1"]);
      const chunks: Buffer[] = [];
      let err = "";
      ff.stdout.on("data", (c: Buffer) => chunks.push(c));
      ff.stderr.on("data", (c: Buffer) => { err += c.toString(); });
      ff.on("error", reject);
      ff.on("close", (code) => {
        if (code !== 0) return reject(new Error(`ffmpeg failed: ${err.slice(0, 200)}`));
        // Copy into a fresh, 4-byte-aligned buffer for the Float32 view.
        const buf = Buffer.concat(chunks);
        const pcm = new Float32Array(Math.floor(buf.byteLength / 4));
        new Uint8Array(pcm.buffer).set(buf.subarray(0, pcm.length * 4));
        resolve(pcm);
      });
    });
  } finally {
    await unlink(file).catch(() => {});
  }
}

type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string } | Array<{ text: string }>>;
let asr: Promise<Asr> | null = null;

/** Loads the model once and keeps it in memory. */
function loadWhisper(): Promise<Asr> {
  asr ??= (async () => {
    const { pipeline } = await import("@huggingface/transformers");
    return (await pipeline("automatic-speech-recognition", env.WHISPER_MODEL, { dtype: "q8" })) as unknown as Asr;
  })().catch((e) => { asr = null; throw e; });
  return asr;
}

async function whisperLocal(audio: Buffer, language: SpeechLanguage): Promise<Transcript> {
  const [pcm, model] = await Promise.all([decodeToPcm(audio), loadWhisper()]);
  if (pcm.length < 16000 * 0.4) return { text: "", provider: "whisper-local" }; // under 0.4 s: nothing said
  // Local Whisper doesn't auto-detect here (it defaults to English), so the app sends the speaker's language.
  const out = await model(pcm, { task: "transcribe", language: WHISPER_LANG[language], chunk_length_s: 30, stride_length_s: 5 });
  const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text;
  return { text: text.trim(), provider: "whisper-local" };
}

/** Starts the model download/load in the background so the first voice message isn't slow. */
export function warmUpSpeech() {
  if (!env.SARVAM_API_KEY) loadWhisper().catch((e) => console.warn("[speech] Whisper warm-up failed:", (e as Error).message));
}
