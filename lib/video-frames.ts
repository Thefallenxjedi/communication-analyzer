"use client";

/**
 * Sample evenly spaced JPEG frames from a video File for visual analysis.
 * Handles MediaRecorder WebM blobs where duration is often Infinity/NaN.
 */
export async function extractVideoFrames(
  videoFile: File,
  frameCount = 5,
  maxWidth = 640,
): Promise<File[]> {
  const url = URL.createObjectURL(videoFile);

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    // Required for some browsers to decode recorded blobs
    video.crossOrigin = "anonymous";
    video.src = url;

    await waitForEvent(video, "loadedmetadata");

    // MediaRecorder WebM often reports Infinity until we force a duration probe
    let duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      duration = await probeDuration(video);
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported in this browser.");

    const count = Math.max(1, Math.min(frameCount, 8));
    const files: File[] = [];

    if (!Number.isFinite(duration) || duration <= 0) {
      // Last resort: grab whatever is currently decoded (usually frame 0)
      await safeSeek(video, 0);
      const frame = await captureFrame(video, canvas, ctx, maxWidth, 0);
      if (frame) files.push(frame);
    } else {
      for (let i = 0; i < count; i++) {
        const t =
          count === 1
            ? Math.min(0.15, duration * 0.5)
            : (duration * (i + 0.5)) / count;
        const seekTo = Math.min(Math.max(0, t), Math.max(0, duration - 0.05));
        await safeSeek(video, seekTo);
        const frame = await captureFrame(video, canvas, ctx, maxWidth, i);
        if (frame) files.push(frame);
      }
    }

    // If seeking failed for WebM, fall back to play+timeupdate sampling
    if (files.length === 0) {
      const played = await captureWhilePlaying(video, canvas, ctx, maxWidth, count);
      files.push(...played);
    }

    if (files.length === 0) {
      throw new Error("Could not capture frames from this video.");
    }

    return files;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function waitForEvent(
  video: HTMLVideoElement,
  event: keyof HTMLMediaElementEventMap,
  timeoutMs = 8000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for video ${event}.`));
    }, timeoutMs);

    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("Could not load video for frames."));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener(event, onOk);
      video.removeEventListener("error", onErr);
    };

    video.addEventListener(event, onOk, { once: true });
    video.addEventListener("error", onErr, { once: true });
  });
}

/**
 * Force browsers to resolve duration for MediaRecorder WebM
 * by seeking near a large timestamp, then reading duration.
 */
async function probeDuration(video: HTMLVideoElement): Promise<number> {
  // Try common Infinity-duration workaround
  try {
    await safeSeek(video, 1e10);
  } catch {
    // ignore
  }

  if (Number.isFinite(video.duration) && video.duration > 0) {
    return video.duration;
  }

  // Play briefly and watch timeupdate / durationchange
  try {
    video.currentTime = 0;
    await video.play();
    const duration = await new Promise<number>((resolve) => {
      const timer = window.setTimeout(() => {
        cleanup();
        resolve(
          Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : video.currentTime || 0,
        );
      }, 2500);

      const onTick = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          cleanup();
          resolve(video.duration);
        }
      };
      const cleanup = () => {
        window.clearTimeout(timer);
        video.removeEventListener("durationchange", onTick);
        video.removeEventListener("timeupdate", onTick);
        video.pause();
      };
      video.addEventListener("durationchange", onTick);
      video.addEventListener("timeupdate", onTick);
    });
    video.pause();
    return duration;
  } catch {
    return 0;
  }
}

async function safeSeek(video: HTMLVideoElement, time: number): Promise<void> {
  if (!Number.isFinite(time)) time = 0;

  // Already there
  if (Math.abs(video.currentTime - time) < 0.05 && video.readyState >= 2) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      // Don't hard-fail; caller may fall back
      resolve();
    }, 2500);

    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed seeking video."));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    try {
      video.currentTime = time;
    } catch {
      cleanup();
      resolve();
    }
  });
}

async function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
  index: number,
): Promise<File | null> {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 360;
  if (vw < 2 || vh < 2) return null;

  const scale = Math.min(1, maxWidth / vw);
  canvas.width = Math.max(1, Math.round(vw * scale));
  canvas.height = Math.max(1, Math.round(vh * scale));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.72),
  );
  if (!blob || blob.size < 100) return null;

  return new File([blob], `frame-${index + 1}.jpg`, { type: "image/jpeg" });
}

async function captureWhilePlaying(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
  count: number,
): Promise<File[]> {
  const files: File[] = [];
  video.currentTime = 0;

  try {
    await video.play();
  } catch {
    const frame = await captureFrame(video, canvas, ctx, maxWidth, 0);
    return frame ? [frame] : [];
  }

  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, 4000);

    const onTick = async () => {
      if (files.length >= count) {
        cleanup();
        resolve();
        return;
      }
      const frame = await captureFrame(
        video,
        canvas,
        ctx,
        maxWidth,
        files.length,
      );
      if (frame) files.push(frame);
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("timeupdate", onTick);
      video.pause();
    };

    video.addEventListener("timeupdate", onTick);
  });

  video.pause();
  return files;
}
