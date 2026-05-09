"use client";

import Image from "next/image";
import {
  Calendar,
  Camera,
  Clock,
  Download,
  ImageIcon,
  LogOut,
  Map as MapIcon,
  MapPin,
  RefreshCw,
  Shirt,
  Upload,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SectionHeading } from "@/components/SectionHeading";
import { SpotifyIcon } from "@/components/SpotifyIcon";
import { compressImageFile } from "@/lib/compress-image";
import { weddingConfig } from "@/lib/wedding-config";

type TabId =
  | "home"
  | "story"
  | "day"
  | "rsvp"
  | "travel"
  | "music"
  | "photos"
  | "admin";

type FormStatus = {
  kind: "success" | "error";
  message: string;
} | null;

type SongRow = {
  id: string;
  guestName: string;
  songTitle: string;
  artist: string;
  songTitleArtist?: string;
  spotifyUrl?: string | null;
  createdAt: string;
};

type PhotoRow = {
  id: string;
  guestName: string;
  url: string;
};

type CompanionRow = {
  name: string;
  isChild: boolean;
  kidsMenu: boolean;
};

type RsvpRow = {
  id: string;
  name: string;
  guestCount: number;
  companions: CompanionRow[];
  allergies: string;
  needsBus: boolean;
  createdAt: string;
};

type AdminOverview = {
  rsvps: RsvpRow[];
  songs: SongRow[];
  photos: { id: string; guestName: string; createdAt: string }[];
};

const tabs: { id: TabId; label: string }[] = [
  { id: "home", label: "Inicio" },
  { id: "story", label: "Historia" },
  { id: "day", label: "Gran día" },
  { id: "rsvp", label: "RSVP" },
  { id: "travel", label: "Viajeros" },
  { id: "music", label: "Música" },
  { id: "photos", label: "Fotos" },
  { id: "admin", label: "Area novios" },
];

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as { ok: boolean; message: string };
  return { response, data };
}

function useCountdown(targetIso: string) {
  /** Evita error de hidratación: servidor y primer paint del cliente no usan Date.now(). */
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!mounted) {
      return {
        days: "00",
        hours: "00",
        minutes: "00",
        seconds: "00",
      };
    }
    const end = new Date(targetIso).getTime();
    const diff = Math.max(0, end - now);
    const sec = Math.floor(diff / 1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return {
      days: String(days),
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
    };
  }, [targetIso, now, mounted]);
}

