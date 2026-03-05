"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import type { Empresa, EstadoPackage, PackageDoc, Tipo } from "@/types/package";

type PackageDebugRow = {
  id: string;
  barcode: string;
  nombre: string;
  empresa: Empresa | "-";
  tipo: Tipo | "-";
  estado: EstadoPackage | "-";
  estante: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  marcadoDevolucionAt: Timestamp | Date | null;
  caducado: boolean | null;
  raw: DocumentData;
};

const ESTADOS: EstadoPackage[] = [
  "EN_DEPOSITO",
  "PENDIENTE_DEVOLUCION",
  "ENTREGADO",
  "DEVUELTO",
];

const TIPOS: Tipo[] = ["entrega", "envio"];
const EMPRESAS: Empresa[] = ["SEUR", "TIPSA"];

function isEstado(value: unknown): value is EstadoPackage {
  return typeof value === "string" && ESTADOS.includes(value as EstadoPackage);
}

function isTipo(value: unknown): value is Tipo {
  return typeof value === "string" && TIPOS.includes(value as Tipo);
}

function isEmpresa(value: unknown): value is Empresa {
  return typeof value === "string" && EMPRESAS.includes(value as Empresa);
}

function getTimestamp(value: unknown): Timestamp | null {
  if (value && typeof value === "object" && "toDate" in value) {
    return value as Timestamp;
  }
  return null;
}

function toDateValue(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toDate" in value) {
    return value.toDate();
  }
  return null;
}

function mapDoc(snap: QueryDocumentSnapshot<DocumentData>): PackageDebugRow {
  const data = snap.data() as PackageDoc & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    marcadoDevolucionAt?: Timestamp | Date | null;
    barcode?: string;
    caducado?: boolean;
  };

  return {
    id: snap.id,
    barcode: typeof data.barcode === "string" ? data.barcode : snap.id,
    nombre: data.nombre ?? "",
    empresa: isEmpresa(data.empresa) ? data.empresa : "-",
    tipo: isTipo(data.tipo) ? data.tipo : "-",
    estado: isEstado(data.estado) ? data.estado : "-",
    estante: data.estante ?? "",
    createdAt: getTimestamp(data.createdAt),
    updatedAt: getTimestamp(data.updatedAt),
    marcadoDevolucionAt: data.marcadoDevolucionAt ?? null,
    caducado: typeof data.caducado === "boolean" ? data.caducado : null,
    raw: data,
  };
}

