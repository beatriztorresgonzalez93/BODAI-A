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

export type RsvpForSeating = {
  id: string;
  name: string;
  companions: { name: string; isChild: boolean; kidsMenu: boolean }[];
  allergies: string;
  needsBus: boolean;
};

export function guestKeyFor(rsvpId: string, personIndex: number) {
  return `${rsvpId}:${personIndex}`;
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
        allergies: rsvp.allergies,
        needsBus: rsvp.needsBus,
        partyLead: rsvp.name.trim(),
      });
    });
  }
  return guests.filter((g) => g.name.length > 0);
}

export function seatPositions(
  cx: number,
  cy: number,
  capacity: number,
  shape: TableShape,
  tableRadius = 36,
) {
  const seats: { x: number; y: number }[] = [];
  const seatOrbit = tableRadius + 22;

  if (shape === "rect") {
    const perSide = Math.max(1, Math.ceil(capacity / 4));
    const w = tableRadius * 1.6;
    const h = tableRadius * 1.1;
    const sides: { ax: number; ay: number; bx: number; by: number }[] = [
      { ax: -w, ay: -h, bx: w, by: -h },
      { ax: w, ay: -h, bx: w, by: h },
      { ax: w, ay: h, bx: -w, by: h },
      { ax: -w, ay: h, bx: -w, by: -h },
    ];
    let idx = 0;
    for (const side of sides) {
      for (let i = 0; i < perSide && idx < capacity; i++) {
        const t = perSide === 1 ? 0.5 : i / (perSide - 1);
        const px = side.ax + (side.bx - side.ax) * t;
        const py = side.ay + (side.by - side.ay) * t;
        const len = Math.hypot(px, py) || 1;
        const nx = (px / len) * seatOrbit;
        const ny = (py / len) * seatOrbit;
        seats.push({ x: cx + nx, y: cy + ny });
        idx++;
      }
    }
    while (seats.length < capacity) {
      const angle = (2 * Math.PI * seats.length) / capacity - Math.PI / 2;
      seats.push({
        x: cx + Math.cos(angle) * seatOrbit,
        y: cy + Math.sin(angle) * seatOrbit,
      });
    }
    return seats.slice(0, capacity);
  }

  for (let i = 0; i < capacity; i++) {
    const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
    seats.push({
      x: cx + Math.cos(angle) * seatOrbit,
      y: cy + Math.sin(angle) * seatOrbit,
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
