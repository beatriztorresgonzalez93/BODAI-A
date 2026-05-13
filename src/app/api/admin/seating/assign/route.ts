import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import { flattenRsvpGuests } from "@/lib/seating";

function parseRsvps(docs: Record<string, unknown>[]) {
  return docs.map((doc) => {
    const legacyNames = Array.isArray(doc.companionNames)
      ? doc.companionNames.map((n: unknown) => String(n ?? "").trim())
      : [];
    const companionsRaw = Array.isArray(doc.companions) ? doc.companions : [];
    const companions =
      companionsRaw.length > 0
        ? companionsRaw.map((c: unknown) => {
            const o = c as Record<string, unknown>;
            return {
              name: String(o?.name ?? "").trim(),
              isChild: Boolean(o?.isChild),
              kidsMenu: Boolean(o?.kidsMenu),
            };
          })
        : legacyNames.map((n) => ({
            name: n,
            isChild: false,
            kidsMenu: false,
          }));

    return {
      id: String(doc._id),
      name: String(doc.name ?? ""),
      companions,
      allergies: String(doc.allergies ?? ""),
      needsBus: Boolean(doc.needsBus),
    };
  });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      guestKey?: string;
      tableId?: string;
      seatIndex?: number;
    };

    const guestKey = String(body.guestKey ?? "").trim();
    const tableId = String(body.tableId ?? "").trim();
    const seatIndex = Number(body.seatIndex);

    if (!guestKey || !tableId || !ObjectId.isValid(tableId)) {
      return NextResponse.json({ ok: false, message: "Datos incompletos." }, { status: 400 });
    }
    if (!Number.isInteger(seatIndex) || seatIndex < 0) {
      return NextResponse.json({ ok: false, message: "Silla no válida." }, { status: 400 });
    }

    const db = await getDb();
    const table = await db.collection("seating_tables").findOne({ _id: new ObjectId(tableId) });
    if (!table) {
      return NextResponse.json({ ok: false, message: "Mesa no encontrada." }, { status: 404 });
    }

    const capacity = Math.max(1, Number(table.capacity ?? 8));
    if (seatIndex >= capacity) {
      return NextResponse.json(
        { ok: false, message: "Esa silla no existe en la mesa." },
        { status: 400 },
      );
    }

    const [rsvpId, personIndexStr] = guestKey.split(":");
    const personIndex = Number(personIndexStr);
    if (!rsvpId || !ObjectId.isValid(rsvpId) || !Number.isInteger(personIndex)) {
      return NextResponse.json({ ok: false, message: "Invitado no válido." }, { status: 400 });
    }

    const rsvpDoc = await db.collection("rsvps").findOne({ _id: new ObjectId(rsvpId) });
    if (!rsvpDoc) {
      return NextResponse.json({ ok: false, message: "Confirmación no encontrada." }, { status: 404 });
    }

    const guests = flattenRsvpGuests(parseRsvps([rsvpDoc as Record<string, unknown>]));
    const guest = guests.find((g) => g.guestKey === guestKey);
    if (!guest) {
      return NextResponse.json({ ok: false, message: "Invitado no encontrado." }, { status: 404 });
    }

    const assignments = db.collection("seat_assignments");

    const seatTaken = await assignments.findOne({ tableId, seatIndex });
    if (seatTaken && seatTaken.guestKey !== guestKey) {
      return NextResponse.json({ ok: false, message: "Esa silla ya está ocupada." }, { status: 409 });
    }

    const now = new Date();
    await assignments.updateOne(
      { guestKey },
      {
        $set: {
          tableId,
          seatIndex,
          guestKey,
          guestName: guest.name,
          rsvpId: guest.rsvpId,
          allergies: guest.allergies,
          needsBus: guest.needsBus,
          isChild: guest.isChild,
          kidsMenu: guest.kidsMenu,
          partyLead: guest.partyLead,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true, message: `${guest.name} asignado/a.` });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo asignar el asiento." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { guestKey?: string };
    const guestKey = String(body.guestKey ?? "").trim();
    if (!guestKey) {
      return NextResponse.json({ ok: false, message: "Invitado no válido." }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection("seat_assignments").deleteOne({ guestKey });
    if (result.deletedCount === 0) {
      return NextResponse.json({ ok: false, message: "Asignación no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "Asiento liberado." });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo liberar el asiento." },
      { status: 500 },
    );
  }
}
