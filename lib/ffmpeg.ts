"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/mpeg": "mpeg",
  };
  return map[mime.split(";")[0].trim()] ?? "mp4";
}

/**
 * Extract audio from a video file using FFmpeg.wasm.
 * Returns an MP3 File suitable for upload to the analyze API.
 */
export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (message: string) => void,
): Promise<File> {
  onProgress?.("Loading FFmpeg…");
  const ffmpeg = await getFFmpeg();

  const inputExt = extensionFromMime(videoFile.type);
  const inputName = `input.${inputExt}`;
  const outputName = "output.mp3";

  onProgress?.("Writing video to memory…");
  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

  onProgress?.("Extracting audio…");
  const code = await ffmpeg.exec([
    "-i",
    inputName,
    "-vn",
    "-acodec",
    "libmp3lame",
    "-ar",
    "16000",
    "-ac",
    "1",
    "-b:a",
    "64k",
    outputName,
  ]);

  if (code !== 0) {
    throw new Error("FFmpeg failed to extract audio from this video.");
  }

  onProgress?.("Preparing audio file…");
  const data = await ffmpeg.readFile(outputName);
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : new Uint8Array(data);

  // Cleanup virtual FS
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // ignore cleanup errors
  }

  const baseName = videoFile.name.replace(/\.[^.]+$/, "") || "audio";
  return new File([bytes], `${baseName}.mp3`, { type: "audio/mpeg" });
}
