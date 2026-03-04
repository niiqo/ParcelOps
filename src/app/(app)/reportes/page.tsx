"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import type { PackageDoc } from "@/types/package";

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function getMinusDaysDateValue(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function getTimestampRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59.999`);

  return {
    start,
    end,
    startTimestamp: Timestamp.fromDate(start),
    endTimestamp: Timestamp.fromDate(end),
  };
}

export default function ReportesPage() {
  const [startDate, setStartDate] = useState(() => getMinusDaysDateValue(30));
  const [endDate, setEndDate] = useState(getTodayDateValue);
  const [loading, setLoading] = useState(false);
  const [ingresos, setIngresos] = useState<Record<string, number>>({});
  const [egresos, setEgresos] = useState<Record<string, number>>({});
  const [mensaje, setMensaje] = useState("");

  const cargar = async () => {
    if (!startDate || !endDate) {
      setMensaje("⚠️ Debes seleccionar Fecha de inicio y Fecha de fin.");
      return;
    }

    const { start, end, startTimestamp, endTimestamp } = getTimestampRange(
      startDate,
      endDate,
    );

    if (start > end) {
      setMensaje("⚠️ La Fecha de inicio no puede ser mayor a la Fecha de fin.");
      return;
    }

    setLoading(true);
    setMensaje("");

    try {
      const packagesRef = collection(db, "packages");

      const qIngresosFechaIngreso = query(
        packagesRef,
        where("fechaIngreso", ">=", startTimestamp),
        where("fechaIngreso", "<=", endTimestamp),
      );

      const qIngresosCreatedAt = query(
        packagesRef,
        where("createdAt", ">=", startTimestamp),
        where("createdAt", "<=", endTimestamp),
      );

      const qEntregados = query(
        packagesRef,
        where("entregadoAt", ">=", startTimestamp),
        where("entregadoAt", "<=", endTimestamp),
      );

      const qDevueltos = query(
        packagesRef,
        where("devueltoAt", ">=", startTimestamp),
        where("devueltoAt", "<=", endTimestamp),
      );

      const [
        snapIngresosFechaIngreso,
        snapIngresosCreatedAt,
        snapEntregados,
        snapDevueltos,
      ] = await Promise.all([
        getDocs(qIngresosFechaIngreso),
        getDocs(qIngresosCreatedAt),
        getDocs(qEntregados),
        getDocs(qDevueltos),
      ]);

      const ing: Record<string, number> = {
        entrega: 0,
        envio: 0,
        total: 0,
      };

      const ingresosPorId = new Map<string, PackageDoc>();

      const mergeIngresos = (snap: QuerySnapshot<DocumentData>) => {
        snap.forEach((docSnap) => {
          ingresosPorId.set(docSnap.id, docSnap.data() as PackageDoc);
        });
      };

      mergeIngresos(snapIngresosFechaIngreso);
      mergeIngresos(snapIngresosCreatedAt);

      ingresosPorId.forEach((data) => {
        const t = data.tipo;
        if (t) ing[t] = (ing[t] ?? 0) + 1;
        ing.total += 1;
      });

      const egr: Record<string, number> = {
        ENTREGADO: snapEntregados.size,
        DEVUELTO: snapDevueltos.size,
        total: snapEntregados.size + snapDevueltos.size,
      };

      setIngresos(ing);
      setEgresos(egr);
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error cargando reporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <h1>Reporte</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <label>Fecha de inicio</label>
          <br />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label>Fecha de fin</label>
          <br />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button onClick={cargar} disabled={loading}>
          {loading ? "Cargando..." : "Recargar"}
        </button>
      </div>

      {mensaje ? <p>{mensaje}</p> : null}

      <hr />

      <h2>Ingresos</h2>
      <ul>
        <li>Entrega: {ingresos.entrega ?? 0}</li>
        <li>Envío: {ingresos.envio ?? 0}</li>
        <li>
          <b>Total ingresos:</b> {ingresos.total ?? 0}
        </li>
      </ul>

      <h2>Egresos</h2>
      <ul>
        <li>Entregado a cliente: {egresos.ENTREGADO ?? 0}</li>
        <li>Devuelto a repartidor: {egresos.DEVUELTO ?? 0}</li>
        <li>
          <b>Total egresos:</b> {egresos.total ?? 0}
        </li>
      </ul>

      <hr />

      <p style={{ fontSize: 12, opacity: 0.75 }}>
        Nota: ingresos se calculan por <code>fechaIngreso</code> (o
        <code> createdAt</code>) y egresos por
        <code> entregadoAt/devueltoAt</code>.
      </p>
    </div>
  );
}
