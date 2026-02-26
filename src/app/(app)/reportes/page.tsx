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
    return `${yyyy}-${mm}`; // input type="month"
  });

  const [loading, setLoading] = useState(false);
  const [ingresos, setIngresos] = useState<Record<string, number>>({});
  const [retiros, setRetiros] = useState<Record<string, number>>({});
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

      // Ingresos del mes (por fechaIngreso)
      const qIngresos = query(
        packagesRef,
        where("fechaIngreso", ">=", Timestamp.fromDate(from)),
        where("fechaIngreso", "<", Timestamp.fromDate(to))
      );

      // Retiros del mes (por fechaSalida)
      const qRetiros = query(
        packagesRef,
        where("fechaSalida", ">=", Timestamp.fromDate(from)),
        where("fechaSalida", "<", Timestamp.fromDate(to))
      );

      const [snapIngresos, snapRetiros] = await Promise.all([
        getDocs(qIngresos),
        getDocs(qRetiros),
      ]);

      const ing: Record<string, number> = {
        entrega: 0,
        envio: 0,
        devolucion: 0,
        total: 0,
      };

      snapIngresos.forEach((doc) => {
        const data = doc.data() as PackageDoc;
        const t = data.tipo;
        if (t) ing[t] = (ing[t] ?? 0) + 1;
        ing.total += 1;
      });

      const ret: Record<string, number> = {
        cliente: 0,
        transportista: 0,
        total: 0,
      };

      snapRetiros.forEach((doc) => {
        const data = doc.data() as PackageDoc;
        const r = data.resultadoRetiro;
        if (r) ret[r] = (ret[r] ?? 0) + 1;
        ret.total += 1;
      });

      setIngresos(ing);
      setRetiros(ret);
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error cargando reportes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar automáticamente al entrar o al cambiar el mes
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
        <li>Devolución: {ingresos.devolucion ?? 0}</li>
        <li>
          <b>Total ingresos:</b> {ingresos.total ?? 0}
        </li>
      </ul>

      <h2>Retiros (por Resultado)</h2>
      <ul>
        <li>Retirado por cliente: {retiros.cliente ?? 0}</li>
        <li>Retirado por transportista: {retiros.transportista ?? 0}</li>
        <li>
          <b>Total retiros:</b> {retiros.total ?? 0}
        </li>
      </ul>

      <hr />

      <p style={{ fontSize: 12, opacity: 0.75 }}>
        Nota: ingresos se calculan por <code>fechaIngreso</code> y retiros por{" "}
        <code>fechaSalida</code>.
      </p>
    </div>
  );
}