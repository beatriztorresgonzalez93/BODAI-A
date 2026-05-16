import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

/** Diagnóstico en Vercel: abre /api/health en producción (no expone secretos). */
export async function GET() {
  const checks = {
    mongodbUri: Boolean(process.env.MONGODB_URI?.trim()),
    mongodbDbName: Boolean(process.env.MONGODB_DB_NAME?.trim()),
    adminUser: Boolean(process.env.ADMIN_USER?.trim()),
    adminPassword: Boolean(
      process.env.ADMIN_PASSWORD?.trim() ||
        process.env.ADMIN_PASSWORD_HASH?.trim(),
    ),
    adminSessionSecret: Boolean(process.env.ADMIN_SESSION_SECRET?.trim()),
    cloudinary: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
        process.env.CLOUDINARY_API_KEY?.trim() &&
        process.env.CLOUDINARY_API_SECRET?.trim(),
    ),
  };

  let dbOk = false;
  let dbError: string | null = null;

  if (checks.mongodbUri) {
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : "Error de conexión";
    }
  } else {
    dbError = "Falta MONGODB_URI en las variables de entorno de Vercel.";
  }

  const ok =
    checks.mongodbUri &&
    checks.mongodbDbName &&
    checks.adminSessionSecret &&
    dbOk;

  return NextResponse.json(
    {
      ok,
      checks,
      dbOk,
      dbError,
      hint: ok
        ? "Configuración correcta."
        : "Revisa Environment Variables en Vercel y Network Access en MongoDB Atlas (0.0.0.0/0).",
    },
    { status: ok ? 200 : 503 },
  );
}
