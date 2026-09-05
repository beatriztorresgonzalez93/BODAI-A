import { ObjectId, type Db } from "mongodb";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import {
  flattenRsvpGuests,
  guestKeyFor,
  parseGuestKey,
  parseRsvpDoc,
  type CompanionPerson,
  type GuestPerson,
} from "@/lib/seating";

type Params = {
  params: Promise<{ id: string }>;
};

type CompanionIn = {
  originalPersonIndex?: number;
  name?: string;
  isChild?: boolean;
  kidsMenu?: boolean;
  allergies?: string;
};

type PatchBody = {
  name?: string;
  allergies?: string;
  needsBus?: boolean;
  companions?: CompanionIn[];
};

function unauthorized() {
  return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
}

function normalizeCompanion(c: CompanionIn): CompanionPerson | null {
  const name = String(c?.name ?? "").trim();
  if (!name) return null;
  return {
    name,
    isChild: Boolean(c?.isChild),
    kidsMenu: Boolean(c?.kidsMenu),
    allergies: String(c?.allergies ?? "").trim(),
  };
}

async function rewriteAssignments(
  db: Db,
  rsvpId: string,
  keyMap: Map<string, string | null>,
  guests: GuestPerson[],
) {
  const assignments = db.collection("seat_assignments");
  const guestByKey = new Map(guests.map((g) => [g.guestKey, g]));
  const toDelete: string[] = [];
  const toMove: { from: string; to: string }[] = [];

  for (const [from, to] of keyMap) {
    if (!to) toDelete.push(from);
    else if (from !== to) toMove.push({ from, to });
  }

  if (toDelete.length > 0) {
    await assignments.deleteMany({ guestKey: { $in: toDelete } });
  }

  for (const { from, to } of toMove) {
    await assignments.updateOne({ guestKey: from }, { $set: { guestKey: `__tmp__${to}` } });
  }
  for (const { to } of toMove) {
    const guest = guestByKey.get(to);
    await assignments.updateOne(
      { guestKey: `__tmp__${to}` },
      {
        $set: {
          guestKey: to,
          rsvpId,
          guestName: guest?.name ?? "",
          allergies: guest?.allergies ?? "",
          needsBus: guest?.needsBus ?? false,
          isChild: guest?.isChild ?? false,
          kidsMenu: guest?.kidsMenu ?? false,
          partyLead: guest?.partyLead ?? "",
          updatedAt: new Date(),
        },
      },
    );
  }

  const now = new Date();
  for (const guest of guests) {
    await assignments.updateMany(
      { guestKey: guest.guestKey },
      {
        $set: {
          guestName: guest.name,
          allergies: guest.allergies,
          needsBus: guest.needsBus,
          isChild: guest.isChild,
          kidsMenu: guest.kidsMenu,
          partyLead: guest.partyLead,
          rsvpId: guest.rsvpId,
          updatedAt: now,
        },
      },
    );
  }
}

