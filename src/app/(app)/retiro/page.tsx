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
import type { PackageDoc, Tipo } from "@/types/package";

function isTipo(v: unknown): v is Tipo {
  return v === "entrega" || v === "envio";
}

type Row = {
  id: string;
  nombre: string;
  estante: string;
  tipo: Tipo | "-";
  empresa: string;
  estado: PackageDoc["estado"];
};

export default function RetiroPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    void cargarPendientes();
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

          return {
            id: d.id,
            nombre: data.nombre ?? "",
            estante: data.estante ?? "",
            tipo,
            empresa: data.empresa ?? "",
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
        setMensaje("No hay paquetes pendientes de devolución para retiro.");
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

      setMensaje(
        `✅ Retiro registrado: ${rows.length} paquetes retirados por transportista.`,
      );
      await cargarPendientes();
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error al registrar el retiro del lote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Retiro (Transportista)</h1>

      <div style={{ marginBottom: 12 }}>
        <button onClick={cargarPendientes} disabled={loading}>
          {loading ? "Cargando..." : "Actualizar"}
        </button>{" "}
        <button
          onClick={marcarLoteRetirado}
          disabled={loading || rows.length === 0}
        >
          Marcar lote como retirado
        </button>
      </div>

      <p>
        <b>Pendientes:</b> {cantidad}
      </p>

      {rows.length > 0 && (
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
                Estante
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Tipo
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Empresa
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td
                  style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
                >
                  {r.id}
                </td>
                <td
                  style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
                >
                  {r.nombre || "-"}
                </td>
                <td
                  style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
                >
                  {r.estante || "-"}
                </td>
                <td
                  style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
                >
                  {r.tipo}
                </td>
                <td
                  style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}
                >
                  {r.empresa || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mensaje && <p style={{ marginTop: 12 }}>{mensaje}</p>}
    </div>
  );
}
