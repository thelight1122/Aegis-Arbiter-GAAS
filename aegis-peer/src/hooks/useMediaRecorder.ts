import { useRef, useState } from "react";
import { apiUrl } from "../lib/apiBase";

const MAX_RECORDING_MS = 3 * 60 * 1000;

interface UseMediaRecorderOptions {
  sessionId: string;
  onStreamReady: (stream: MediaStream) => void;
  onRecordingStopped: () => void;
  onSuccess: (data: unknown) => void;
  /** Called on API error or network failure. rawData is the parsed error body (undefined on network failure). */
  onError: (msg: string, rawData?: unknown) => void;
  onLoadingChange: (loading: boolean) => void;
  onStatusChange: (status: string | null) => void;
}

export function useMediaRecorder({
  sessionId,
  onStreamReady,
  onRecordingStopped,
  onSuccess,
  onError,
  onLoadingChange,
  onStatusChange,
}: UseMediaRecorderOptions) {
  const [mode, setMode] = useState<"audio" | "video" | null>(null);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = (): void => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const start = async (newMode: "audio" | "video"): Promise<void> => {
    if (mode) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      onError("Recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: newMode === "video",
      });

      const preferredMime = newMode === "video" ? "video/webm" : "audio/webm";
      const options = MediaRecorder.isTypeSupported(preferredMime)
        ? { mimeType: preferredMime }
        : undefined;

      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        onRecordingStopped();
        if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
        if (timerRef.current !== null) clearInterval(timerRef.current);

        const chunks = chunksRef.current;
        chunksRef.current = [];
        setMode(null);
        setSeconds(0);

        if (chunks.length === 0) {
          onError("No recording data captured.");
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType });
        onLoadingChange(true);
        onStatusChange("Transcribing and analyzing...");

        try {
          const res = await fetch(
            apiUrl(`/mirror/reflect-media?sessionId=${sessionId}`),
            {
              method: "POST",
              headers: { "Content-Type": blob.type || "application/octet-stream" },
              body: blob,
            }
          );
          const data = await res.json();

          if (!res.ok || data?.ok === false) {
            onError(data?.error ?? "Mirror reflection failed.", data);
          } else {
            onSuccess(data);
          }
        } catch {
          onError("Unable to reach the mirror service.");
        } finally {
          onLoadingChange(false);
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setMode(newMode);
      setSeconds(0);
      onStreamReady(stream);

      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      timeoutRef.current = window.setTimeout(stop, MAX_RECORDING_MS);
    } catch {
      onError("Microphone or camera access was denied.");
    }
  };

  const toggle = (newMode: "audio" | "video"): void => {
    if (mode === newMode) stop();
    else start(newMode);
  };

  return { mode, seconds, start, stop, toggle };
}
