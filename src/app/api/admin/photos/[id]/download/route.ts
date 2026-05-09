import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type Params = {
  params: Promise<{ id: string }>;
};

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

export async function GET(_: Request, context: Params) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const db = await getDb();
    const doc = await db.collection("photos").findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json(
        { ok: false, message: "Foto no encontrada." },
        { status: 404 },
      );
    }

    if (typeof doc.photoDataUrl === "string" && doc.photoDataUrl.length > 0) {
      const decoded = decodeDataUrl(doc.photoDataUrl);
      if (!decoded) {
        return NextResponse.json(
          { ok: false, message: "Formato de foto invalido." },
          { status: 400 },
        );
      }

      const ext = decoded.contentType.includes("png")
        ? "png"
        : decoded.contentType.includes("webp")
          ? "webp"
          : "jpg";
      const name = `foto-${id}.${ext}`;

      return new NextResponse(decoded.bytes, {
        headers: {
          "Content-Type": decoded.contentType,
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (typeof doc.photoUrl === "string" && doc.photoUrl.startsWith("http")) {
      return NextResponse.redirect(doc.photoUrl);
    }

    return NextResponse.json(
      { ok: false, message: "Foto sin contenido descargable." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo descargar la foto." },
      { status: 500 },
    );
  }
}
