import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import {
  flattenRsvpGuests,
  type RsvpForSeating,
  type SeatAssignment,
  type SeatingTable,
} from "@/lib/seating";

function parseRsvps(docs: Record<string, unknown>[]): RsvpForSeating[] {
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
      id: String(doc._id),
      name: String(doc.name ?? ""),
      companions,
      allergies: String(doc.allergies ?? ""),
      needsBus: Boolean(doc.needsBus),
    };
  });
}

function mapTable(doc: Record<string, unknown>): SeatingTable {
  return {
    id: String(doc._id),
    name: String(doc.name ?? ""),
    capacity: Math.max(1, Number(doc.capacity ?? 8)),
    shape: doc.shape === "rect" ? "rect" : "round",
    x: Number(doc.x ?? 0),
    y: Number(doc.y ?? 0),
    rotation: Number(doc.rotation ?? 0),
    order: Number(doc.order ?? 0),
  };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    const [rsvpDocs, tableDocs, assignmentDocs] = await Promise.all([
      db.collection("rsvps").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
      db.collection("seating_tables").find({}).sort({ order: 1, createdAt: 1 }).toArray(),
      db.collection("seat_assignments").find({}).toArray(),
    ]);

    const rsvps = parseRsvps(rsvpDocs as Record<string, unknown>[]);
    const allGuests = flattenRsvpGuests(rsvps);
    const guestByKey = new Map(allGuests.map((g) => [g.guestKey, g]));

    const tables = tableDocs.map((d) => mapTable(d as Record<string, unknown>));

    const assignments: SeatAssignment[] = assignmentDocs
      .map((doc) => {
        const guestKey = String(doc.guestKey ?? "");
        const guest = guestByKey.get(guestKey);
        return {
          id: String(doc._id),
          tableId: String(doc.tableId ?? ""),
          seatIndex: Number(doc.seatIndex ?? 0),
          guestKey,
          guestName: guest?.name ?? String(doc.guestName ?? ""),
          rsvpId: String(doc.rsvpId ?? guest?.rsvpId ?? ""),
          allergies: guest?.allergies ?? String(doc.allergies ?? ""),
          needsBus: guest?.needsBus ?? Boolean(doc.needsBus),
          isChild: guest?.isChild ?? Boolean(doc.isChild),
          kidsMenu: guest?.kidsMenu ?? Boolean(doc.kidsMenu),
          partyLead: guest?.partyLead ?? String(doc.partyLead ?? ""),
        };
      })
      .filter((a) => a.tableId);

    const assignedKeys = new Set(assignments.map((a) => a.guestKey));
    const unassignedGuests = allGuests.filter((g) => !assignedKeys.has(g.guestKey));

    const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
    const assignedCount = assignments.length;

    return NextResponse.json({
      ok: true,
      tables,
      assignments,
      unassignedGuests,
      stats: {
        totalConfirmed: allGuests.length,
        assigned: assignedCount,
        unassigned: unassignedGuests.length,
        totalSeats,
        freeSeats: Math.max(0, totalSeats - assignedCount),
        tableCount: tables.length,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Error al cargar el seating." },
      { status: 500 },
    );
  }
}
