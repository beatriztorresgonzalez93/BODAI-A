"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { weddingConfig } from "@/lib/wedding-config";

const MUTE_STORAGE_KEY = "wedding-bg-music-muted";
const UNLOCK_STORAGE_KEY = "wedding-audio-unlocked";

function readMutedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readUnlockedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(UNLOCK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCK_STORAGE_KEY, "1");
  } catch {
    /* ignore */
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
  audio.muted = false;

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
  const [gateOpen, setGateOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  const playLevel = Math.min(0.25, Math.max(0, volume));
  const useNativeLoop = startAt <= 0;

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return false;
    if (!active || muted) {
      audio.pause();
      setPlaying(false);
      return false;
    }
    const ok = await tryPlayBackgroundAudio(audio, startAt, playLevel);
    setPlaying(ok);
    if (ok) {
      setGateOpen(false);
      markUnlocked();
    }
    return ok;
  }, [active, muted, playLevel, src, startAt]);

  const unlockFromGesture = useCallback(() => {
    void startPlayback();
  }, [startPlayback]);

  useEffect(() => {
    setMuted(readMutedPreference());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !active || muted || !src) {
      setGateOpen(false);
      return;
    }

    let cancelled = false;

    async function init() {
      const ok = await startPlayback();
      if (cancelled) return;

      if (ok) return;

      if (!readUnlockedThisSession()) {
        setGateOpen(true);
        return;
      }

      const onGesture = () => {
        void startPlayback();
      };
      document.addEventListener("pointerdown", onGesture, { once: true, capture: true });
      document.addEventListener("keydown", onGesture, { once: true, capture: true });
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [hydrated, active, muted, src, startPlayback]);

  useEffect(() => {
    if (!hydrated || !active || muted || !src) return;

    const audio = audioRef.current;
    if (!audio) return;

    const attempt = () => {
      if (!muted && active) void startPlayback();
    };

    audio.addEventListener("canplaythrough", attempt);
    return () => audio.removeEventListener("canplaythrough", attempt);
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

  useEffect(() => {
    if (!active) {
      audioRef.current?.pause();
      setPlaying(false);
      setGateOpen(false);
    } else if (hydrated && !muted && src) {
      void startPlayback();
    }
  }, [active, hydrated, muted, src, startPlayback]);

  function handleMuteToggle() {
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

    setMuted(true);
    setPlaying(false);
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

      {gateOpen && active && !muted ? (
        <button
          type="button"
          onClick={unlockFromGesture}
          className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-[#2F3530]/50 px-6 backdrop-blur-sm"
          aria-label="Entrar en la web de la boda"
        >
          <span className="font-serif text-3xl tracking-tight text-white drop-shadow-md sm:text-4xl">
            {weddingConfig.coupleLine}
          </span>
          <span className="mt-6 font-sans text-[11px] font-semibold uppercase tracking-[0.35em] text-white/90">
            Entrar
          </span>
        </button>
      ) : null}

      {active && (playing || muted) ? (
        <button
          type="button"
          onClick={handleMuteToggle}
          className="fixed bottom-5 right-5 z-30 flex size-11 items-center justify-center rounded-full border border-[#2F3530]/15 bg-[#F2F5F0]/95 text-[#2F3530] shadow-md backdrop-blur-sm transition-colors hover:border-[#8A9B82]/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A9B82]"
          aria-pressed={muted}
          aria-label={muted ? "Activar música de fondo" : "Silenciar música de fondo"}
          title={muted ? "Activar música" : "Silenciar música"}
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
