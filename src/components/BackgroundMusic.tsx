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

type BackgroundMusicProps = {
  /** false en pestaña Área novios: pausa y oculta el control */
  active: boolean;
};

export function BackgroundMusic({ active }: BackgroundMusicProps) {
  const { src, volume } = weddingConfig.backgroundMusic;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [awaitingGesture, setAwaitingGesture] = useState(false);

  const playLevel = Math.min(0.25, Math.max(0, volume));

  const syncPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.volume = playLevel;
    if (!active || muted) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
      setAwaitingGesture(false);
    } catch {
      setAwaitingGesture(true);
    }
  }, [active, muted, playLevel, src]);

  useEffect(() => {
    setMuted(readMutedPreference());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void syncPlayback();
  }, [hydrated, syncPlayback]);

  useEffect(() => {
    if (!hydrated || !active || muted || !src) return;

    const unlock = () => {
      void syncPlayback();
    };

    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [hydrated, active, muted, src, syncPlayback]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (next) {
      audioRef.current?.pause();
    } else {
      void syncPlayback();
    }
  }

  if (!src) return null;

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" aria-hidden />
      {active ? (
        <button
          type="button"
          onClick={toggleMute}
          className="fixed bottom-5 right-5 z-30 flex size-11 items-center justify-center rounded-full border border-[#3D322E]/15 bg-[#FFF6F0]/95 text-[#3D322E] shadow-md backdrop-blur-sm transition-colors hover:border-[#D4845F]/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4845F]"
          aria-pressed={muted}
          aria-label={
            muted
              ? "Activar música de fondo"
              : awaitingGesture
                ? "Reproducir música de fondo"
                : "Silenciar música de fondo"
          }
          title={
            muted
              ? "Activar música"
              : awaitingGesture
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
