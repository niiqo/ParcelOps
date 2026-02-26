"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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
const EMPRESAS: Empresa[] = ["SEUR"];

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

function mapDoc(snap: QueryDocumentSnapshot<DocumentData>): PackageDebugRow {
  const data = snap.data() as PackageDoc & {
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
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
    caducado: typeof data.caducado === "boolean" ? data.caducado : null,
    raw: data,
  };
}

function tsToText(ts: Timestamp | null): string {
  if (!ts) return "-";
  return ts.toDate().toLocaleString();
}

export default function DebugPackagesPage() {
  const [rows, setRows] = useState<PackageDebugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [estadoFilter, setEstadoFilter] = useState<EstadoPackage | "ALL">("ALL");
  const [tipoFilter, setTipoFilter] = useState<Tipo | "ALL">("ALL");
  const [empresaFilter, setEmpresaFilter] = useState<Empresa | "ALL">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "packages"),
      orderBy("createdAt", "desc"),
      limit(200),
    );

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

  const updateEstado = async (
    id: string,
    estado: Extract<
      EstadoPackage,
      "ENTREGADO" | "EN_DEPOSITO" | "PENDIENTE_DEVOLUCION"
    >,
  ) => {
    setMessage("");
    try {
      await updateDoc(doc(db, "packages", id), {
        estado,
        updatedAt: serverTimestamp(),
      });
      setMessage(`✅ Estado actualizado a ${estado}.`);
    } catch (error) {
      console.error(error);
      setMessage("❌ No se pudo actualizar estado.");
    }
  };

  const toggleCaducado = async (row: PackageDebugRow) => {
    if (!("caducado" in row.raw)) return;

    const current = typeof row.raw.caducado === "boolean" ? row.raw.caducado : false;
    setMessage("");

    try {
      await updateDoc(doc(db, "packages", row.id), {
        caducado: !current,
        updatedAt: serverTimestamp(),
      });
      setMessage(`✅ caducado: ${!current}`);
    } catch (error) {
      console.error(error);
      setMessage("❌ No se pudo actualizar caducado.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Debug paquetes</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <select
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por barcode, nombre, estado..."
        />
      </div>

      {loading ? <p>Cargando...</p> : null}
      {message ? <p>{message}</p> : null}

      <p>Total: {filtered.length}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 12 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                  Barcode
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                  Nombre
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                  Estado
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                  Tipo
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                  Empresa
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                  Caducado
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  style={{
                    cursor: "pointer",
                    background: selectedId === row.id ? "#eef4ff" : "transparent",
                  }}
                >
                  <td style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                    {row.barcode || "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                    {row.nombre || "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                    {row.estado}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                    {row.tipo}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                    {row.empresa}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                    {row.caducado === null ? "-" : row.caducado ? "true" : "false"}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                    {tsToText(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
          <h3 style={{ marginTop: 0 }}>Detalle</h3>
          {selected ? (
            <>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
              >
                <button onClick={() => updateEstado(selected.id, "ENTREGADO")}>
                  ENTREGADO
                </button>
                <button onClick={() => updateEstado(selected.id, "EN_DEPOSITO")}>
                  EN_DEPOSITO
                </button>
                <button
                  onClick={() => updateEstado(selected.id, "PENDIENTE_DEVOLUCION")}
                >
                  PENDIENTE_DEVOLUCION
                </button>
                {"caducado" in selected.raw ? (
                  <button onClick={() => toggleCaducado(selected)}>
                    Toggle caducado (
                    {selected.caducado === null ? "-" : String(selected.caducado)})
                  </button>
                ) : null}
              </div>

              <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", margin: 0 }}>
                {JSON.stringify(selected.raw, null, 2)}
              </pre>
              <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                updatedAt: {tsToText(selected.updatedAt)}
              </p>
            </>
          ) : (
            <p>Seleccioná un paquete para ver JSON.</p>
          )}
        </div>
      </div>
    </div>
  );
}
