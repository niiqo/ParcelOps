"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import type { EstadoPackage, PackageDoc, PackageRow, Empresa, Tipo } from "@/types/package";

const ESTADO_LABEL: Record<EstadoPackage, string> = {
  EN_DEPOSITO: "En depósito",
  PENDIENTE_DEVOLUCION: "Pendiente devolución",
  ENTREGADO: "Entregado",
  DEVUELTO: "Devuelto",
};

const isActive = (estado: EstadoPackage) =>
  estado === "EN_DEPOSITO" || estado === "PENDIENTE_DEVOLUCION";

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

function empresaBadgeClass(empresa?: Empresa) {
  switch (empresa) {
    case "SEUR":
      return "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200";
    case "TIPSA":
      return "bg-fuchsia-50 text-fuchsia-800 ring-1 ring-fuchsia-200";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  }
}

function tipoBadgeClass(tipo?: Tipo) {
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

export default function BusquedaPage() {
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [allActive, setAllActive] = useState<PackageRow[]>([]);
  const [msg, setMsg] = useState("");
  const [includeDelivered, setIncludeDelivered] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const termNorm = useMemo(() => term.trim().toLowerCase(), [term]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const ref = collection(db, "packages");
        const q = query(ref, orderBy("fechaIngreso", "desc"), limit(1000));

        const snap = await getDocs(q);
        const list: PackageRow[] = snap.docs.map((d) => {
          const data = d.data() as PackageDoc;

          const nombre = data.nombre?.trim() || "";
          const nombreLower =
            data.nombreLower?.trim().toLowerCase() || nombre.toLowerCase();

          return {
            barcode: d.id,
            nombre: data.nombre,
            nombreLower,
            empresa: data.empresa,
            tipo: data.tipo,
            estante: data.estante,
            estado: data.estado ?? "EN_DEPOSITO",
          };
        });

        setAllActive(list);
      } catch (e) {
        console.error(e);
        setMsg("❌ Error cargando paquetes activos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let base = allActive;

    // No mostrar paquetes de tipo envío
    base = base.filter((r) => r.tipo !== "envio");

    // Por defecto solo activos
    if (!includeDelivered) {
      base = base.filter((r) => isActive(r.estado));
    }

    if (!termNorm) return base;

    const tokens = termNorm.split(/\s+/).filter(Boolean);
    return base.filter((r) => tokens.every((t) => r.nombreLower.includes(t)));
  }, [allActive, termNorm, includeDelivered]);

  const entregarACliente = async (barcode: string) => {
    setMsg("");
    setBusyId(barcode);

    try {
      const ref = doc(db, "packages", barcode);

      await updateDoc(ref, {
        estado: "ENTREGADO",
        entregadoAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setAllActive((prev) =>
        prev.map((p) =>
          p.barcode === barcode ? { ...p, estado: "ENTREGADO" } : p,
        ),
      );

      setMsg("✅ Entrega registrada.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Error registrando la entrega.");
    } finally {
      setBusyId(null);
    }
  };

  const marcarDevolucion = async (barcode: string) => {
    setMsg("");
    setBusyId(barcode);

    try {
      const ref = doc(db, "packages", barcode);

      await updateDoc(ref, {
        estado: "PENDIENTE_DEVOLUCION",
        marcadoDevolucionAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setAllActive((prev) =>
        prev.map((p) =>
          p.barcode === barcode ? { ...p, estado: "PENDIENTE_DEVOLUCION" } : p,
        ),
      );

      setMsg("✅ Paquete marcado como pendiente de devolución.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Error marcando el paquete como devolución.");
    } finally {
      setBusyId(null);
    }
  };

  const shown = filtered.slice(0, 50);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
       <h2 className="text-base font-semibold text-slate-900">
          Búsqueda y entrega a clientes
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Buscá por nombre y registrá entregas o paquetes caducados.
        </p>
      </div>

      {/* Search + options */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Buscar por nombre / apellido</label>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder='Ej: "nico" o "perez" o "nico perez"'
              className="h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={includeDelivered}
                onChange={(e) => setIncludeDelivered(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Incluir entregados/devueltos
            </label>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Resultados:{" "}
            <span className="font-semibold text-slate-900">{filtered.length}</span>
          </div>

          {loading ? (
            <div className="text-sm text-slate-600">Cargando paquetes…</div>
          ) : null}
        </div>

        {msg ? <div className="mt-3"><Alert msg={msg} /></div> : null}
      </div>

      {/* Results */}
      <div className="grid gap-3">
        {shown.map((r) => {
          const disabledEntregar = busyId === r.barcode || !isActive(r.estado);
          const disabledDevol = 
            busyId === r.barcode ||
            r.estado === "PENDIENTE_DEVOLUCION" ||
            !isActive(r.estado);

          return (
            <div
              key={r.barcode}
              className="rounded-2xl border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Left info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-[20ch] truncate text-base font-semibold text-slate-900">
                        {r.nombre?.trim() ? r.nombre : "(Sin nombre)"}
                    </div>

                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        estadoBadgeClass(r.estado),
                      ].join(" ")}
                      title={r.estado}
                    >
                      {ESTADO_LABEL[r.estado]}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-mono text-slate-500">
                      ID: {r.barcode}
                    </span>

                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        empresaBadgeClass(r.empresa),
                      ].join(" ")}
                    >
                      {r.empresa ?? "-"}
                    </span>

                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        tipoBadgeClass(r.tipo),
                      ].join(" ")}
                    >
                      {r.tipo ?? "-"}
                    </span>

                    <span
  className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 font-mono text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
  title="Ubicación en el depósito"
>
  Est. {r.estante || "-"}
</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    onClick={() => entregarACliente(r.barcode)}
                    disabled={disabledEntregar}
                    className={[
                                  "inline-flex h-10 w-40 items-center justify-center rounded-md px-3 text-sm font-medium",
                                  "bg-slate-900 text-white hover:bg-slate-800",
                                  "disabled:cursor-not-allowed disabled:bg-slate-300",
                                ].join(" ")}
                  >
                    {disabledEntregar
                      ? !isActive(r.estado)
                        ? "Entregado"
                        : "Entregando..."
                      : busyId === r.barcode
                        ? "Entregando..."
                        : "Entregado"}
                  </button>

                  <button
                    onClick={() => marcarDevolucion(r.barcode)}
                    disabled={disabledDevol}
                    className={[
    "inline-flex h-10 w-40 items-center justify-center rounded-md px-3 text-sm font-medium",
    "border bg-white text-slate-900 hover:bg-slate-50",
    "disabled:cursor-not-allowed disabled:text-slate-400",
  ].join(" ")}
                  >
                    {r.estado === "PENDIENTE_DEVOLUCION"
                      ? "Caducado"
                      : busyId === r.barcode
                        ? "Procesando..."
                        : "Caducado"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length > 50 ? (
        <p className="text-xs text-slate-500">
          Mostrando primeros 50 para no matar el navegador.
        </p>
      ) : null}
    </div>
  );
}