"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { weddingConfig } from "@/lib/wedding-config";

const MUTE_STORAGE_KEY = "wedding-bg-music-muted";

function readMutedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function applyMusicStartOffset(audio: HTMLAudioElement, startAt: number) {
  if (startAt <= 0) return;
  if (audio.currentTime < startAt) {
    audio.currentTime = startAt;
  }
}

async function tryPlayBackgroundAudio(
  audio: HTMLAudioElement,
  startAt: number,
  playLevel: number,
): Promise<boolean> {
  applyMusicStartOffset(audio, startAt);
  audio.volume = playLevel;

  if (!audio.paused) return true;

  try {
    await audio.play();
    return true;
  } catch {
    /* Autoplay con sonido bloqueado */
  }

  try {
    audio.muted = true;
    await audio.play();
    audio.muted = false;
    audio.volume = playLevel;
    applyMusicStartOffset(audio, startAt);
    return !audio.paused;
  } catch {
    audio.muted = false;
    audio.pause();
    return false;
  }
}

type BackgroundMusicProps = {
  /** false en pestaña Área novios: pausa y oculta el control */
  active: boolean;
};

export function BackgroundMusic({ active }: BackgroundMusicProps) {
  const { src, volume, startAtSeconds = 0 } = weddingConfig.backgroundMusic;
  const startAt = Math.max(0, startAtSeconds);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  const playLevel = Math.min(0.25, Math.max(0, volume));
  const useNativeLoop = startAt <= 0;

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return false;
    if (!active || muted) {
      audio.pause();
      return false;
    }
    const ok = await tryPlayBackgroundAudio(audio, startAt, playLevel);
    setNeedsTap(!ok);
    return ok;
  }, [active, muted, playLevel, src, startAt]);

  useEffect(() => {
    setMuted(readMutedPreference());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void startPlayback();
  }, [hydrated, startPlayback]);

  useEffect(() => {
    if (!hydrated || !active || muted || !src) return;

    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    const attempt = () => {
      if (cancelled || muted || !active) return;
      void startPlayback();
    };

    attempt();
    const timers = [80, 300, 800].map((ms) => setTimeout(attempt, ms));
    audio.addEventListener("canplay", attempt);
    audio.addEventListener("loadeddata", attempt);

    const onVisible = () => {
      if (document.visibilityState === "visible") attempt();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      audio.removeEventListener("canplay", attempt);
      audio.removeEventListener("loadeddata", attempt);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated, active, muted, src, startPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || startAt <= 0) return;

    const onEnded = () => {
      audio.currentTime = startAt;
      if (!muted && active) void tryPlayBackgroundAudio(audio, startAt, playLevel);
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [startAt, muted, active, playLevel]);

  function handleControlClick() {
    const audio = audioRef.current;
    if (!audio) return;

    if (muted) {
      setMuted(false);
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, "0");
      } catch {
        /* ignore */
      }
      void startPlayback();
      return;
    }

    if (needsTap || audio.paused) {
      void startPlayback();
      return;
    }

    setMuted(true);
    setNeedsTap(false);
    audio.pause();
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!src) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        autoPlay
        loop={useNativeLoop}
        preload="auto"
        playsInline
        aria-hidden
      />
      {active ? (
        <button
          type="button"
          onClick={handleControlClick}
          className="fixed bottom-5 right-5 z-30 flex size-11 items-center justify-center rounded-full border border-[#2F3530]/15 bg-[#F2F5F0]/95 text-[#2F3530] shadow-md backdrop-blur-sm transition-colors hover:border-[#8A9B82]/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A9B82]"
          aria-pressed={muted}
          aria-label={
            muted
              ? "Activar música de fondo"
              : needsTap
                ? "Reproducir música de fondo"
                : "Silenciar música de fondo"
          }
          title={
            muted
              ? "Activar música"
              : needsTap
                ? "Pulsa para escuchar la música"
                : "Silenciar música"
          }
        >
          {muted ? (
            <VolumeX className="size-5" aria-hidden />
          ) : (
            <Volume2 className="size-5" aria-hidden />
          )}
        </button>
      ) : null}
    </>
  );
}
