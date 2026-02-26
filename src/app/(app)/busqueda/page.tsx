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
import type { EstadoPackage, PackageDoc, PackageRow } from "@/types/package";

const ESTADO_LABEL: Record<EstadoPackage, string> = {
  EN_DEPOSITO: "En depósito",
  PENDIENTE_DEVOLUCION: "Pendiente devolución",
  ENTREGADO: "Entregado",
  DEVUELTO: "Devuelto",
};

const isActive = (estado: EstadoPackage) =>
  estado === "EN_DEPOSITO" || estado === "PENDIENTE_DEVOLUCION";

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

    base = base.filter((r) => r.tipo !== "envio");

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

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h1>Búsqueda (tipo Ctrl+F) y entrega a clientes</h1>

      <div style={{ marginTop: 12 }}>
        <label>Buscar por nombre / apellido</label>
        <br />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder='Ej: "nico" o "perez" o "nico perez"'
          style={{ width: "100%", padding: 10 }}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={includeDelivered}
            onChange={(e) => setIncludeDelivered(e.target.checked)}
          />
          Incluir paquetes entregados/devueltos
        </label>
      </div>

      {loading ? <p>Cargando paquetes activos...</p> : null}
      {msg ? <p>{msg}</p> : null}

      <hr />

      <p>
        Resultados: <b>{filtered.length}</b>
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.slice(0, 50).map((r) => (
          <div
            key={r.barcode}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{r.nombre || "(Sin nombre)"}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  Barcode: {r.barcode} · Empresa: {r.empresa || "-"} · Tipo: {r.tipo || "-"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <b>Estante:</b> {r.estante || "-"} · <b>Estado:</b> {ESTADO_LABEL[r.estado]}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => entregarACliente(r.barcode)}
                  disabled={busyId === r.barcode || !isActive(r.estado)}
                >
                  {!isActive(r.estado)
                    ? "No disponible"
                    : busyId === r.barcode
                      ? "Entregando..."
                      : "Entregar (cliente)"}
                </button>
                <button
                  onClick={() => marcarDevolucion(r.barcode)}
                  disabled={
                    busyId === r.barcode ||
                    r.estado === "PENDIENTE_DEVOLUCION" ||
                    !isActive(r.estado)
                  }
                >
                  {r.estado === "PENDIENTE_DEVOLUCION"
                    ? "Ya pendiente"
                    : "Marcar devolución"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 50 ? (
        <p style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
          Mostrando primeros 50 para no matar el navegador.
        </p>
      ) : null}
    </div>
  );
}