export async function GET(_: Request, context: Params) {
  if (!(await isAdminAuthenticated())) return unauthorized();

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Confirmación no válida." }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db.collection("rsvps").findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ ok: false, message: "Confirmación no encontrada." }, { status: 404 });
    }

    const rsvp = parseRsvpDoc(doc as Record<string, unknown>);
    return NextResponse.json({
      ok: true,
      rsvp: {
        ...rsvp,
        guestCount: 1 + rsvp.companions.length,
        companions: rsvp.companions.map((c, i) => ({
          ...c,
          personIndex: i + 1,
        })),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo cargar la confirmación." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: Params) {
  if (!(await isAdminAuthenticated())) return unauthorized();

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Confirmación no válida." }, { status: 400 });
    }

    const body = (await request.json()) as PatchBody;
    const name = String(body.name ?? "").trim();
    const allergies = String(body.allergies ?? "").trim();
    const needsBus = Boolean(body.needsBus);
    const companionsIn = Array.isArray(body.companions) ? body.companions : [];

    if (!name) {
      return NextResponse.json({ ok: false, message: "El nombre es obligatorio." }, { status: 400 });
    }
    if (companionsIn.length > 19) {
      return NextResponse.json(
        { ok: false, message: "Demasiados acompañantes." },
        { status: 400 },
      );
    }

    const companions: CompanionPerson[] = [];
    const companionOrigins: (number | null)[] = [];
    for (const raw of companionsIn) {
      const companion = normalizeCompanion(raw);
      if (!companion) {
        return NextResponse.json(
          { ok: false, message: "Todos los nombres de acompañantes son obligatorios." },
          { status: 400 },
        );
      }
      companions.push(companion);
      const origin = Number(raw.originalPersonIndex);
      companionOrigins.push(Number.isInteger(origin) && origin > 0 ? origin : null);
    }

    const db = await getDb();
    const rsvps = db.collection("rsvps");
    const doc = await rsvps.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ ok: false, message: "Confirmación no encontrada." }, { status: 404 });
    }

    const oldRsvp = parseRsvpDoc(doc as Record<string, unknown>);
    const oldGuests = flattenRsvpGuests([oldRsvp]);
    const oldKeys = oldGuests.map((g) => g.guestKey);

    const guestCount = 1 + companions.length;
    await rsvps.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          allergies,
          needsBus,
          companions,
          companionNames: companions.map((c) => c.name),
          guestCount,
          updatedAt: new Date(),
        },
      },
    );

    const newRsvp = parseRsvpDoc({
      _id: id,
      name,
      allergies,
      needsBus,
      companions,
    });
    const newGuests = flattenRsvpGuests([newRsvp]);

    const keyMap = new Map<string, string | null>([[guestKeyFor(id, 0), guestKeyFor(id, 0)]]);

    companions.forEach((_, i) => {
      const newKey = guestKeyFor(id, i + 1);
      const origin = companionOrigins[i];
      if (origin != null) {
        keyMap.set(guestKeyFor(id, origin), newKey);
      }
    });

    for (const oldKey of oldKeys) {
      if (!keyMap.has(oldKey)) keyMap.set(oldKey, null);
    }

    await rewriteAssignments(db, id, keyMap, newGuests);
    return NextResponse.json({ ok: true, message: "Invitado actualizado." });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo actualizar el invitado." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: Params) {
  if (!(await isAdminAuthenticated())) return unauthorized();

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: "Confirmación no válida." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { guestKey?: string };
    const guestKey = String(body.guestKey ?? "").trim();
    const parsed = guestKey ? parseGuestKey(guestKey) : null;
    if (guestKey && (!parsed || parsed.rsvpId !== id)) {
      return NextResponse.json({ ok: false, message: "Invitado no válido." }, { status: 400 });
    }

    const db = await getDb();
    const rsvps = db.collection("rsvps");
    const assignments = db.collection("seat_assignments");
    const doc = await rsvps.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return NextResponse.json({ ok: false, message: "Confirmación no encontrada." }, { status: 404 });
    }

    const oldRsvp = parseRsvpDoc(doc as Record<string, unknown>);
    const personIndex = parsed?.personIndex ?? 0;
    const oldGuests = flattenRsvpGuests([oldRsvp]);
    if (!oldGuests.some((g) => g.guestKey === guestKeyFor(id, personIndex))) {
      return NextResponse.json({ ok: false, message: "Invitado no encontrado." }, { status: 404 });
    }

    const deleteWholeParty =
      !guestKey || (personIndex === 0 && oldRsvp.companions.length === 0);

    if (deleteWholeParty) {
      await rsvps.deleteOne({ _id: new ObjectId(id) });
      await assignments.deleteMany({
        $or: [{ rsvpId: id }, { guestKey: { $regex: `^${id}:` } }],
      });
      return NextResponse.json({ ok: true, message: "Invitado eliminado." });
    }

    let name = oldRsvp.name;
    let allergies = oldRsvp.allergies;
    let companions = oldRsvp.companions;
    const keyMap = new Map<string, string | null>();
    const oldCount = 1 + oldRsvp.companions.length;

    if (personIndex === 0) {
      const promoted = companions[0];
      name = promoted.name;
      allergies = promoted.allergies;
      companions = companions.slice(1);
      keyMap.set(guestKeyFor(id, 0), null);
      for (let i = 1; i < oldCount; i++) {
        keyMap.set(guestKeyFor(id, i), guestKeyFor(id, i - 1));
      }
    } else {
      companions = companions.filter((_, i) => i !== personIndex - 1);
      keyMap.set(guestKeyFor(id, personIndex), null);
      keyMap.set(guestKeyFor(id, 0), guestKeyFor(id, 0));
      for (let i = 1; i < oldCount; i++) {
        if (i < personIndex) keyMap.set(guestKeyFor(id, i), guestKeyFor(id, i));
        else if (i > personIndex) keyMap.set(guestKeyFor(id, i), guestKeyFor(id, i - 1));
      }
    }

    const guestCount = 1 + companions.length;
    await rsvps.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          allergies,
          companions,
          companionNames: companions.map((c) => c.name),
          guestCount,
          updatedAt: new Date(),
        },
      },
    );

    const newRsvp = parseRsvpDoc({
      _id: id,
      name,
      allergies,
      needsBus: oldRsvp.needsBus,
      companions,
    });
    await rewriteAssignments(db, id, keyMap, flattenRsvpGuests([newRsvp]));

    return NextResponse.json({ ok: true, message: "Invitado eliminado." });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo eliminar el invitado." },
      { status: 500 },
    );
  }
}
