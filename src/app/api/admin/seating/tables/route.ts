import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";
import { defaultTablePosition } from "@/lib/seating";

type CreateBody = {
  name?: string;
  capacity?: number;
  shape?: "round" | "rect";
  x?: number;
  y?: number;
  count?: number;
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateBody;
    const db = await getDb();
    const collection = db.collection("seating_tables");

    const existingCount = await collection.countDocuments();
    const bulkCount = Math.min(Math.max(1, Number(body.count ?? 1)), 30);

    const docs = Array.from({ length: bulkCount }, (_, i) => {
      const index = existingCount + i;
      const pos = defaultTablePosition(index);
      return {
        name: body.name?.trim() || `Mesa ${index + 1}`,
        capacity: Math.min(Math.max(1, Number(body.capacity ?? 10)), 20),
        shape: body.shape === "rect" ? "rect" : "round",
        x: typeof body.x === "number" ? body.x : pos.x,
        y: typeof body.y === "number" ? body.y : pos.y,
        rotation: 0,
        order: index,
        createdAt: new Date(),
      };
    });

    if (bulkCount === 1) {
      const result = await collection.insertOne(docs[0]);
      return NextResponse.json({
        ok: true,
        message: "Mesa creada.",
        tableId: result.insertedId.toString(),
      });
    }

    const result = await collection.insertMany(docs);
    return NextResponse.json({
      ok: true,
      message: `${bulkCount} mesas creadas.`,
      tableIds: Object.values(result.insertedIds).map((id) => id.toString()),
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo crear la mesa." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      capacity?: number;
      shape?: "round" | "rect";
      x?: number;
      y?: number;
      rotation?: number;
      order?: number;
    };

    if (!body.id || !ObjectId.isValid(body.id)) {
      return NextResponse.json({ ok: false, message: "Mesa no válida." }, { status: 400 });
    }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
    if (typeof body.capacity === "number") {
      update.capacity = Math.min(Math.max(1, body.capacity), 20);
    }
    if (body.shape === "round" || body.shape === "rect") update.shape = body.shape;
    if (typeof body.x === "number") update.x = body.x;
    if (typeof body.y === "number") update.y = body.y;
    if (typeof body.rotation === "number") update.rotation = body.rotation;
    if (typeof body.order === "number") update.order = body.order;

    const db = await getDb();
    const result = await db
      .collection("seating_tables")
      .updateOne({ _id: new ObjectId(body.id) }, { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json({ ok: false, message: "Mesa no encontrada." }, { status: 404 });
    }

    if (typeof update.capacity === "number") {
      await db.collection("seat_assignments").deleteMany({
        tableId: body.id,
        seatIndex: { $gte: update.capacity },
      });
    }

    return NextResponse.json({ ok: true, message: "Mesa actualizada." });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo actualizar la mesa." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id || !ObjectId.isValid(body.id)) {
      return NextResponse.json({ ok: false, message: "Mesa no válida." }, { status: 400 });
    }

    const db = await getDb();
    const tableId = body.id;
    await Promise.all([
      db.collection("seat_assignments").deleteMany({ tableId }),
      db.collection("seating_tables").deleteOne({ _id: new ObjectId(tableId) }),
    ]);

    return NextResponse.json({ ok: true, message: "Mesa eliminada." });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No se pudo eliminar la mesa." },
      { status: 500 },
    );
  }
}
