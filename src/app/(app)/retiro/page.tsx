"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import type { PackageDoc, Tipo, Empresa, EstadoPackage } from "@/types/package";

function isTipo(v: unknown): v is Tipo {
  return v === "entrega" || v === "envio";
}

function isEmpresa(v: unknown): v is Empresa {
  return v === "SEUR" || v === "TIPSA";
}

type Row = {
  id: string;
  nombre: string;
  tipo: Tipo | "-";
  empresa: Empresa | "-";
  estado: EstadoPackage;
};

function estadoLabel(estado: EstadoPackage) {
  switch (estado) {
    case "EN_DEPOSITO":
      return "En depósito";
    case "PENDIENTE_DEVOLUCION":
      return "Pendiente devolución";
    case "ENTREGADO":
      return "Entregado";
    case "DEVUELTO":
      return "Devuelto";
    default:
      return estado;
  }
}

function estadoBadgeClass(estado: EstadoPackage) {
  switch (estado) {
    case "EN_DEPOSITO":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    case "PENDIENTE_DEVOLUCION":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    case "ENTREGADO":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "DEVUELTO":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  }
}

function empresaBadgeClass(empresa: Empresa | "-") {
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

function Alert({ msg }: { msg: string }) {
  const isError = msg.trim().startsWith("❌");
  const cls = isError
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{msg}</div>
  );
}

export default function RetiroPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    void cargarPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarPendientes() {
    setLoading(true);
    setMensaje("");

    try {
      const q = query(
        collection(db, "packages"),
        where("estado", "in", ["EN_DEPOSITO", "PENDIENTE_DEVOLUCION"]),
        orderBy("updatedAt", "desc"),
        limit(200),
      );

      const snap = await getDocs(q);

      const list: Row[] = snap.docs
        .map((d) => {
          const data = d.data() as PackageDoc;

          const tipo: Tipo | "-" = isTipo(data.tipo) ? data.tipo : "-";
          const empresa: Empresa | "-" = isEmpresa(data.empresa) ? data.empresa : "-";

          return {
            id: d.id,
            nombre: data.nombre ?? "",
            tipo,
            empresa,
            estado: data.estado,
          };
        })
        .filter(
          (r) =>
            (r.estado === "EN_DEPOSITO" && r.tipo === "envio") ||
            r.estado === "PENDIENTE_DEVOLUCION",
        );

      setRows(list);
      if (!list.length)
        setMensaje("No hay paquetes pendientes para retiro del transportista.");
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error cargando pendientes.");
    } finally {
      setLoading(false);
    }
  }

  const cantidad = useMemo(() => rows.length, [rows]);

  async function marcarLoteRetirado() {
    if (!rows.length) {
      setMensaje("No hay nada para marcar.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      rows.forEach((r) => {
        const ref = doc(db, "packages", r.id);

        if (r.estado === "PENDIENTE_DEVOLUCION") {
          batch.update(ref, {
            estado: "DEVUELTO",
            devueltoAt: now,
            updatedAt: now,
          });
        } else {
          // EN_DEPOSITO + tipo envio
          batch.update(ref, {
            estado: "ENTREGADO",
            fechaSalida: now,
            updatedAt: now,
          });
        }
      });

      await batch.commit();

      setMensaje(`✅ Retiro registrado: ${rows.length} paquetes retirados.`);
      await cargarPendientes();
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error al registrar el retiro del lote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Retiro por lote
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Lista de paquetes listos para entregar al transportista y registrar el retiro del lote.
        </p>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-700">
            <span className="text-slate-600">Pendientes: </span>
            <span className="font-semibold text-slate-900">{cantidad}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={cargarPendientes}
              disabled={loading}
              className={[
                "inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium",
                "border bg-white text-slate-900 hover:bg-slate-50",
                "disabled:cursor-not-allowed disabled:text-slate-400",
              ].join(" ")}
            >
              {loading ? "Cargando..." : "Actualizar"}
            </button>

            <button
              onClick={marcarLoteRetirado}
              disabled={loading || rows.length === 0}
              className={[
                "inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium",
                "bg-slate-900 text-white hover:bg-slate-800",
                "disabled:cursor-not-allowed disabled:bg-slate-300",
              ].join(" ")}
              title="Marca el lote como retirado y actualiza estados (batch)"
            >
              Marcar lote como retirado
            </button>
          </div>
        </div>

        {mensaje ? <div className="mt-3"><Alert msg={mensaje} /></div> : null}
      </div>

      {/* Table */}
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Paquete</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Empresa</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  {/* Paquete: nombre + id */}
                  <td className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">
                          {r.nombre?.trim() ? r.nombre : "(Sin nombre)"}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500">
                          ID: {r.id}
                        </div>
                      </div>

                     
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        estadoBadgeClass(r.estado),
                      ].join(" ")}
                      title={r.estado}
                    >
                      {estadoLabel(r.estado)}
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
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        empresaBadgeClass(r.empresa),
                      ].join(" ")}
                    >
                      {r.empresa}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Empty state (when not loading and no rows and no mensaje) */}
      {!loading && rows.length === 0 && !mensaje ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
          No hay paquetes para mostrar.
        </div>
      ) : null}
    </div>
  );
}