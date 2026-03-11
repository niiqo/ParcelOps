"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EstadoPackage, Tipo } from "@/types/package";
import { useNotification } from "@/components/notifications/NotificationProvider";

const ESTANTES = ["1", "2", "3", "4", "5", "6", "7", "8", "s/n estante"];

type Row = {
  id: string;
  nombre: string;
  empresa: string;
  estante: string;
  estado: EstadoPackage;
  tipo: Tipo | "-";
};

function Alert({ msg }: { msg: string }) {
  const isError = msg.toLowerCase().includes("error");
  const className = isError
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return <div className={`rounded-md border px-3 py-2 text-sm ${className}`}>{msg}</div>;
}

function empresaBadgeClass(empresa: string) {
  switch (empresa) {
    case "SEUR":
      return "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200";
    case "TIPSA":
      return "bg-fuchsia-50 text-fuchsia-800 ring-1 ring-fuchsia-200";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  }
}

function tipoBadgeClass(tipo: Tipo | "-") {
  switch (tipo) {
    case "envio":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
    case "entrega":
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  }
}

export default function ReorganizacionPage() {
  const notify = useNotification();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [selectedEstantes, setSelectedEstantes] = useState<string[]>([]);
  const [lastClickedEstante, setLastClickedEstante] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moving, setMoving] = useState(false);
  const [individualDestinos, setIndividualDestinos] = useState<Record<string, string>>({});
  const [movingId, setMovingId] = useState<string | null>(null);

  const [massiveOpen, setMassiveOpen] = useState(false);
  const [massiveDestino, setMassiveDestino] = useState("");

  const resumenEstantes = useMemo(() => {
    const acc: Record<string, number> = {};

    for (const row of rows) {
      const estante = row.estante.trim() || "Sin estante";
      acc[estante] = (acc[estante] ?? 0) + 1;
    }

    return Object.entries(acc).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rows]);

  const estantesDisponibles = ESTANTES;

  const filteredRows = useMemo(() => {
    if (selectedEstantes.length === 0) return rows;

    return rows.filter((row) => {
      const estante = row.estante.trim() || "Sin estante";
      return selectedEstantes.includes(estante);
    });
  }, [rows, selectedEstantes]);

  const visibleIds = useMemo(() => filteredRows.map((row) => row.id), [filteredRows]);

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  async function cargar() {
    setLoading(true);
    setMensaje("");

    try {
      const q = query(collection(db, "packages"), where("estado", "==", "EN_DEPOSITO"));

      const snap = await getDocs(q);

      const list: Row[] = snap.docs.map((docSnap) => {
        const d = docSnap.data() as {
          nombre?: string;
          empresa?: string;
          estante?: string;
          estado: EstadoPackage;
          tipo?: Tipo;
        };

        return {
          id: docSnap.id,
          nombre: d.nombre ?? "",
          empresa: d.empresa ?? "",
          estante: d.estante ?? "",
          estado: d.estado,
          tipo: d.tipo ?? "-",
        };
      });

      setRows(list);
    } catch (e) {
      console.error(e);
      setMensaje("Error cargando paquetes.");
    } finally {
      setLoading(false);
    }
  }

  function toggleFiltroDesdeTarjeta(estante: string, shiftKey: boolean) {
    if (shiftKey) {
      setSelectedEstantes((prev) => {
        if (prev.includes(estante)) {
          return prev.filter((x) => x !== estante);
        }
        return [...prev, estante];
      });
      setLastClickedEstante(estante);
      return;
    }

    setSelectedEstantes((prev) => {
      if (prev.length === 1 && prev[0] === estante) {
        return [];
      }
      return [estante];
    });
    setLastClickedEstante(estante);
  }

  function clearEstanteFilters() {
    setSelectedEstantes([]);
    setLastClickedEstante(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }

      const merged = new Set([...prev, ...visibleIds]);
      return Array.from(merged);
    });
  }

  function updateIndividualDestino(id: string, value: string) {
    setIndividualDestinos((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  async function moverSeleccionados(destino: string) {
    const destinoTrim = destino.trim();

    if (selectedIds.length === 0) {
      notify.warning("Selecciona al menos un paquete.");
      return;
    }

    if (!destinoTrim) {
      notify.warning("Indica un estante destino.");
      return;
    }

    setMoving(true);
    setMensaje("");

    try {
      const batch = writeBatch(db);

      for (const id of selectedIds) {
        const ref = doc(db, "packages", id);
        batch.update(ref, { estante: destinoTrim });
      }

      await batch.commit();

      const cantidad = selectedIds.length;

      setSelectedIds([]);
      setMassiveDestino("");
      setMassiveOpen(false);
      notify.success(
        `${cantidad} ${cantidad === 1 ? "paquete movido" : "paquetes movidos"} a estante ${destinoTrim}.`,
      );

      await cargar();
    } catch (e) {
      console.error(e);
      setMensaje("Error moviendo paquetes.");
    } finally {
      setMoving(false);
    }
  }

  async function moverIndividual(id: string, estanteActual: string) {
    const destino = (individualDestinos[id] ?? estanteActual).trim();
    const actual = estanteActual.trim();

    if (!destino) {
      notify.warning("Indica un estante destino para el paquete.");
      return;
    }

    if (destino === actual) {
      notify.warning("Debes seleccionar un estante distinto al actual.");
      return;
    }

    setMovingId(id);
    setMensaje("");

    try {
      const ref = doc(db, "packages", id);
      const batch = writeBatch(db);

      batch.update(ref, { estante: destino });

      await batch.commit();

      setIndividualDestinos((prev) => ({
        ...prev,
        [id]: destino,
      }));

      notify.success(`Paquete movido a estante ${destino}.`);

      await cargar();
    } catch (e) {
      console.error(e);
      setMensaje("Error moviendo el paquete.");
    } finally {
      setMovingId(null);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Reorganización de depósito</h2>
        <p className="mt-1 text-sm text-slate-600">
          Reubicá paquetes por estante de forma masiva o individual.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            Usá las tarjetas para filtrar por estante. Con{" "}
            <span className="font-medium text-slate-900">Shift + click</span> podés combinar varios.
          </div>

          <button
            type="button"
            onClick={cargar}
            disabled={loading || moving || movingId !== null}
            className={[
              "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium",
              "border bg-white text-slate-900 hover:bg-slate-50",
              "disabled:cursor-not-allowed disabled:text-slate-400",
            ].join(" ")}
          >
            {loading ? "Cargando..." : "Recargar"}
          </button>
        </div>

        {mensaje ? <div className="mt-3"><Alert msg={mensaje} /></div> : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Resumen por estante</h3>

          {selectedEstantes.length > 0 ? (
            <button
              type="button"
              onClick={clearEstanteFilters}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Limpiar filtro
            </button>
          ) : null}
        </div>

        {resumenEstantes.length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
            No hay paquetes en depósito.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={clearEstanteFilters}
              className={[
                "min-w-[150px] rounded-xl border px-4 py-3 text-left shadow-sm transition",
                selectedEstantes.length === 0
                  ? "border-slate-900 bg-slate-100 ring-1 ring-slate-300"
                  : "bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="text-sm font-semibold text-slate-900">Todos</div>
              <div className="mt-1 text-sm text-slate-600">{rows.length} paquetes</div>
            </button>

            {resumenEstantes.map(([estante, cantidad]) => {
              const activo = selectedEstantes.includes(estante);

              return (
                <button
                  key={estante}
                  type="button"
                  onClick={(e) => toggleFiltroDesdeTarjeta(estante, e.shiftKey)}
                  className={[
                    "min-w-[150px] rounded-xl border px-4 py-3 text-left shadow-sm transition",
                    activo
                      ? "border-slate-900 bg-slate-100 ring-1 ring-slate-300"
                      : "bg-white hover:bg-slate-50",
                  ].join(" ")}
                  title="Click para filtrar. Shift + click para combinar."
                >
                  <div className="text-sm font-semibold text-slate-900">{estante}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {cantidad} {cantidad === 1 ? "paquete" : "paquetes"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Paquetes en depósito</h3>

          <button
            type="button"
            onClick={() => setMassiveOpen(true)}
            disabled={selectedIds.length === 0 || loading || moving || movingId !== null}
            className={[
              "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium",
              "bg-slate-900 text-white hover:bg-slate-800",
              "disabled:cursor-not-allowed disabled:bg-slate-300",
            ].join(" ")}
          >
            Movimiento masivo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3">Paquete</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estante</th>
                <th className="px-4 py-3">Nuevo estante</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-sm text-slate-600">
                    No hay paquetes para el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const valorSeleccionado = individualDestinos[r.id] ?? r.estante ?? "";
                  const estanteActual = r.estante.trim() || "";
                  const cambioPendiente = valorSeleccionado.trim() !== estanteActual;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelected(r.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {r.nombre?.trim() ? r.nombre : "(Sin nombre)"}
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-slate-500">
                            ID: {r.id}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                            empresaBadgeClass(r.empresa),
                          ].join(" ")}
                        >
                          {r.empresa || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                            tipoBadgeClass(r.tipo),
                          ].join(" ")}
                        >
                          {r.tipo}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                          title="Estante actual"
                        >
                          {r.estante?.trim() ? r.estante : "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="h-10 min-w-[170px] rounded-md border bg-white px-3 text-sm"
                            value={valorSeleccionado}
                            onChange={(e) => updateIndividualDestino(r.id, e.target.value)}
                          >
                            <option value="">Seleccionar</option>
                            {estantesDisponibles.map((estante) => (
                              <option key={estante} value={estante}>
                                {estante}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => moverIndividual(r.id, r.estante)}
                            disabled={loading || moving || movingId !== null || !cambioPendiente}
                            className={[
                              "inline-flex h-10 w-28 items-center justify-center rounded-md px-3 text-sm font-medium",
                              "border bg-white text-slate-900 hover:bg-slate-50",
                              "disabled:cursor-not-allowed disabled:text-slate-400",
                            ].join(" ")}
                          >
                            {movingId === r.id ? "Moviendo..." : "Mover"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Seleccionados: {selectedIds.length}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Total visibles: {filteredRows.length}
          </span>
        </div>
      </div>

      {massiveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Movimiento masivo</h3>
            <p className="mt-1 text-sm text-slate-600">
              Vas a mover {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "paquete" : "paquetes"}.
            </p>

            <div className="mt-4 space-y-1">
              <label className="text-sm font-medium">Estante destino</label>
              <select
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                value={massiveDestino}
                onChange={(e) => setMassiveDestino(e.target.value)}
              >
                <option value="">Seleccionar estante</option>
                {ESTANTES.map((estante) => (
                  <option key={estante} value={estante}>
                    {estante}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setMassiveOpen(false);
                  setMassiveDestino("");
                }}
                className="inline-flex h-10 items-center justify-center rounded-md border bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void moverSeleccionados(massiveDestino)}
                disabled={!massiveDestino.trim() || moving}
                className={[
                  "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium",
                  "bg-slate-900 text-white hover:bg-slate-800",
                  "disabled:cursor-not-allowed disabled:bg-slate-300",
                ].join(" ")}
              >
                {moving ? "Moviendo..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}