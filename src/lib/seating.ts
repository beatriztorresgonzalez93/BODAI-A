export type TableShape = "round" | "rect";

export type SeatingTable = {
  id: string;
  name: string;
  capacity: number;
  shape: TableShape;
  x: number;
  y: number;
  rotation: number;
  order: number;
};

export type SeatAssignment = {
  id: string;
  tableId: string;
  seatIndex: number;
  guestKey: string;
  guestName: string;
  rsvpId: string;
  allergies: string;
  needsBus: boolean;
  isChild: boolean;
  kidsMenu: boolean;
  partyLead: string;
};

export type GuestPerson = {
  guestKey: string;
  rsvpId: string;
  name: string;
  isChild: boolean;
  kidsMenu: boolean;
  allergies: string;
  needsBus: boolean;
  partyLead: string;
};

export type CompanionPerson = {
  name: string;
  isChild: boolean;
  kidsMenu: boolean;
  allergies: string;
};

export type RsvpForSeating = {
  id: string;
  name: string;
  companions: CompanionPerson[];
  allergies: string;
  needsBus: boolean;
};

export function guestKeyFor(rsvpId: string, personIndex: number) {
  return `${rsvpId}:${personIndex}`;
}

export function parseGuestKey(guestKey: string) {
  const sep = guestKey.lastIndexOf(":");
  if (sep <= 0) return null;
  const rsvpId = guestKey.slice(0, sep);
  const personIndex = Number(guestKey.slice(sep + 1));
  if (!rsvpId || !Number.isInteger(personIndex) || personIndex < 0) return null;
  return { rsvpId, personIndex };
}

export function parseRsvpDoc(doc: Record<string, unknown>): RsvpForSeating {
  const legacyNames = Array.isArray(doc.companionNames)
    ? doc.companionNames.map((n: unknown) => String(n ?? "").trim())
    : [];
  const companionsRaw = Array.isArray(doc.companions) ? doc.companions : [];
  const companions: CompanionPerson[] =
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
}

export function flattenRsvpGuests(rsvps: RsvpForSeating[]): GuestPerson[] {
  const guests: GuestPerson[] = [];
  for (const rsvp of rsvps) {
    guests.push({
      guestKey: guestKeyFor(rsvp.id, 0),
      rsvpId: rsvp.id,
      name: rsvp.name.trim(),
      isChild: false,
      kidsMenu: false,
      allergies: rsvp.allergies,
      needsBus: rsvp.needsBus,
      partyLead: rsvp.name.trim(),
    });
    rsvp.companions.forEach((c, i) => {
      const name = c.name.trim();
      if (!name) return;
      guests.push({
        guestKey: guestKeyFor(rsvp.id, i + 1),
        rsvpId: rsvp.id,
        name,
        isChild: c.isChild,
        kidsMenu: c.kidsMenu,
        allergies: (c.allergies ?? "").trim(),
        needsBus: rsvp.needsBus,
        partyLead: rsvp.name.trim(),
      });
    });
  }
  return guests.filter((g) => g.name.length > 0);
}

export type TableGeometry = {
  seatRadius: number;
  tableRadius: number;
  halfW: number;
  halfH: number;
  orbit: number;
  orbitW: number;
  orbitH: number;
};

export function tableGeometry(capacity: number, shape: TableShape): TableGeometry {
  const n = Math.max(1, capacity);
  const seatRadius = n >= 18 ? 10 : n >= 14 ? 11 : 12;
  const minSpacing = 2 * seatRadius + 5;

  if (shape === "rect") {
    const peri = Math.max(n * minSpacing, 220);
    const outerSum = peri / 4;
    const aspect = 1.4;
    const orbitH = outerSum / (aspect + 1);
    const orbitW = outerSum - orbitH;
    return {
      seatRadius,
      tableRadius: 0,
      halfW: Math.max(42, orbitW - seatRadius - 6),
      halfH: Math.max(28, orbitH - seatRadius - 6),
      orbit: 0,
      orbitW,
      orbitH,
    };
  }

  const orbit = Math.max(58, (n * minSpacing) / (2 * Math.PI));
  return {
    seatRadius,
    tableRadius: Math.max(32, orbit - seatRadius - 8),
    halfW: 0,
    halfH: 0,
    orbit,
    orbitW: orbit,
    orbitH: orbit,
  };
}

function pointsOnRect(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  count: number,
) {
  const width = halfW * 2;
  const height = halfH * 2;
  const peri = 2 * (width + height);
  const seats: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    let d = (i / count) * peri + width / 2;
    d = ((d % peri) + peri) % peri;
    let x: number;
    let y: number;
    if (d <= width) {
      x = -halfW + d;
      y = -halfH;
    } else if (d <= width + height) {
      x = halfW;
      y = -halfH + (d - width);
    } else if (d <= 2 * width + height) {
      x = halfW - (d - width - height);
      y = halfH;
    } else {
      x = -halfW;
      y = halfH - (d - 2 * width - height);
    }
    seats.push({ x: cx + x, y: cy + y });
  }
  return seats;
}

export function seatPositions(
  cx: number,
  cy: number,
  capacity: number,
  shape: TableShape,
) {
  const n = Math.max(1, capacity);
  const geom = tableGeometry(n, shape);

  if (shape === "rect") {
    return pointsOnRect(cx, cy, geom.orbitW, geom.orbitH, n);
  }

  const seats: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    seats.push({
      x: cx + Math.cos(angle) * geom.orbit,
      y: cy + Math.sin(angle) * geom.orbit,
    });
  }
  return seats;
}

export const FLOOR_WIDTH = 960;
export const FLOOR_HEIGHT = 640;

export function defaultTablePosition(index: number) {
  const cols = 4;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: 120 + col * 210,
    y: 100 + row * 180,
  };
}