export function WeddingSite() {
  const [tab, setTab] = useState<TabId>("home");
  const countdown = useCountdown(weddingConfig.countdownTarget);

  const [rsvpStatus, setRsvpStatus] = useState<FormStatus>(null);
  const [songStatus, setSongStatus] = useState<FormStatus>(null);
  const [photoStatus, setPhotoStatus] = useState<FormStatus>(null);

  const [songs, setSongs] = useState<SongRow[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [photoGuestName, setPhotoGuestName] = useState("");
  const [rsvpGuestCount, setRsvpGuestCount] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adminStatus, setAdminStatus] = useState<FormStatus>(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);

  const loadSongs = useCallback(async () => {
    try {
      const res = await fetch("/api/songs", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { songs?: SongRow[] };
      setSongs(Array.isArray(data.songs) ? data.songs : []);
    } catch {
      /* offline */
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/photos", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { photos: PhotoRow[] };
      setPhotos(data.photos ?? []);
    } catch {
      /* offline */
    }
  }, []);

  const loadAdminOverview = useCallback(async () => {
    const res = await fetch("/api/admin/overview", { credentials: "include" });
    if (!res.ok) {
      setAdminOverview(null);
      return;
    }
    const data = (await res.json()) as
      | ({ ok: true } & AdminOverview)
      | { ok: false; message: string };
    if ("ok" in data && !data.ok) return;
    setAdminOverview({
      rsvps: data.rsvps ?? [],
      songs: data.songs ?? [],
      photos: data.photos ?? [],
    });
  }, []);

  /* Carga inicial de música y galería (respuestas asíncronas desde la API). */
  /* eslint-disable react-hooks/set-state-in-effect -- fetch inicial tras montar */
  useEffect(() => {
    void loadSongs();
    void loadPhotos();
  }, [loadSongs, loadPhotos]);

  useEffect(() => {
    if (tab === "music") {
      void loadSongs();
    }
  }, [tab, loadSongs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    async function checkSession() {
      const res = await fetch("/api/admin/session", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { authenticated: boolean };
      setAdminAuthenticated(Boolean(data.authenticated));
    }
    void checkSession();
  }, []);

  const [nameLeft, nameRight] = weddingConfig.coupleLine
    .split("&")
    .map((s) => s.trim());

  async function onRsvpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const guestCount = Number(fd.get("guestCount") ?? 1);
    const companionSlots = Math.max(0, guestCount - 1);
    const companions = Array.from({ length: companionSlots }, (_, i) => ({
      name: String(fd.get(`companion_${i}_name`) ?? "").trim(),
      isChild: fd.get(`companion_${i}_isChild`) === "on",
      kidsMenu: fd.get(`companion_${i}_kidsMenu`) === "on",
    }));
    const payload = {
      name: String(fd.get("name") ?? ""),
      guestCount,
      companions,
      allergies: String(fd.get("allergies") ?? ""),
      needsBus: String(fd.get("needsBus")) === "yes",
    };
    const { response, data } = await postJson("/api/rsvp", payload);
    setRsvpStatus({
      kind: response.ok ? "success" : "error",
      message: data.message,
    });
    if (response.ok) {
      e.currentTarget.reset();
      setRsvpGuestCount(1);
    }
  }

  async function onSongSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      guestName: String(fd.get("guestName") ?? ""),
      songTitleArtist: String(fd.get("songTitleArtist") ?? ""),
      spotifyUrl: String(fd.get("spotifyUrl") ?? "").trim(),
    };
    const { response, data } = await postJson("/api/songs", payload);
    setSongStatus({
      kind: response.ok ? "success" : "error",
      message: data.message,
    });
    if (response.ok) {
      e.currentTarget.reset();
      void loadSongs();
    }
  }

  async function uploadPhotoFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) =>
      /^image\/(jpeg|jpg|png|webp)$/i.test(f.type),
    );
    if (!list.length) {
      setPhotoStatus({
        kind: "error",
        message: "Selecciona imágenes JPG o PNG.",
      });
      return;
    }
    const guestName = photoGuestName.trim() || "Invitado";
    setPhotoStatus(null);
    for (const file of list) {
      if (file.size > 12 * 1024 * 1024) {
        setPhotoStatus({
          kind: "error",
          message: "Alguna foto supera 10 MB. Reduce tamaño e inténtalo de nuevo.",
        });
        continue;
      }
      try {
        const photoDataUrl = await compressImageFile(file);
        const { response, data } = await postJson("/api/photos", {
          guestName,
          photoDataUrl,
        });
        if (!response.ok) {
          setPhotoStatus({ kind: "error", message: data.message });
          return;
        }
      } catch {
        setPhotoStatus({
          kind: "error",
          message: "No se pudo procesar una de las fotos.",
        });
        return;
      }
    }
    setPhotoStatus({ kind: "success", message: "Fotos subidas correctamente." });
    void loadPhotos();
  }

  function onPhotoDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    void uploadPhotoFiles(e.dataTransfer.files);
  }

  async function onAdminLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      username: String(fd.get("username") ?? ""),
      password: String(fd.get("password") ?? ""),
    };
    const { response, data } = await postJson("/api/admin/login", payload);
    setAdminStatus({
      kind: response.ok ? "success" : "error",
      message: data.message,
    });
    if (response.ok) {
      setAdminAuthenticated(true);
      void loadAdminOverview();
      e.currentTarget.reset();
    }
  }

  async function onAdminLogout() {
    await postJson("/api/admin/logout", {});
    setAdminAuthenticated(false);
    setAdminOverview(null);
    setAdminStatus({ kind: "success", message: "Sesion cerrada." });
  }

  async function downloadAdminPhoto(photoId: string) {
    const res = await fetch(`/api/admin/photos/${photoId}/download`, {
      credentials: "include",
    });
    if (!res.ok) {
      setAdminStatus({ kind: "error", message: "No se pudo descargar la foto." });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foto-${photoId}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadAllAdminPhotosZip() {
    const res = await fetch("/api/admin/photos/download-zip", {
      credentials: "include",
    });
    if (!res.ok) {
      setAdminStatus({ kind: "error", message: "No se pudo generar el ZIP." });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fotos-boda.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F2E8DF] pb-16 font-sans text-[#332C28]">
      <nav className="sticky top-0 z-20 border-b border-[#332C28]/10 bg-[#F2E8DF]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center sm:px-4 [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                if (t.id === "admin" && adminAuthenticated) {
                  void loadAdminOverview();
                }
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors sm:text-xs ${
                tab === t.id
                  ? "bg-[#332C28] text-[#FDFBF9]"
                  : "text-[#332C28]/70 hover:bg-[#332C28]/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div
        className={`mx-auto px-5 pt-10 sm:px-8 ${tab === "admin" ? "max-w-5xl" : "max-w-2xl"}`}
      >
        {tab === "home" ? (
          <section className="flex flex-col items-center pb-12 text-center">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.35em] text-[#C19A6B]">
              {weddingConfig.headline}
            </p>
            <h1 className="mt-5 flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 font-serif text-4xl font-normal tracking-tight text-[#332C28] sm:text-5xl">
              <span>{nameLeft}</span>
              <span className="font-serif text-3xl text-[#C19A6B] sm:text-4xl">
                &
              </span>
              <span>{nameRight}</span>
            </h1>
            <div className="mx-auto mt-6 h-px w-14 bg-[#C19A6B]" aria-hidden />
            <p className="mt-6 font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-[#332C28]/85">
              {weddingConfig.dateLine}
            </p>

            <div className="mt-12 grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {(
                [
                  ["DÍAS", countdown.days],
                  ["HORAS", countdown.hours],
                  ["MINUTOS", countdown.minutes],
                  ["SEGUNDOS", countdown.seconds],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg bg-[#FDFBF9] px-3 py-5 shadow-sm shadow-[#332C28]/5"
                >
                  <p className="font-serif text-3xl font-normal tabular-nums text-[#332C28] sm:text-4xl">
                    {value}
                  </p>
                  <p className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C19A6B]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "story" ? (
          <section className="pb-16">
            <SectionHeading title="Nuestra historia" />
            <div className="mx-auto max-w-lg space-y-5 text-center font-sans text-sm leading-relaxed text-[#332C28]/80">
              {weddingConfig.historia.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "day" ? (
          <section className="pb-16">
            <SectionHeading title="El gran día" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    icon: <Calendar className="size-6 text-[#C19A6B]" strokeWidth={1.25} />,
                    label: "FECHA",
                    value: weddingConfig.granDia.fecha,
                  },
                  {
                    icon: <Clock className="size-6 text-[#C19A6B]" strokeWidth={1.25} />,
                    label: "CEREMONIA",
                    value: weddingConfig.granDia.ceremonia,
                  },
                  {
                    icon: <MapPin className="size-6 text-[#C19A6B]" strokeWidth={1.25} />,
                    label: "LUGAR",
                    value: weddingConfig.granDia.lugarLines,
                  },
                  {
                    icon: <Shirt className="size-6 text-[#C19A6B]" strokeWidth={1.25} />,
                    label: "DRESS CODE",
                    value: weddingConfig.granDia.dressCode,
                  },
                ] as const
              ).map((card) => (
                <div
                  key={card.label}
                  className="flex gap-4 rounded-xl bg-white p-5 shadow-sm shadow-[#332C28]/5"
                >
                  <div className="shrink-0 pt-0.5">{card.icon}</div>
                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                      {card.label}
                    </p>
                    <div className="mt-2 font-serif text-lg text-[#332C28]">
                      {Array.isArray(card.value) ? (
                        card.value.map((line, i) => (
                          <p key={`${i}-${line}`} className={i > 0 ? "mt-1" : undefined}>
                            {line}
                          </p>
                        ))
                      ) : (
                        <p>{card.value}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(weddingConfig.granDia.lugarMapsQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex flex-col items-center justify-center rounded-xl bg-[#ebe3d7] px-6 py-14 text-center transition-colors hover:bg-[#e4dacb]"
            >
              <MapIcon className="mb-3 size-8 text-[#C19A6B]" strokeWidth={1.25} />
              <span className="font-sans text-sm leading-snug text-[#332C28]/85">
                <span className="block font-semibold tracking-wide text-[#332C28]">
                  Abrir en Google Maps
                </span>
                {weddingConfig.granDia.lugarLines.map((line, i) => (
                  <span key={`${i}-${line}`} className="mt-2 block text-[#332C28]/75">
                    {line}
                  </span>
                ))}
              </span>
            </a>

            <div className="mt-12">
              <p className="text-center font-sans text-[11px] font-semibold uppercase tracking-[0.35em] text-[#332C28]/45">
                Horario del día
              </p>
              <ul className="mt-6 divide-y divide-[#332C28]/10 rounded-xl bg-white shadow-sm shadow-[#332C28]/5">
                {weddingConfig.granDia.schedule.map((row) => (
                  <li
                    key={row.time + row.label}
                    className="flex gap-4 px-5 py-4 text-sm sm:gap-8"
                  >
                    <span className="w-14 shrink-0 font-sans text-[#C19A6B] tabular-nums">
                      {row.time}
                    </span>
                    <span className="font-medium text-[#332C28]">{row.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {tab === "rsvp" ? (
          <section className="pb-16">
            <SectionHeading title="Confirma tu asistencia" />
            <p className="-mt-4 mb-8 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C19A6B]">
              {weddingConfig.rsvpDeadlineLine}
            </p>
            <form
              className="mx-auto max-w-md space-y-6"
              onSubmit={onRsvpSubmit}
            >
              <div>
                <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                  Tu nombre completo
                </label>
                <input
                  name="name"
                  required
                  placeholder="Elena García López"
                  className="mt-2 w-full rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 font-sans text-sm text-[#332C28] outline-none ring-[#C19A6B]/40 placeholder:text-[#332C28]/35 focus:ring-2"
                />
              </div>
              <div>
                <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                  Número de asistentes
                </label>
                <div className="relative mt-2">
                  <select
                    name="guestCount"
                    value={String(rsvpGuestCount)}
                    onChange={(ev) =>
                      setRsvpGuestCount(Number(ev.target.value) || 1)
                    }
                    className="w-full appearance-none rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 font-sans text-sm text-[#332C28] outline-none ring-[#C19A6B]/40 focus:ring-2"
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        {n} {n === 1 ? "persona" : "personas"}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#332C28]/40">
                    ▾
                  </span>
                </div>
              </div>
              {rsvpGuestCount > 1 ? (
                <div className="space-y-4 rounded-xl border border-[#332C28]/10 bg-[#fdfbf9]/80 p-4">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                    Nombres de los acompañantes
                  </p>
                  <p className="font-sans text-xs text-[#332C28]/60">
                    El primer asistente es quien rellena el formulario arriba. Indica el nombre completo de cada persona más.
                  </p>
                  {Array.from({ length: rsvpGuestCount - 1 }, (_, i) => (
                    <div key={i} className="space-y-3 rounded-lg border border-[#332C28]/8 bg-white/60 p-3">
                      <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                        Acompañante {i + 2}
                      </label>
                      <input
                        name={`companion_${i}_name`}
                        required
                        placeholder="Nombre y apellidos"
                        className="w-full rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 font-sans text-sm text-[#332C28] outline-none ring-[#C19A6B]/40 placeholder:text-[#332C28]/35 focus:ring-2"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                        <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-[#332C28]">
                          <input
                            type="checkbox"
                            name={`companion_${i}_isChild`}
                            className="size-4 shrink-0 accent-[#C19A6B]"
                          />
                          Es niño/a
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-[#332C28]">
                          <input
                            type="checkbox"
                            name={`companion_${i}_kidsMenu`}
                            className="size-4 shrink-0 accent-[#C19A6B]"
                          />
                          Menú infantil
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div>
                <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                  Alergias o intolerancias alimentarias
                </label>
                <textarea
                  name="allergies"
                  rows={4}
                  placeholder="Sin gluten, vegetariano, alergia al marisco..."
                  className="mt-2 w-full resize-y rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 font-sans text-sm text-[#332C28] outline-none ring-[#C19A6B]/40 placeholder:text-[#332C28]/35 focus:ring-2"
                />
              </div>
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                  ¿Usarás el autobús de cortesía?
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#C19A6B] bg-[#fdf8f3] px-4 py-3 has-[:checked]:ring-2 has-[:checked]:ring-[#C19A6B]/50">
                    <input
                      type="radio"
                      name="needsBus"
                      value="yes"
                      defaultChecked
                      className="size-4 accent-[#C19A6B]"
                    />
                    <span className="text-sm">Sí, gracias</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 has-[:checked]:ring-2 has-[:checked]:ring-[#C19A6B]/50">
                    <input
                      type="radio"
                      name="needsBus"
                      value="no"
                      className="size-4 accent-[#C19A6B]"
                    />
                    <span className="text-sm">No, tengo transporte</span>
                  </label>
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg border border-[#332C28]/25 bg-white py-4 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-[#332C28] transition-colors hover:bg-[#FDFBF9]"
              >
                Confirmar asistencia
              </button>
              {rsvpStatus ? (
                <p
                  className={`text-center text-sm ${
                    rsvpStatus.kind === "success"
                      ? "text-green-800"
                      : "text-red-700"
                  }`}
                >
                  {rsvpStatus.message}
                </p>
              ) : null}
            </form>
          </section>
        ) : null}

        {tab === "travel" ? (
          <section className="pb-16">
            <SectionHeading
              title="Para los viajeros"
              subtitle={weddingConfig.viajeros.subtitle}
            />

            <article className="overflow-hidden rounded-2xl bg-white shadow-md shadow-[#332C28]/10">
              <div className="relative aspect-[21/9] bg-[#e8dfd4]">
                {weddingConfig.viajeros.hotel.imageSrc ? (
                  <Image
                    src={weddingConfig.viajeros.hotel.imageSrc}
                    alt={`${weddingConfig.viajeros.hotel.name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 1024px"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <div className="text-center">
                      <Camera className="mx-auto size-8 text-[#FDFBF9]" strokeWidth={1.25} />
                      <p className="mt-2 font-serif text-lg italic text-[#FDFBF9]/95">
                        foto del hotel
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4 px-6 py-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-serif text-2xl text-[#332C28]">
                    {weddingConfig.viajeros.hotel.name}
                  </h3>
                  <a
                    href={weddingConfig.viajeros.hotel.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-[#C19A6B] underline-offset-4 hover:underline"
                  >
                    Web del hotel
                  </a>
                </div>
                <dl className="space-y-2 font-sans text-sm text-[#332C28]/85">
                  <div>
                    <dt className="font-semibold text-[#332C28]">Dirección</dt>
                    <dd>{weddingConfig.viajeros.hotel.address}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#332C28]">Teléfono</dt>
                    <dd>{weddingConfig.viajeros.hotel.phone}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#332C28]">Tarifa especial</dt>
                    <dd>{weddingConfig.viajeros.hotel.rateNote}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#332C28]">Distancia</dt>
                    <dd>{weddingConfig.viajeros.hotel.distance}</dd>
                  </div>
                </dl>
              </div>
            </article>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(weddingConfig.viajeros.hotel.mapsQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex flex-col items-center justify-center rounded-xl bg-[#ebe3d7] px-6 py-12 text-center transition-colors hover:bg-[#e4dacb]"
            >
              <MapPin className="mb-2 size-8 text-[#C19A6B]" strokeWidth={1.25} />
              <span className="font-sans text-sm text-[#332C28]/75">
                Google Maps · {weddingConfig.viajeros.hotel.name}
              </span>
            </a>
          </section>
        ) : null}

        {tab === "music" ? (
          <section className="pb-16">
            <SectionHeading title="Pon música" />
            <p className="-mt-4 mx-auto max-w-md text-center font-serif text-base italic leading-relaxed text-[#332C28]/75">
              Ayúdanos a crear la playlist perfecta. Cada uno puede sugerir una
              sola canción.
            </p>

            <form
              className="mx-auto mt-10 max-w-md space-y-6"
              onSubmit={onSongSubmit}
            >
              <div>
                <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                  Tu nombre
                </label>
                <input
                  name="guestName"
                  required
                  placeholder="Tu nombre"
                  className="mt-2 w-full rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 font-sans text-sm outline-none ring-[#C19A6B]/40 placeholder:text-[#332C28]/35 focus:ring-2"
                />
              </div>
              <div>
                <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                  Nombre de la canción y artista
                </label>
                <input
                  name="songTitleArtist"
                  required
                  placeholder="Ej: La Bamba — Ritchie Valens"
                  className="mt-2 w-full rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 font-sans text-sm outline-none ring-[#C19A6B]/40 placeholder:text-[#332C28]/35 focus:ring-2"
                />
              </div>
              <div>
                <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                  Enlace de Spotify (opcional)
                </label>
                <input
                  name="spotifyUrl"
                  type="url"
                  placeholder="https://open.spotify.com/..."
                  className="mt-2 w-full rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 font-sans text-sm outline-none ring-[#C19A6B]/40 placeholder:text-[#332C28]/35 focus:ring-2"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg border border-[#332C28]/25 bg-[#FDFBF9] py-4 font-sans text-xs font-semibold uppercase tracking-[0.25em] text-[#332C28] transition-colors hover:bg-white"
              >
                Añadir canción
              </button>
              {songStatus ? (
                <p
                  className={`text-center text-sm ${
                    songStatus.kind === "success"
                      ? "text-green-800"
                      : "text-red-700"
                  }`}
                >
                  {songStatus.message}
                </p>
              ) : null}
            </form>

            <div className="mx-auto mt-14 max-w-md">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.35em] text-[#C19A6B]">
                Lista de deseos
              </p>
              <ul className="mt-4 divide-y divide-[#332C28]/10">
                {songs.length === 0 ? (
                  <li className="py-6 text-center font-sans text-sm text-[#332C28]/45">
                    Aún no hay canciones. ¡Sé el primero en sugerir una!
                  </li>
                ) : (
                  songs.map((s, idx) => {
                    const titleLine =
                      s.songTitle.trim() ||
                      (s.songTitleArtist?.trim() ?? "") ||
                      "—";
                    return (
                    <li key={s.id} className="flex gap-3 py-5">
                      <span className="shrink-0 pt-0.5 font-serif text-lg text-[#C19A6B] tabular-nums">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-lg font-medium leading-snug text-[#332C28]">
                          {titleLine}
                        </p>
                        {s.artist.trim() ? (
                          <p className="mt-1 font-sans text-sm text-[#332C28]/65">
                            {s.artist}
                          </p>
                        ) : null}
                      </div>
                      {s.spotifyUrl ? (
                        <a
                          href={s.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 self-start pt-1"
                          aria-label="Abrir en Spotify"
                        >
                          <SpotifyIcon />
                        </a>
                      ) : (
                        <span className="w-5 shrink-0" aria-hidden />
                      )}
                    </li>
                    );
                  })
                )}
              </ul>
            </div>
          </section>
        ) : null}

        {tab === "photos" ? (
          <section className="pb-16">
            <SectionHeading title="Sube tus fotos" />
            <p className="-mt-4 mb-8 text-center font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-[#332C28]/55">
              COMPARTE TUS MOMENTOS FAVORITOS DEL DÍA
            </p>

            <div className="mx-auto max-w-xl space-y-4">
              <div>
                <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                  Tu nombre (para los álbumes)
                </label>
                <input
                  value={photoGuestName}
                  onChange={(e) => setPhotoGuestName(e.target.value)}
                  placeholder="María"
                  className="mt-2 w-full rounded-lg border border-[#332C28]/15 bg-white px-4 py-3 font-sans text-sm outline-none ring-[#C19A6B]/40 placeholder:text-[#332C28]/35 focus:ring-2"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  const fl = e.target.files;
                  if (fl?.length) void uploadPhotoFiles(fl);
                  e.target.value = "";
                }}
              />

              <button
                type="button"
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onPhotoDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 transition-colors ${
                  dragActive
                    ? "border-[#C19A6B] bg-[#fdf8f3]"
                    : "border-[#C19A6B]/55 bg-transparent"
                }`}
              >
                <div className="relative">
                  <Camera className="size-10 text-[#C19A6B]" strokeWidth={1.25} />
                  <Upload className="absolute -right-1 -top-1 size-4 text-[#C19A6B]" />
                </div>
                <p className="mt-4 font-sans text-sm font-semibold text-[#332C28]">
                  Haz clic para subir fotos
                </p>
                <p className="mt-1 font-sans text-sm text-[#332C28]/60">
                  o arrastra y suelta aquí
                </p>
                <p className="mt-3 font-sans text-xs text-[#332C28]/45">
                  JPG, PNG · Máximo 10 MB por foto
                </p>
              </button>

              {photoStatus ? (
                <p
                  className={`text-center text-sm ${
                    photoStatus.kind === "success"
                      ? "text-green-800"
                      : "text-red-700"
                  }`}
                >
                  {photoStatus.message}
                </p>
              ) : null}
            </div>

            <div className="mx-auto mt-14 max-w-xl">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.35em] text-[#332C28]/45">
                Galería del día
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((ph) => (
                  <div
                    key={ph.id}
                    className="relative aspect-square overflow-hidden rounded-xl bg-[#ebe3d7]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URLs y URLs externas dinámicas */}
                    <img
                      src={ph.url}
                      alt={`Foto de ${ph.guestName}`}
                      className="size-full object-cover"
                    />
                  </div>
                ))}
                {photos.length < 5
                  ? Array.from({ length: 5 - photos.length }).map((_, i) => (
                      <div
                        key={`placeholder-${i}`}
                        className="flex aspect-square flex-col items-center justify-center rounded-xl bg-[#ebe3d7]"
                      >
                        <ImageIcon className="size-8 text-[#332C28]/25" strokeWidth={1} />
                        <span className="mt-2 font-sans text-[10px] uppercase tracking-wider text-[#332C28]/30">
                          IMG
                        </span>
                      </div>
                    ))
                  : null}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-[#C19A6B]/5 bg-[#ebe3d7]/60 transition-colors hover:bg-[#ebe3d7]"
                >
                  <span className="font-serif text-3xl text-[#C19A6B]">+</span>
                  <span className="font-serif text-sm text-[#332C28]/55">más</span>
                </button>
              </div>
              <p className="mt-8 text-center font-sans text-xs text-[#332C28]/45">
                Las fotos se muestran aquí según se vayan subiendo
              </p>
            </div>
          </section>
        ) : null}

        {tab === "admin" ? (
          <section className="pb-16">
            <SectionHeading title="Area novios" subtitle="SOLO ACCESO PRIVADO" />

            {!adminAuthenticated ? (
              <form
                className="mx-auto max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-sm shadow-[#332C28]/10"
                onSubmit={onAdminLogin}
              >
                <div>
                  <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                    Usuario
                  </label>
                  <input
                    name="username"
                    required
                    className="mt-2 w-full rounded-lg border border-[#332C28]/15 px-4 py-3 outline-none ring-[#C19A6B]/40 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C19A6B]">
                    Contraseña
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="mt-2 w-full rounded-lg border border-[#332C28]/15 px-4 py-3 outline-none ring-[#C19A6B]/40 focus:ring-2"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-[#332C28]/25 bg-[#FDFBF9] py-3 font-sans text-xs font-semibold uppercase tracking-[0.2em]"
                >
                  Entrar
                </button>
                {adminStatus ? (
                  <p
                    className={`text-center text-sm ${
                      adminStatus.kind === "success" ? "text-green-800" : "text-red-700"
                    }`}
                  >
                    {adminStatus.message}
                  </p>
                ) : null}
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#332C28]/10 pb-4">
                  <button
                    type="button"
                    onClick={() => void loadAdminOverview()}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#C19A6B]/50 bg-[#fdf8f3] px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.15em] text-[#332C28] transition-colors hover:bg-[#f5ebe0]"
                  >
                    <RefreshCw className="size-4 shrink-0 text-[#C19A6B]" strokeWidth={2} aria-hidden />
                    Actualizar panel
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void downloadAllAdminPhotosZip()}
                      title="Descargar todas las fotos en ZIP"
                      aria-label="Descargar todas las fotos en ZIP"
                      className="inline-flex size-11 items-center justify-center rounded-lg border border-[#332C28]/25 bg-white text-[#332C28] transition-colors hover:bg-[#FDFBF9]"
                    >
                      <Download className="size-5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={onAdminLogout}
                      title="Cerrar sesión"
                      aria-label="Cerrar sesión"
                      className="inline-flex size-11 items-center justify-center rounded-lg border border-[#332C28]/25 bg-white text-[#332C28] transition-colors hover:bg-[#FDFBF9]"
                    >
                      <LogOut className="size-5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                <article className="w-full rounded-2xl bg-white p-5 shadow-sm shadow-[#332C28]/10 sm:p-7">
                  <h3 className="font-serif text-2xl">Confirmaciones</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                      <thead className="text-[#C19A6B]">
                        <tr>
                          <th className="border-b border-[#332C28]/10 py-3 pr-6 align-bottom font-semibold">
                            Titular
                          </th>
                          <th className="border-b border-[#332C28]/10 py-3 px-10 align-bottom font-semibold whitespace-nowrap">
                            Asistentes
                          </th>
                          <th className="border-b border-[#332C28]/10 py-3 pl-4 pr-6 align-bottom font-semibold">
                            Acompañantes
                          </th>
                          <th className="border-b border-[#332C28]/10 py-3 px-6 align-bottom font-semibold whitespace-nowrap">
                            Bus
                          </th>
                          <th className="border-b border-[#332C28]/10 py-3 pl-4 align-bottom font-semibold">
                            Alergias
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(adminOverview?.rsvps ?? []).map((row) => (
                          <tr key={row.id} className="align-top">
                            <td className="border-b border-[#332C28]/8 py-4 pr-6 align-top text-[#332C28]">
                              {row.name}
                            </td>
                            <td className="border-b border-[#332C28]/8 py-4 px-10 align-top whitespace-nowrap tabular-nums text-center text-[#332C28]">
                              {row.guestCount}
                            </td>
                            <td className="min-w-[240px] border-b border-[#332C28]/8 py-4 pl-4 pr-6 align-top text-[#332C28]/90">
                              {(row.companions?.length ?? 0) > 0 ? (
                                <ul className="m-0 list-none space-y-3 p-0">
                                  {row.companions.map((c, i) => (
                                    <li key={i} className="leading-snug">
                                      <p className="font-medium">{c.name}</p>
                                      {(c.isChild || c.kidsMenu) ? (
                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                          {c.isChild ? (
                                            <span className="inline-block rounded bg-[#ebe3d7] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-[#332C28]/75">
                                              Niño/a
                                            </span>
                                          ) : null}
                                          {c.kidsMenu ? (
                                            <span className="inline-block rounded bg-[#f5ebe0] px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-[#332C28]/75">
                                              Menú infantil
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-[#332C28]/45">-</span>
                              )}
                            </td>
                            <td className="border-b border-[#332C28]/8 py-4 px-6 align-top whitespace-nowrap">
                              {row.needsBus ? "Si" : "No"}
                            </td>
                            <td className="border-b border-[#332C28]/8 py-4 pl-4 align-top">
                              {row.allergies || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(adminOverview?.rsvps?.length ?? 0) === 0 ? (
                      <p className="py-4 text-sm text-[#332C28]/55">Sin confirmaciones por ahora.</p>
                    ) : null}
                  </div>
                </article>

                <article className="rounded-2xl bg-white p-5 shadow-sm shadow-[#332C28]/10">
                  <h3 className="font-serif text-2xl">Canciones propuestas</h3>
                  <ul className="mt-4 divide-y divide-[#332C28]/10">
                    {(adminOverview?.songs ?? []).map((row) => (
                      <li key={row.id} className="py-3">
                        <p className="font-medium">{row.songTitle}</p>
                        <p className="text-sm text-[#332C28]/65">
                          {row.artist ? `${row.artist} · ` : ""}sugerida por {row.guestName}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {(adminOverview?.songs?.length ?? 0) === 0 ? (
                    <p className="py-4 text-sm text-[#332C28]/55">Sin canciones todavía.</p>
                  ) : null}
                </article>

                <article className="rounded-2xl bg-white p-5 shadow-sm shadow-[#332C28]/10">
                  <h3 className="font-serif text-2xl">Fotos subidas</h3>
                  <ul className="mt-4 divide-y divide-[#332C28]/10">
                    {(adminOverview?.photos ?? []).map((row) => (
                      <li key={row.id} className="flex items-center justify-between gap-4 py-3">
                        <div>
                          <p className="font-medium">{row.guestName}</p>
                          <p className="text-xs text-[#332C28]/55">
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void downloadAdminPhoto(row.id)}
                          className="rounded-lg border border-[#332C28]/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em]"
                        >
                          Descargar
                        </button>
                      </li>
                    ))}
                  </ul>
                  {(adminOverview?.photos?.length ?? 0) === 0 ? (
                    <p className="py-4 text-sm text-[#332C28]/55">Sin fotos todavía.</p>
                  ) : null}
                </article>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
