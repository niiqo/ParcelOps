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

type Row = {
  id: string; // barcode (doc.id)
  nombre: string;
  estante: string;
  tipo: "envio" | "devolucion";
  empresa: string;
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
        where("tipo", "in", ["envio", "devolucion"]),
        where("fechaSalida", "==", null),
        orderBy("createdAt", "desc"),
        limit(200)
      );

      const snap = await getDocs(q);

      const list: Row[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          nombre: (data.nombre ?? "").toString(),
          estante: (data.estante ?? "").toString(),
          tipo: data.tipo,
          empresa: (data.empresa ?? "").toString(),
        };
      });

      setRows(list);
      if (!list.length) setMensaje("No hay envíos/devoluciones pendientes para retiro.");
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
        batch.update(ref, {
          resultadoRetiro: "transportista",
          fechaSalida: now,
          updatedAt: now,
        });
      });

      await batch.commit();

      setMensaje(`✅ Retiro registrado: ${rows.length} paquetes entregados al transportista.`);
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
        <button onClick={marcarLoteRetirado} disabled={loading || rows.length === 0}>
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
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Barcode</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Nombre</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Estante</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Tipo</th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Empresa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>{r.id}</td>
                <td style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>{r.nombre || "-"}</td>
                <td style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>{r.estante || "-"}</td>
                <td style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>{r.tipo}</td>
                <td style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>{r.empresa || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mensaje && <p style={{ marginTop: 12 }}>{mensaje}</p>}
    </div>
  );
}