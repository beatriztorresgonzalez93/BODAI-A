import { v2 as cloudinary } from "cloudinary";

let configured = false;

/** Evita fallos si hay espacios accidentales en .env (Windows / copiar-pegar). */
function envTrim(key: string): string | undefined {
  const v = process.env[key];
  if (v == null) return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    envTrim("CLOUDINARY_CLOUD_NAME") &&
      envTrim("CLOUDINARY_API_KEY") &&
      envTrim("CLOUDINARY_API_SECRET"),
  );
}

function ensureConfigured(): void {
  if (configured) return;
  const cloud_name = envTrim("CLOUDINARY_CLOUD_NAME");
  const api_key = envTrim("CLOUDINARY_API_KEY");
  const api_secret = envTrim("CLOUDINARY_API_SECRET");
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Faltan variables de entorno de Cloudinary.");
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  configured = true;
}

export async function uploadGuestPhotoFromDataUrl(dataUrl: string): Promise<{
  secureUrl: string;
  publicId: string;
}> {
  ensureConfigured();
  const folder = envTrim("CLOUDINARY_FOLDER") || "boda-fotos";
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    resource_type: "image",
    overwrite: false,
  });
  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
  };
}
