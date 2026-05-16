import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { parseSongLine } from "@/lib/parse-song-line";

export const runtime = "nodejs";

type SongPayload = {
  guestName?: string;
  songTitleArtist?: string;
  spotifyUrl?: string;
};

/** Legacy payload */
type LegacySongPayload = {
  guestName?: string;
  songTitle?: string;
  artist?: string;
};

const spotifyHost = /open\.spotify\.com|spotify\.com/i;

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection("songs")
      .find({})
      .sort({ createdAt: 1 })
      .limit(200)
      .project({
        guestName: 1,
        songTitle: 1,
        artist: 1,
        songTitleArtist: 1,
        spotifyUrl: 1,
        createdAt: 1,
      })
      .toArray();

    const songs = docs.map((doc) => ({
      id: doc._id.toString(),
      guestName: String(doc.guestName ?? ""),
      songTitle: String(doc.songTitle ?? ""),
      artist: String(doc.artist ?? ""),
      songTitleArtist:
        doc.songTitleArtist != null ? String(doc.songTitleArtist) : undefined,
      spotifyUrl:
        doc.spotifyUrl != null && String(doc.spotifyUrl).trim() !== ""
          ? String(doc.spotifyUrl).trim()
          : null,
      createdAt:
        doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
    }));

    return NextResponse.json({ songs });
  } catch (error) {
    console.error("GET /api/songs error:", error);
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar las canciones." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as SongPayload & LegacySongPayload;
    const guestName = raw.guestName?.trim();
    let songTitleArtist = raw.songTitleArtist?.trim();
    let songTitle = "";
    let artist = "";

    if (songTitleArtist) {
      const parsed = parseSongLine(songTitleArtist);
      songTitle = parsed.title;
      artist = parsed.artist;
    } else if (raw.songTitle?.trim()) {
      songTitle = raw.songTitle.trim();
      artist = raw.artist?.trim() ?? "";
      songTitleArtist =
        artist !== "" ? `${songTitle} — ${artist}` : songTitle;
    }

    let spotifyUrl = raw.spotifyUrl?.trim() ?? "";
    if (spotifyUrl) {
      try {
        const host = new URL(spotifyUrl).hostname;
        if (!spotifyHost.test(host)) {
          return NextResponse.json(
            { ok: false, message: "El enlace debe ser de Spotify." },
            { status: 400 },
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, message: "El enlace de Spotify no es válido." },
          { status: 400 },
        );
      }
    }
    if (!spotifyUrl) spotifyUrl = "";

    if (!guestName || !songTitleArtist || !songTitle) {
      return NextResponse.json(
        { ok: false, message: "Nombre y canción son obligatorios." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const songsCollection = db.collection("songs");
    await songsCollection.createIndex({ guestName: 1 }, { unique: true });

    await songsCollection.insertOne({
      guestName,
      songTitleArtist,
      songTitle,
      artist,
      spotifyUrl: spotifyUrl || null,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, message: "Canción guardada." });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { ok: false, message: "Solo se permite una canción por persona." },
        { status: 409 },
      );
    }

    console.error("POST /api/songs error:", error);
    return NextResponse.json(
      { ok: false, message: "No se pudo guardar la canción." },
      { status: 500 },
    );
  }
}
