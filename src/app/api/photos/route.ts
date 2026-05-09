import { NextResponse } from "next/server";
import {
  isCloudinaryConfigured,
  uploadGuestPhotoFromDataUrl,
} from "@/lib/cloudinary-upload";
import { getDb } from "@/lib/mongodb";

/** Cloudinary SDK requiere Node (no Edge). */
export const runtime = "nodejs";

type PhotoPayload = {
  guestName?: string;
  photoUrl?: string;
  photoDataUrl?: string;
};

const urlRegex = /^https?:\/\/\S+$/i;
const dataUrlRegex =
  /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

/** ~3 MB decodificado */
const maxDataUrlLength = 4_500_000;

export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection("photos")
      .find({})
      .sort({ createdAt: -1 })
      .limit(60)
      .project({
        guestName: 1,
        photoUrl: 1,
        photoDataUrl: 1,
        createdAt: 1,
      })
      .toArray();

    const photos = docs.map((doc) => {
      const httpUrl =
        typeof doc.photoUrl === "string" && /^https?:\/\//i.test(doc.photoUrl.trim())
          ? doc.photoUrl.trim()
          : "";
      const dataUrl =
        typeof doc.photoDataUrl === "string" && doc.photoDataUrl.length > 0
          ? doc.photoDataUrl
          : "";
      return {
        id: doc._id.toString(),
        guestName: String(doc.guestName ?? ""),
        url: httpUrl || dataUrl,
      };
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("GET /api/photos error:", error);
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar las fotos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PhotoPayload;
    const guestName = body.guestName?.trim();
    const photoUrl = body.photoUrl?.trim();
    const photoDataUrl = body.photoDataUrl?.trim();

    if (!guestName) {
      return NextResponse.json(
        { ok: false, message: "El nombre es obligatorio." },
        { status: 400 },
      );
    }

    if (photoDataUrl) {
      if (photoDataUrl.length > maxDataUrlLength) {
        return NextResponse.json(
          { ok: false, message: "La imagen es demasiado grande tras comprimir." },
          { status: 400 },
        );
      }
      const match = dataUrlRegex.exec(photoDataUrl);
      if (!match) {
        return NextResponse.json(
          { ok: false, message: "Formato de imagen no válido." },
          { status: 400 },
        );
      }

      const db = await getDb();

      if (isCloudinaryConfigured()) {
        try {
          const { secureUrl, publicId } =
            await uploadGuestPhotoFromDataUrl(photoDataUrl);
          await db.collection("photos").insertOne({
            guestName,
            photoUrl: secureUrl,
            photoDataUrl: null,
            cloudinaryPublicId: publicId,
            createdAt: new Date(),
          });
        } catch (err) {
          console.error("Cloudinary upload error:", err);
          return NextResponse.json(
            {
              ok: false,
              message:
                "No se pudo subir la foto al almacenamiento. Inténtalo de nuevo.",
            },
            { status: 500 },
          );
        }
      } else {
        await db.collection("photos").insertOne({
          guestName,
          photoDataUrl,
          photoUrl: null,
          createdAt: new Date(),
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Foto compartida.",
        storage: isCloudinaryConfigured() ? "cloudinary" : "database",
      });
    }

    if (photoUrl) {
      if (!urlRegex.test(photoUrl)) {
        return NextResponse.json(
          { ok: false, message: "Introduce una URL válida (http/https)." },
          { status: 400 },
        );
      }

      const db = await getDb();
      await db.collection("photos").insertOne({
        guestName,
        photoUrl,
        photoDataUrl: null,
        createdAt: new Date(),
      });

      return NextResponse.json({
        ok: true,
        message: "Foto compartida.",
        storage: "database",
      });
    }

    return NextResponse.json(
      { ok: false, message: "Envía una imagen o una URL de foto." },
      { status: 400 },
    );
  } catch (error) {
    console.error("POST /api/photos error:", error);
    return NextResponse.json(
      { ok: false, message: "No se pudo guardar la foto." },
      { status: 500 },
    );
  }
}
