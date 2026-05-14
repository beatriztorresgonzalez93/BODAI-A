import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

type CompanionIn = {
  name?: string;
  isChild?: boolean;
  kidsMenu?: boolean;
  allergies?: string;
};

type RsvpPayload = {
  name?: string;
  guestCount?: number;
  allergies?: string;
  needsBus?: boolean;
  companionNames?: string[];
  companions?: CompanionIn[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RsvpPayload;
    const name = body.name?.trim();
    const allergies = body.allergies?.trim() ?? "";
    const needsBus = Boolean(body.needsBus);
    const guestCount = Number(body.guestCount);
    const expectedCompanions = Math.max(0, Math.floor(guestCount) - 1);

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "El nombre es obligatorio." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > 20) {
      return NextResponse.json(
        { ok: false, message: "Indica un número de asistentes válido." },
        { status: 400 },
      );
    }

    let companions: {
      name: string;
      isChild: boolean;
      kidsMenu: boolean;
      allergies: string;
    }[] = [];

    if (expectedCompanions > 0) {
      if (Array.isArray(body.companions) && body.companions.length > 0) {
        companions = body.companions
          .slice(0, expectedCompanions)
          .map((c) => ({
            name: String(c?.name ?? "").trim(),
            isChild: Boolean(c?.isChild),
            kidsMenu: Boolean(c?.kidsMenu),
            allergies: String(c?.allergies ?? "").trim(),
          }));
      } else if (Array.isArray(body.companionNames)) {
        companions = body.companionNames
          .slice(0, expectedCompanions)
          .map((s) => ({
            name: String(s ?? "").trim(),
            isChild: false,
            kidsMenu: false,
            allergies: "",
          }));
      }

      if (companions.length !== expectedCompanions) {
        return NextResponse.json(
          {
            ok: false,
            message: "Indica el nombre de cada acompañante.",
          },
          { status: 400 },
        );
      }

      const empty = companions.some((c) => !c.name);
      if (empty) {
        return NextResponse.json(
          {
            ok: false,
            message: "Todos los nombres de acompañantes son obligatorios.",
          },
          { status: 400 },
        );
      }
    }

    const companionNames = companions.map((c) => c.name);

    const db = await getDb();
    await db.collection("rsvps").insertOne({
      name,
      guestCount,
      companions,
      companionNames,
      allergies,
      needsBus,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, message: "Asistencia confirmada." });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo registrar la asistencia." },
      { status: 500 },
    );
  }
}
