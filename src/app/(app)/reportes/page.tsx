"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import type { PackageDoc } from "@/types/package";
import { useNotification } from "@/components/notifications/NotificationProvider";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import MonthBarChart from "@/components/reportes/MonthBarChart";

type ChartPoint = {
  dia: string;
  cantidad: number;
};

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

function getMonthRange(monthValue: string) {
  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  return {
    start,
    end,
    startTimestamp: Timestamp.fromDate(start),
    endTimestamp: Timestamp.fromDate(end),
  };
}

function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function buildMonthDaysBase(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => ({
    dia: String(index + 1).padStart(2, "0"),
    cantidad: 0,
  }));
}

function buildDailySeriesFromFechaIngreso(
  docs: PackageDoc[],
  date = new Date(),
): ChartPoint[] {
  const base = buildMonthDaysBase(date);

  docs.forEach((doc) => {
    const fecha = doc.fechaIngreso;
    if (!fecha) return;

    const jsDate = fecha.toDate();
    const dia = jsDate.getDate();
    const index = dia - 1;

    if (index >= 0 && index < base.length) {
      base[index].cantidad += 1;
    }
  });

  return base;
}

function Alert({ msg }: { msg: string }) {
  const isError = msg.trim().startsWith("❌");
  const isWarn = msg.trim().startsWith("⚠️");
  const cls = isError
    ? "border-red-200 bg-red-50 text-red-800"
    : isWarn
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{msg}</div>
  );
}

function StatCard({
  title,
  items,
  totalLabel,
  totalValue,
  badge,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  totalLabel: string;
  totalValue: number;
  badge: { text: string; className: string };
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span
          className={[
            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
            badge.className,
          ].join(" ")}
        >
          {badge.text}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-slate-600">{it.label}</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {it.value}
            </span>
          </div>
        ))}

        <div className="mt-3 border-t pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-900">{totalLabel}</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {totalValue}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-slate-100/80 backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-sm animate-pulse">
          PO
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <span>Cargando reporte...</span>
        </div>
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const notify = useNotification();
  const didInitialLoadRef = useRef(false);

  const [startDate, setStartDate] = useState(() => getMinusDaysDateValue(30));
  const [endDate, setEndDate] = useState(getTodayDateValue);
  const [loading, setLoading] = useState(true);

  const [ingresos, setIngresos] = useState<Record<string, number>>({
    entrega: 0,
    envio: 0,
    total: 0,
  });

  const [egresos, setEgresos] = useState<Record<string, number>>({
    ENTREGADO: 0,
    DEVUELTO: 0,
    total: 0,
  });

  const [entregadosPorDia, setEntregadosPorDia] = useState<ChartPoint[]>([]);
  const [recibidosPorDia, setRecibidosPorDia] = useState<ChartPoint[]>([]);

  const [mensaje, setMensaje] = useState("");

  const rangoLabel = useMemo(() => {
    if (!startDate || !endDate) return "Rango sin definir";
    const [y1, m1, d1] = startDate.split("-");
    const [y2, m2, d2] = endDate.split("-");
    return `${d1}/${m1}/${y1} → ${d2}/${m2}/${y2}`;
  }, [startDate, endDate]);

  const cargar = async (options?: { silentSuccess?: boolean }) => {
    if (!startDate || !endDate) {
      notify.warning("Debes seleccionar Fecha de inicio y Fecha de fin.");
      return;
    }

    const { start, end, startTimestamp, endTimestamp } = getTimestampRange(
      startDate,
      endDate,
    );

    if (start > end) {
      notify.warning(
        "La Fecha de inicio no puede ser mayor a la Fecha de fin.",
      );
      return;
    }

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

      if (!options?.silentSuccess) {
        notify.success("Reporte actualizado.");
      }
    } catch (e) {
      console.error(e);
      setMensaje("❌ Error cargando reporte.");
    }
  };

  const cargarGraficosMesActual = async () => {
    try {
      const { startTimestamp, endTimestamp } = getMonthRange();
      const packagesRef = collection(db, "packages");

      const qRecibidos = query(
        packagesRef,
        where("tipo", "==", "entrega"),
        where("fechaIngreso", ">=", startTimestamp),
        where("fechaIngreso", "<=", endTimestamp),
      );

      const qEntregados = query(
        packagesRef,
        where("tipo", "==", "entrega"),
        where("estado", "==", "ENTREGADO"),
        where("fechaIngreso", ">=", startTimestamp),
        where("fechaIngreso", "<=", endTimestamp),
      );

      const [snapRecibidos, snapEntregados] = await Promise.all([
        getDocs(qRecibidos),
        getDocs(qEntregados),
      ]);

      const recibidosDocs = snapRecibidos.docs.map(
        (docSnap) => docSnap.data() as PackageDoc,
      );

      const entregadosDocs = snapEntregados.docs.map(
        (docSnap) => docSnap.data() as PackageDoc,
      );

      setRecibidosPorDia(buildDailySeriesFromFechaIngreso(recibidosDocs));
      setEntregadosPorDia(buildDailySeriesFromFechaIngreso(entregadosDocs));
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error cargando gráficos del mes.");
    }
  };

  const cargarTodoInicial = async () => {
    setLoading(true);
    setMensaje("");

    try {
      await Promise.all([
        cargar({ silentSuccess: true }),
        cargarGraficosMesActual(),
      ]);
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error cargando el informe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;
    void cargarTodoInicial();
  }, []);

  return (
    <div className="relative">
      {loading ? <LoadingOverlay /> : null}

      <div
        className={`space-y-4 ${loading ? "pointer-events-none select-none opacity-60" : ""}`}
      >
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-slate-900">Reportes</h2>
          <p className="mt-1 text-sm text-slate-600">
            Resumen de ingresos y egresos por rango de fechas.
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha de inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha de fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <button
              onClick={() => void cargarTodoInicial()}
              disabled={loading}
              className={[
                "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium",
                "bg-slate-900 text-white hover:bg-slate-800",
                "disabled:cursor-not-allowed disabled:bg-slate-300",
              ].join(" ")}
              title="Recargar conteos para el rango"
            >
              {loading ? "Cargando..." : "Recargar"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {rangoLabel}
            </span>

            <span className="text-xs text-slate-500">
              Tip: por defecto muestra últimos 30 días.
            </span>
          </div>

          {mensaje ? (
            <div className="mt-3">
              <Alert msg={mensaje} />
            </div>
          ) : null}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="Ingresos"
            badge={{
              text: "Altas",
              className: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
            }}
            items={[
              { label: "Entrega", value: ingresos.entrega ?? 0 },
              { label: "Envío", value: ingresos.envio ?? 0 },
            ]}
            totalLabel="Total ingresos"
            totalValue={ingresos.total ?? 0}
          />

          <StatCard
            title="Egresos"
            badge={{
              text: "Salidas",
              className:
                "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
            }}
            items={[
              { label: "Entregado a cliente", value: egresos.ENTREGADO ?? 0 },
              { label: "Devuelto a repartidor", value: egresos.DEVUELTO ?? 0 },
            ]}
            totalLabel="Total egresos"
            totalValue={egresos.total ?? 0}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <MonthBarChart
            title="Entregados a cliente"
            subtitle="ENTREGA de paquetes del mes actual."
            data={entregadosPorDia}
          />

          <MonthBarChart
            title="Recibidos de repartidor"
            subtitle="INGRESO de paquetes del mes actual."
            data={recibidosPorDia}
          />
        </div>
      </div>
    </div>
  );
}
