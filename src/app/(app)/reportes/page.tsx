"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import type { PackageDoc } from "@/types/package";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function startOfNextMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}

export default function ReportesPage() {
  const [monthValue, setMonthValue] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  });

  const [loading, setLoading] = useState(false);
  const [ingresos, setIngresos] = useState<Record<string, number>>({});
  const [egresos, setEgresos] = useState<Record<string, number>>({});
  const [mensaje, setMensaje] = useState("");

  const { from, to } = useMemo(() => {
    const [y, m] = monthValue.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return { from: startOfMonth(d), to: startOfNextMonth(d) };
  }, [monthValue]);

  const cargar = async () => {
    setLoading(true);
    setMensaje("");

    try {
      const packagesRef = collection(db, "packages");

      const qIngresos = query(
        packagesRef,
        where("fechaIngreso", ">=", Timestamp.fromDate(from)),
        where("fechaIngreso", "<", Timestamp.fromDate(to)),
      );

      const qEntregados = query(
        packagesRef,
        where("entregadoAt", ">=", Timestamp.fromDate(from)),
        where("entregadoAt", "<", Timestamp.fromDate(to)),
      );

      const qDevueltos = query(
        packagesRef,
        where("devueltoAt", ">=", Timestamp.fromDate(from)),
        where("devueltoAt", "<", Timestamp.fromDate(to)),
      );

      const [snapIngresos, snapEntregados, snapDevueltos] = await Promise.all([
        getDocs(qIngresos),
        getDocs(qEntregados),
        getDocs(qDevueltos),
      ]);

      const ing: Record<string, number> = {
        entrega: 0,
        envio: 0,
        total: 0,
      };

      snapIngresos.forEach((docSnap) => {
        const data = docSnap.data() as PackageDoc;
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
      setMensaje("❌ Error cargando reportes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthValue]);

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <h1>Reportes Mensuales</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
        <div>
          <label>Mes</label>
          <br />
          <input
            type="month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
          />
        </div>

        <button onClick={cargar} disabled={loading}>
          {loading ? "Cargando..." : "Recargar"}
        </button>
      </div>

      {mensaje ? <p>{mensaje}</p> : null}

      <hr />

      <h2>Ingresos (por Tipo)</h2>
      <ul>
        <li>Entrega: {ingresos.entrega ?? 0}</li>
        <li>Envío: {ingresos.envio ?? 0}</li>
        <li>
          <b>Total ingresos:</b> {ingresos.total ?? 0}
        </li>
      </ul>

      <h2>Egresos (por Estado)</h2>
      <ul>
        <li>Entregado: {egresos.ENTREGADO ?? 0}</li>
        <li>Devuelto: {egresos.DEVUELTO ?? 0}</li>
        <li>
          <b>Total egresos:</b> {egresos.total ?? 0}
        </li>
      </ul>

      <hr />

      <p style={{ fontSize: 12, opacity: 0.75 }}>
        Nota: ingresos se calculan por <code>fechaIngreso</code> y egresos por
        <code> entregadoAt/devueltoAt</code>.
      </p>
    </div>
  );
}
