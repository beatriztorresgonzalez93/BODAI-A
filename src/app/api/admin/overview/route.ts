import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  try {
    const db = await getDb();
    const [rsvpDocs, songDocs, photoDocs] = await Promise.all([
      db.collection("rsvps").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
      db.collection("songs").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
      db.collection("photos").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
    ]);

    const rsvps = rsvpDocs.map((doc) => {
      const legacyNames = Array.isArray(doc.companionNames)
        ? doc.companionNames.map((n: unknown) => String(n ?? "").trim())
        : [];
      const companionsRaw = Array.isArray(doc.companions)
        ? doc.companions
        : [];
      const companions =
        companionsRaw.length > 0
          ? companionsRaw.map((c: unknown) => {
              const o = c as Record<string, unknown>;
              return {
                name: String(o?.name ?? "").trim(),
                isChild: Boolean(o?.isChild),
                kidsMenu: Boolean(o?.kidsMenu),
                allergies: String(o?.allergies ?? "").trim(),
              };
            })
          : legacyNames.map((n) => ({
              name: n,
              isChild: false,
              kidsMenu: false,
              allergies: "",
            }));

      return {
        id: doc._id.toString(),
        name: String(doc.name ?? ""),
        guestCount: Number(doc.guestCount ?? 1),
        companions,
        allergies: String(doc.allergies ?? ""),
        needsBus: Boolean(doc.needsBus),
        createdAt:
          doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
      };
    });

    const songs = songDocs.map((doc) => ({
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

    const photos = photoDocs.map((doc) => ({
      id: doc._id.toString(),
      guestName: String(doc.guestName ?? ""),
      createdAt:
        doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
    }));

    return NextResponse.json({ ok: true, rsvps, songs, photos });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar los datos." },
      { status: 500 },
    );
  }
}
