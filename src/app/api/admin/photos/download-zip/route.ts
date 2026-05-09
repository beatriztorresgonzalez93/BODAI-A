import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/admin-auth";

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection("photos")
      .find({})
      .sort({ createdAt: -1 })
      .limit(2000)
      .project({ guestName: 1, photoDataUrl: 1, photoUrl: 1, createdAt: 1 })
      .toArray();

    const zip = new JSZip();
    let index = 1;
    const links: string[] = [];

    for (const doc of docs) {
      const guest = String(doc.guestName ?? "invitado")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24);
      const datePart =
        doc.createdAt instanceof Date
          ? doc.createdAt.toISOString().slice(0, 10)
          : "fecha";
      const baseName = `${String(index).padStart(4, "0")}-${guest || "invitado"}-${datePart}`;

      if (typeof doc.photoDataUrl === "string" && doc.photoDataUrl.length > 0) {
        const decoded = decodeDataUrl(doc.photoDataUrl);
        if (decoded) {
          const ext = extensionFromContentType(decoded.contentType);
          zip.file(`${baseName}.${ext}`, decoded.bytes);
          index += 1;
          continue;
        }
      }

      if (typeof doc.photoUrl === "string" && doc.photoUrl.startsWith("http")) {
        try {
          const imgRes = await fetch(doc.photoUrl, {
            signal: AbortSignal.timeout(60_000),
          });
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            const ct = imgRes.headers.get("content-type") ?? "";
            const ext = extensionFromContentType(ct);
            zip.file(`${baseName}.${ext}`, buf);
            index += 1;
            continue;
          }
        } catch {
          /* incluir enlace si falla la descarga */
        }
        links.push(`${baseName}: ${doc.photoUrl}`);
        index += 1;
      }
    }

    if (links.length > 0) {
      zip.file(
        "enlaces-fotos-externas.txt",
        links.join("\n"),
      );
    }

    if (index === 1 && links.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No hay fotos para descargar." },
        { status: 404 },
      );
    }

    const bytes = await zip.generateAsync({ type: "uint8array" });
    const filename = `fotos-boda-${new Date().toISOString().slice(0, 10)}.zip`;

    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo generar el ZIP de fotos." },
      { status: 500 },
    );
  }
}
