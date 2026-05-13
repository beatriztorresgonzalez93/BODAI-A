"use client";

import {
  Armchair,
  LayoutGrid,
  List,
  Minus,
  Plus,
  Search,
  Trash2,
  UserMinus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  seatPositions,
  type GuestPerson,
  type SeatAssignment,
  type SeatingTable,
} from "@/lib/seating";

type SeatingStats = {
  totalConfirmed: number;
  assigned: number;
  unassigned: number;
  totalSeats: number;
  freeSeats: number;
  tableCount: number;
};

type SeatingData = {
  tables: SeatingTable[];
  assignments: SeatAssignment[];
  unassignedGuests: GuestPerson[];
  stats: SeatingStats;
};

type ViewMode = "plan" | "list";

type FormStatus = { kind: "success" | "error"; message: string } | null;

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  return (await res.json()) as T;
}

function guestInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminSeating() {
  const [data, setData] = useState<SeatingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<FormStatus>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("plan");
  const [selectedGuestKey, setSelectedGuestKey] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [guestSearch, setGuestSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const loadSeating = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiJson<{ ok: boolean } & Partial<SeatingData>>("/api/admin/seating");
      if (!res.ok) {
        setData(null);
        return;
      }
      setData({
        tables: res.tables ?? [],
        assignments: res.assignments ?? [],
        unassignedGuests: res.unassignedGuests ?? [],
        stats: res.stats ?? {
          totalConfirmed: 0,
          assigned: 0,
          unassigned: 0,
          totalSeats: 0,
          freeSeats: 0,
          tableCount: 0,
        },
      });
    } catch {
      setStatus({ kind: "error", message: "No se pudo cargar el seating." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSeating();
  }, [loadSeating]);

  const assignmentBySeat = useMemo(() => {
    const map = new Map<string, SeatAssignment>();
    for (const a of data?.assignments ?? []) {
      map.set(`${a.tableId}:${a.seatIndex}`, a);
    }
    return map;
  }, [data?.assignments]);

  const tableById = useMemo(() => {
    const map = new Map<string, SeatingTable>();
    for (const t of data?.tables ?? []) {
      map.set(t.id, t);
    }
    return map;
  }, [data?.tables]);

  const filteredUnassigned = useMemo(() => {
    const q = guestSearch.trim().toLowerCase();
    const guests = data?.unassignedGuests ?? [];
    if (!q) return guests;
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(q) || g.partyLead.toLowerCase().includes(q),
    );
  }, [data?.unassignedGuests, guestSearch]);

  const listRows = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    const rows = (data?.assignments ?? []).map((a) => ({
      ...a,
      tableName: tableById.get(a.tableId)?.name ?? "—",
    }));
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.guestName.toLowerCase().includes(q) ||
        r.tableName.toLowerCase().includes(q) ||
        r.partyLead.toLowerCase().includes(q),
    );
  }, [data?.assignments, listSearch, tableById]);

  async function createTables(count: number) {
    const res = await apiJson<{ ok: boolean; message: string }>("/api/admin/seating/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count, capacity: 10 }),
    });
    setStatus({ kind: res.ok ? "success" : "error", message: res.message });
    if (res.ok) void loadSeating();
  }

  async function updateTable(id: string, patch: Partial<SeatingTable>) {
    const res = await apiJson<{ ok: boolean; message: string }>("/api/admin/seating/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      setStatus({ kind: "error", message: res.message });
      return false;
    }
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tables: prev.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      };
    });
    if ("capacity" in patch) void loadSeating();
    return true;
  }

  async function deleteTable(id: string) {
    const res = await apiJson<{ ok: boolean; message: string }>("/api/admin/seating/tables", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setStatus({ kind: res.ok ? "success" : "error", message: res.message });
    if (res.ok) {
      setSelectedTableId(null);
      void loadSeating();
    }
  }

  async function assignGuest(guestKey: string, tableId: string, seatIndex: number) {
    const res = await apiJson<{ ok: boolean; message: string }>("/api/admin/seating/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestKey, tableId, seatIndex }),
    });
    setStatus({ kind: res.ok ? "success" : "error", message: res.message });
    if (res.ok) {
      setSelectedGuestKey(null);
      void loadSeating();
    }
  }

  async function unassignGuest(guestKey: string) {
    const res = await apiJson<{ ok: boolean; message: string }>("/api/admin/seating/assign", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestKey }),
    });
    setStatus({ kind: res.ok ? "success" : "error", message: res.message });
    if (res.ok) void loadSeating();
  }

  function onSeatClick(table: SeatingTable, seatIndex: number) {
    const key = `${table.id}:${seatIndex}`;
    const existing = assignmentBySeat.get(key);

    if (existing) {
      void unassignGuest(existing.guestKey);
      return;
    }

    if (selectedGuestKey) {
      void assignGuest(selectedGuestKey, table.id, seatIndex);
    }
  }

  function svgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function onTablePointerDown(e: React.PointerEvent, table: SeatingTable) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedTableId(table.id);
    setDraggingTableId(table.id);
    const p = svgPoint(e.clientX, e.clientY);
    dragOffset.current = { x: p.x - table.x, y: p.y - table.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onTablePointerMove(e: React.PointerEvent, table: SeatingTable) {
    if (draggingTableId !== table.id) return;
    const p = svgPoint(e.clientX, e.clientY);
    const nx = Math.max(50, Math.min(FLOOR_WIDTH - 50, p.x - dragOffset.current.x));
    const ny = Math.max(50, Math.min(FLOOR_HEIGHT - 50, p.y - dragOffset.current.y));
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tables: prev.tables.map((t) =>
          t.id === table.id ? { ...t, x: nx, y: ny } : t,
        ),
      };
    });
  }

  function onTablePointerUp(e: React.PointerEvent, table: SeatingTable) {
    if (draggingTableId !== table.id) return;
    setDraggingTableId(null);
    const current = data?.tables.find((t) => t.id === table.id);
    if (current) void updateTable(table.id, { x: current.x, y: current.y });
  }

  const selectedTable = selectedTableId ? tableById.get(selectedTableId) : null;
  const selectedGuest = selectedGuestKey
    ? (data?.unassignedGuests.find((g) => g.guestKey === selectedGuestKey) ?? null)
    : null;

  return (
    <article className="w-full rounded-2xl bg-white p-5 shadow-sm shadow-[#2F3530]/10 sm:p-7">
      <SeatingHeader />

      <SeatingStatsBar stats={data?.stats} loading={loading} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-[#2F3530]/15 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("plan")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] ${
              viewMode === "plan"
                ? "bg-[#E6ECE3] text-[#2F3530]"
                : "text-[#2F3530]/60 hover:text-[#2F3530]"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            Plano
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] ${
              viewMode === "list"
                ? "bg-[#E6ECE3] text-[#2F3530]"
                : "text-[#2F3530]/60 hover:text-[#2F3530]"
            }`}
          >
            <List className="size-3.5" />
            Lista
          </button>
        </div>

        <button
          type="button"
          onClick={() => void createTables(1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#8A9B82]/50 bg-[#F0F4EE] px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-[#2F3530] hover:bg-[#E6ECE3]"
        >
          <Plus className="size-3.5" />
          Mesa
        </button>
        <button
          type="button"
          onClick={() => void createTables(5)}
          className="rounded-lg border border-[#2F3530]/20 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-[#2F3530]/75 hover:bg-[#FAFCF9]"
        >
          +5 mesas
        </button>
        <button
          type="button"
          onClick={() => void loadSeating()}
          className="ml-auto rounded-lg border border-[#2F3530]/20 px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.12em] text-[#2F3530]/75 hover:bg-[#FAFCF9]"
        >
          Actualizar
        </button>
      </div>

      {status ? (
        <p
          className={`mt-3 text-sm ${status.kind === "success" ? "text-green-800" : "text-red-700"}`}
        >
          {status.message}
        </p>
      ) : null}

      {selectedGuest ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#8A9B82]/40 bg-[#F0F4EE] px-4 py-3 text-sm">
          <p>
            <span className="font-semibold">{selectedGuest.name}</span>
            <span className="text-[#2F3530]/65"> — clic en una silla libre del plano</span>
          </p>
          <button
            type="button"
            onClick={() => setSelectedGuestKey(null)}
            className="shrink-0 rounded-md p-1 hover:bg-white/70"
            aria-label="Cancelar selección"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {viewMode === "plan" ? (
        <SeatingPlanView
          data={data}
          loading={loading}
          svgRef={svgRef}
          assignmentBySeat={assignmentBySeat}
          selectedGuestKey={selectedGuestKey}
          selectedTableId={selectedTableId}
          draggingTableId={draggingTableId}
          onSeatClick={onSeatClick}
          onTablePointerDown={onTablePointerDown}
          onTablePointerMove={onTablePointerMove}
          onTablePointerUp={onTablePointerUp}
          filteredUnassigned={filteredUnassigned}
          guestSearch={guestSearch}
          setGuestSearch={setGuestSearch}
          setSelectedGuestKey={setSelectedGuestKey}
          selectedTable={selectedTable ?? null}
          updateTable={updateTable}
          deleteTable={deleteTable}
          setSelectedTableId={setSelectedTableId}
        />
      ) : (
        <SeatingListView
          listRows={listRows}
          listSearch={listSearch}
          setListSearch={setListSearch}
          unassigned={data?.unassignedGuests ?? []}
          onUnassign={unassignGuest}
          setSelectedGuestKey={setSelectedGuestKey}
          setViewMode={setViewMode}
        />
      )}
    </article>
  );
}

function SeatingHeader() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-serif text-2xl">Seating</h3>
        <p className="mt-1 text-sm text-[#2F3530]/60">
          Plano del salón y asignación de invitados confirmados
        </p>
      </div>
    </div>
  );
}

function SeatingStatsBar({ stats, loading }: { stats?: SeatingStats; loading: boolean }) {
  if (loading) {
    return <p className="mt-4 text-sm text-[#2F3530]/55">Cargando seating…</p>;
  }
  if (!stats) return null;
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {[
        { label: "Confirmados", value: stats.totalConfirmed },
        { label: "Sentados", value: stats.assigned },
        { label: "Sin mesa", value: stats.unassigned },
        { label: "Mesas", value: stats.tableCount },
        { label: "Plazas", value: stats.totalSeats },
        { label: "Libres", value: stats.freeSeats },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[#2F3530]/10 bg-[#FAFCF9] px-3 py-2.5 text-center"
        >
          <p className="font-serif text-xl tabular-nums text-[#2F3530]">{item.value}</p>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8A9B82]">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

type PlanProps = {
  data: SeatingData | null;
  loading: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  assignmentBySeat: Map<string, SeatAssignment>;
  selectedGuestKey: string | null;
  selectedTableId: string | null;
  draggingTableId: string | null;
  onSeatClick: (table: SeatingTable, seatIndex: number) => void;
  onTablePointerDown: (e: React.PointerEvent, table: SeatingTable) => void;
  onTablePointerMove: (e: React.PointerEvent, table: SeatingTable) => void;
  onTablePointerUp: (e: React.PointerEvent, table: SeatingTable) => void;
  filteredUnassigned: GuestPerson[];
  guestSearch: string;
  setGuestSearch: (v: string) => void;
  setSelectedGuestKey: (k: string | null) => void;
  selectedTable: SeatingTable | null;
  updateTable: (id: string, patch: Partial<SeatingTable>) => Promise<boolean>;
  deleteTable: (id: string) => Promise<void>;
  setSelectedTableId: (id: string | null) => void;
};

function SeatingPlanView(props: PlanProps) {
  const {
    data,
    loading,
    svgRef,
    assignmentBySeat,
    selectedGuestKey,
    selectedTableId,
    draggingTableId,
    onSeatClick,
    onTablePointerDown,
    onTablePointerMove,
    onTablePointerUp,
    filteredUnassigned,
    guestSearch,
    setGuestSearch,
    setSelectedGuestKey,
    selectedTable,
    updateTable,
    deleteTable,
    setSelectedTableId,
  } = props;

  const tables = data?.tables ?? [];

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 overflow-x-auto rounded-xl border border-[#2F3530]/12 bg-[#F4F6F2]">
        {loading ? (
          <p className="p-8 text-center text-sm text-[#2F3530]/55">Cargando plano…</p>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Armchair className="size-10 text-[#8A9B82]/60" strokeWidth={1.25} />
            <p className="text-sm text-[#2F3530]/65">
              Aún no hay mesas. Crea la primera para empezar el plano.
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${FLOOR_WIDTH} ${FLOOR_HEIGHT}`}
            className="h-auto w-full min-w-[640px] touch-none select-none"
            role="img"
            aria-label="Plano del salón con mesas y sillas"
          >
            <rect width={FLOOR_WIDTH} height={FLOOR_HEIGHT} fill="#F4F6F2" />
            <rect
              x={40}
              y={40}
              width={FLOOR_WIDTH - 80}
              height={FLOOR_HEIGHT - 80}
              rx={12}
              fill="#ECEEE9"
              stroke="#C8D0C4"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <text
              x={FLOOR_WIDTH / 2}
              y={28}
              textAnchor="middle"
              className="fill-[#8A9B82] text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Salón
            </text>

            {tables.map((table) => {
              const seats = seatPositions(table.x, table.y, table.capacity, table.shape);
              const occupied = seats.filter((_, i) =>
                assignmentBySeat.has(`${table.id}:${i}`),
              ).length;
              const isSelected = selectedTableId === table.id;
              const isDragging = draggingTableId === table.id;
              const tableR = table.shape === "rect" ? 0 : 36;

              return (
                <g
                  key={table.id}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  onPointerDown={(e) => onTablePointerDown(e, table)}
                  onPointerMove={(e) => onTablePointerMove(e, table)}
                  onPointerUp={(e) => onTablePointerUp(e, table)}
                >
                  {table.shape === "rect" ? (
                    <rect
                      x={table.x - 58}
                      y={table.y - 40}
                      width={116}
                      height={80}
                      rx={8}
                      fill={isSelected ? "#DDE6D8" : "#FFFFFF"}
                      stroke={isSelected ? "#8A9B82" : "#B8C4B0"}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                  ) : (
                    <circle
                      cx={table.x}
                      cy={table.y}
                      r={tableR}
                      fill={isSelected ? "#DDE6D8" : "#FFFFFF"}
                      stroke={isSelected ? "#8A9B82" : "#B8C4B0"}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                  )}

                  <text
                    x={table.x}
                    y={table.y - 6}
                    textAnchor="middle"
                    className="fill-[#2F3530] text-[11px] font-semibold pointer-events-none"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {table.name}
                  </text>
                  <text
                    x={table.x}
                    y={table.y + 10}
                    textAnchor="middle"
                    className="fill-[#8A9B82] text-[9px] font-medium pointer-events-none"
                    style={{ fontFamily: "system-ui, sans-serif" }}
                  >
                    {occupied}/{table.capacity}
                  </text>

                  {seats.map((seat, seatIndex) => {
                    const key = `${table.id}:${seatIndex}`;
                    const assignment = assignmentBySeat.get(key);
                    const occupiedSeat = Boolean(assignment);
                    const canAssign = Boolean(selectedGuestKey) && !occupiedSeat;

                    return (
                      <g
                        key={key}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeatClick(table, seatIndex);
                        }}
                        style={{ cursor: canAssign ? "copy" : occupiedSeat ? "pointer" : "default" }}
                      >
                        <circle
                          cx={seat.x}
                          cy={seat.y}
                          r={14}
                          fill={
                            occupiedSeat
                              ? "#8A9B82"
                              : canAssign
                                ? "#C5D4BC"
                                : "#FFFFFF"
                          }
                          stroke={canAssign ? "#6B7F63" : occupiedSeat ? "#6B7F63" : "#C8D0C4"}
                          strokeWidth={canAssign ? 2 : 1.25}
                        />
                        <text
                          x={seat.x}
                          y={seat.y + 3.5}
                          textAnchor="middle"
                          className={`pointer-events-none text-[8px] font-semibold ${
                            occupiedSeat ? "fill-white" : "fill-[#2F3530]/70"
                          }`}
                          style={{ fontFamily: "system-ui, sans-serif" }}
                        >
                          {occupiedSeat
                            ? guestInitials(assignment!.guestName)
                            : seatIndex + 1}
                        </text>
                        <title>
                          {occupiedSeat
                            ? `${assignment!.guestName}${assignment!.allergies ? ` · ${assignment!.allergies}` : ""}`
                            : `Silla ${seatIndex + 1} — ${canAssign ? "clic para sentar" : "libre"}`}
                        </title>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        {selectedTable ? (
          <div className="rounded-xl border border-[#8A9B82]/35 bg-[#FAFCF9] p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A9B82]">
                Mesa seleccionada
              </p>
              <button
                type="button"
                onClick={() => setSelectedTableId(null)}
                className="rounded p-0.5 hover:bg-[#E6ECE3]"
                aria-label="Cerrar"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <label className="mt-3 block">
              <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8A9B82]">
                Nombre
              </span>
              <input
                defaultValue={selectedTable.name}
                key={selectedTable.id + selectedTable.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== selectedTable.name) void updateTable(selectedTable.id, { name: v });
                }}
                className="mt-1 w-full rounded-lg border border-[#2F3530]/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8A9B82]/40"
              />
            </label>
            <div className="mt-3 flex items-center gap-2">
              <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8A9B82]">
                Plazas
              </span>
              <button
                type="button"
                onClick={() =>
                  void updateTable(selectedTable.id, {
                    capacity: Math.max(1, selectedTable.capacity - 1),
                  })
                }
                className="inline-flex size-8 items-center justify-center rounded-md border border-[#2F3530]/15"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="min-w-[2ch] text-center font-medium tabular-nums">
                {selectedTable.capacity}
              </span>
              <button
                type="button"
                onClick={() =>
                  void updateTable(selectedTable.id, {
                    capacity: Math.min(20, selectedTable.capacity + 1),
                  })
                }
                className="inline-flex size-8 items-center justify-center rounded-md border border-[#2F3530]/15"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  void updateTable(selectedTable.id, {
                    shape: selectedTable.shape === "round" ? "rect" : "round",
                  })
                }
                className="flex-1 rounded-lg border border-[#2F3530]/20 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                {selectedTable.shape === "round" ? "Rectangular" : "Redonda"}
              </button>
              <button
                type="button"
                onClick={() => void deleteTable(selectedTable.id)}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 text-red-700 hover:bg-red-50"
                aria-label="Eliminar mesa"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-[#2F3530]/50">Arrastra la mesa en el plano para moverla.</p>
          </div>
        ) : null}

        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A9B82]" />
            <input
              value={guestSearch}
              onChange={(e) => setGuestSearch(e.target.value)}
              placeholder="Buscar invitado…"
              className="w-full rounded-lg border border-[#2F3530]/15 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#8A9B82]/40"
            />
          </div>
          <p className="mt-3 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A9B82]">
            Sin asignar ({filteredUnassigned.length})
          </p>
          <ul className="mt-2 max-h-[420px] space-y-1.5 overflow-y-auto">
            {filteredUnassigned.length === 0 ? (
              <li className="py-4 text-center text-sm text-[#2F3530]/50">
                {guestSearch ? "Sin resultados." : "Todos los confirmados tienen mesa."}
              </li>
            ) : (
              filteredUnassigned.map((guest) => (
                <li key={guest.guestKey}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedGuestKey(
                        selectedGuestKey === guest.guestKey ? null : guest.guestKey,
                      )
                    }
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedGuestKey === guest.guestKey
                        ? "border-[#8A9B82] bg-[#E6ECE3]"
                        : "border-[#2F3530]/10 bg-white hover:border-[#8A9B82]/40"
                    }`}
                  >
                    <p className="font-medium text-[#2F3530]">{guest.name}</p>
                    <p className="mt-0.5 text-xs text-[#2F3530]/55">
                      RSVP: {guest.partyLead}
                      {guest.allergies ? ` · ${guest.allergies}` : ""}
                    </p>
                    {(guest.isChild || guest.kidsMenu) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {guest.isChild ? (
                          <span className="rounded bg-[#E3EAE0] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#2F3530]/70">
                            Niño/a
                          </span>
                        ) : null}
                        {guest.kidsMenu ? (
                          <span className="rounded bg-[#E6ECE3] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#2F3530]/70">
                            Menú infantil
                          </span>
                        ) : null}
                      </div>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
          <p className="mt-3 text-xs text-[#2F3530]/50">
            Selecciona un invitado y haz clic en una silla libre. Clic en silla ocupada para liberarla.
          </p>
        </div>
      </aside>
    </div>
  );
}

type ListProps = {
  listRows: (SeatAssignment & { tableName: string })[];
  listSearch: string;
  setListSearch: (v: string) => void;
  unassigned: GuestPerson[];
  onUnassign: (guestKey: string) => Promise<void>;
  setSelectedGuestKey: (k: string | null) => void;
  setViewMode: (v: ViewMode) => void;
};

function SeatingListView({
  listRows,
  listSearch,
  setListSearch,
  unassigned,
  onUnassign,
  setSelectedGuestKey,
  setViewMode,
}: ListProps) {
  return (
    <div className="mt-5 space-y-6">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A9B82]" />
        <input
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          placeholder="Buscar en la lista…"
          className="w-full rounded-lg border border-[#2F3530]/15 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#8A9B82]/40"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
          <thead className="text-[#8A9B82]">
            <tr>
              <th className="border-b border-[#2F3530]/10 py-3 pr-4 font-semibold">Mesa</th>
              <th className="border-b border-[#2F3530]/10 py-3 px-4 font-semibold">Silla</th>
              <th className="border-b border-[#2F3530]/10 py-3 px-4 font-semibold">Invitado</th>
              <th className="border-b border-[#2F3530]/10 py-3 px-4 font-semibold">RSVP</th>
              <th className="border-b border-[#2F3530]/10 py-3 px-4 font-semibold">Alergias</th>
              <th className="border-b border-[#2F3530]/10 py-3 pl-4 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {listRows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="border-b border-[#2F3530]/8 py-3 pr-4 font-medium">{row.tableName}</td>
                <td className="border-b border-[#2F3530]/8 py-3 px-4 tabular-nums">{row.seatIndex + 1}</td>
                <td className="border-b border-[#2F3530]/8 py-3 px-4">
                  <p>{row.guestName}</p>
                  {(row.isChild || row.kidsMenu) && (
                    <p className="mt-1 text-xs text-[#2F3530]/55">
                      {[row.isChild ? "Niño/a" : null, row.kidsMenu ? "Menú infantil" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </td>
                <td className="border-b border-[#2F3530]/8 py-3 px-4 text-[#2F3530]/80">{row.partyLead}</td>
                <td className="border-b border-[#2F3530]/8 py-3 px-4">{row.allergies || "—"}</td>
                <td className="border-b border-[#2F3530]/8 py-3 pl-4">
                  <button
                    type="button"
                    onClick={() => void onUnassign(row.guestKey)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#2F3530]/20 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-[#FAFCF9]"
                  >
                    <UserMinus className="size-3.5" />
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {listRows.length === 0 ? (
          <p className="py-6 text-sm text-[#2F3530]/55">Nadie sentado todavía.</p>
        ) : null}
      </div>

      {unassigned.length > 0 ? (
        <div>
          <h4 className="font-serif text-lg">Pendientes de asignar</h4>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unassigned.map((g) => (
              <li key={g.guestKey}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuestKey(g.guestKey);
                    setViewMode("plan");
                  }}
                  className="rounded-full border border-[#2F3530]/15 bg-[#FAFCF9] px-3 py-1.5 text-sm hover:border-[#8A9B82]/50"
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