function formatShortDate(ts: Timestamp | null): string {
  if (!ts) return "-";
  const d = ts.toDate();

  // Formato: dd/MM HH:mm (ej: 05/03 13:35)
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

function detailValueToText(value: unknown): string {
  if (value === null || value === undefined) return "-";

  const dateValue = toDateValue(value as Timestamp | Date | null | undefined);
  if (dateValue) return dateValue.toLocaleString();

  if (typeof value === "string") return value.trim() ? value : "-";
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return "-";
}

function estadoBadgeClass(estado: EstadoPackage | "-") {
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

function tipoBadgeClass(tipo: Tipo | "-") {
  switch (tipo) {
    case "entrega":
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
    case "envio":
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
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

export default function DebugPackagesView({ title = "Paquetes" }: { title?: string }) {
  const [rows, setRows] = useState<PackageDebugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [estadoFilter, setEstadoFilter] = useState<EstadoPackage | "ALL">("ALL");
  const [tipoFilter, setTipoFilter] = useState<Tipo | "ALL">("ALL");
  const [empresaFilter, setEmpresaFilter] = useState<Empresa | "ALL">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "packages"), orderBy("createdAt", "desc"), limit(200));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map(mapDoc));
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setMessage("❌ Error escuchando paquetes.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const tokens = term ? term.split(/\s+/).filter(Boolean) : [];

    return rows.filter((row) => {
      if (estadoFilter !== "ALL" && row.estado !== estadoFilter) return false;
      if (tipoFilter !== "ALL" && row.tipo !== tipoFilter) return false;
      if (empresaFilter !== "ALL" && row.empresa !== empresaFilter) return false;

      if (!tokens.length) return true;

      // Seguimos buscando por barcode/id aunque no lo mostremos (útil)
      const haystack = [
        row.id,
        row.barcode,
        row.nombre,
        row.estante,
        row.estado,
        row.tipo,
        row.empresa,
      ]
        .join(" ")
        .toLowerCase();

      return tokens.every((t) => haystack.includes(t));
    });
  }, [rows, estadoFilter, tipoFilter, empresaFilter, search]);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  return (
    <div className="space-y-4">
 
      {/* Filters */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value as EstadoPackage | "ALL")}
        >
          <option value="ALL">Estado: todos</option>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as Tipo | "ALL")}
        >
          <option value="ALL">Tipo: todos</option>
          {TIPOS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={empresaFilter}
          onChange={(e) => setEmpresaFilter(e.target.value as Empresa | "ALL")}
        >
          <option value="ALL">Empresa: todas</option>
          {EMPRESAS.map((empresa) => (
            <option key={empresa} value={empresa}>
              {empresa}
            </option>
          ))}
        </select>

        <input
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, estante, estado..."
        />
      </div>

      {/* Status */}
      {loading ? (
        <div className="rounded-md border bg-white px-3 py-2 text-sm text-slate-700">
          Cargando...
        </div>
      ) : null}

      {message ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </div>
      ) : null}

      {/* Table + Detail */}
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* Table */}
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const isSelected = selectedId === row.id;

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={[
                      "cursor-pointer hover:bg-slate-50",
                      isSelected ? "bg-slate-100" : "bg-white",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {row.nombre?.trim() ? row.nombre : "-"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Estante: {row.estante?.trim() ? row.estante : "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          estadoBadgeClass(row.estado),
                        ].join(" ")}
                      >
                        {row.estado}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          tipoBadgeClass(row.tipo),
                        ].join(" ")}
                      >
                        {row.tipo}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          empresaBadgeClass(row.empresa),
                        ].join(" ")}
                      >
                        {row.empresa}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {formatShortDate(row.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail */}
        <div className="rounded-xl border bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Detalle</h3>

          {selected ? (
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="inline font-semibold">ID: </dt>
                <dd className="inline m-0">{detailValueToText(selected.raw.barcode)}</dd>
              </div>

              <div>
                <dt className="inline font-semibold">Empresa: </dt>
                <dd className="inline m-0">{detailValueToText(selected.raw.empresa)}</dd>
              </div>

              <div>
                <dt className="inline font-semibold">Estado: </dt>
                <dd className="inline m-0">{detailValueToText(selected.raw.estado)}</dd>
              </div>

              <div>
                <dt className="inline font-semibold">Estante: </dt>
                <dd className="inline m-0">{detailValueToText(selected.raw.estante)}</dd>
              </div>

              <div>
                <dt className="inline font-semibold">Fecha de ingreso: </dt>
                <dd className="inline m-0">{detailValueToText(selected.raw.fechaIngreso)}</dd>
              </div>

              <div>
                <dt className="inline font-semibold">Nombre: </dt>
                <dd className="inline m-0">{detailValueToText(selected.raw.nombre)}</dd>
              </div>

              <div>
                <dt className="inline font-semibold">Tipo: </dt>
                <dd className="inline m-0">{detailValueToText(selected.raw.tipo)}</dd>
              </div>

              <div>
                <dt className="inline font-semibold">Fecha entrega a cliente: </dt>
                <dd className="inline m-0">{detailValueToText(selected.raw.entregadoAt)}</dd>
              </div>

              <div>
                <dt className="inline font-semibold">Fecha entrega a repartidor: </dt>
                <dd className="inline m-0">
                  {detailValueToText(selected.raw.devueltoAt ?? selected.raw.fechaSalida)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Seleccioná un paquete para ver el detalle.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}