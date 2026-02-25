"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {collection, getDocs, limit, orderBy, query, updateDoc, doc, serverTimestamp,} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";

type PackageDoc = {
  nombre?: string;
  nombreLower?: string;
  empresa?: string;
  tipo?: "entrega" | "envio" | "devolucion";
  estante?: string;
  resultadoRetiro?: "cliente" | "transportista" | null;
  fechaIngreso?: Timestamp;
  fechaSalida?: Timestamp | null;
};

type Tipo = "entrega" | "envio" | "devolucion";
type Resultado = "cliente" | "transportista" | null;

type Row = {
  barcode: string;
  nombre?: string;
  nombreLower: string;
  empresa?: string;
  tipo?: Tipo;
  estante?: string;
  resultadoRetiro?: Resultado;
};

export default function BusquedaPage() {
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [allActive, setAllActive] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [includeDelivered, setIncludeDelivered] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const termNorm = useMemo(() => term.trim().toLowerCase(), [term]);

  // 1) Cargar paquetes activos (en depósito) una vez
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const ref = collection(db, "packages");
        const q = query(
          ref,
          orderBy("fechaIngreso", "desc"),
          limit(1000) // MVP: ajustable
        );

        const snap = await getDocs(q);
        const list: Row[] = snap.docs.map((d) => {
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
            resultadoRetiro: data.resultadoRetiro ?? null,
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

  // 2) Filtrado tipo Ctrl+F (contiene, no solo prefijo)
const filtered = useMemo(() => {
  let base = allActive;

  // Si NO queremos incluir entregados
  if (!includeDelivered) {
    base = base.filter((r) => r.resultadoRetiro == null);
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
      resultadoRetiro: "cliente",
      fechaSalida: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // ✅ NO lo eliminamos. Lo marcamos como entregado en memoria.
    setAllActive((prev) =>
      prev.map((p) =>
        p.barcode === barcode ? { ...p, resultadoRetiro: "cliente" } : p
      )
    );

    setMsg("✅ Entrega registrada (retirado por cliente).");
  } catch (e) {
    console.error(e);
    setMsg("❌ Error registrando la entrega.");
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
    Incluir paquetes entregados
  </label>
</div>

      <p style={{ fontSize: 12, opacity: 0.75 }}>
        Busca por “contiene” (como Ctrl+F). Se filtra solo en paquetes en depósito.
      </p>

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
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{r.nombre || "(Sin nombre)"}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  Barcode: {r.barcode} · Empresa: {r.empresa || "-"} · Tipo: {r.tipo || "-"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <b>Estante:</b> {r.estante || "-"} · <b>Estado:</b>{" "}
{r.resultadoRetiro == null
  ? "En depósito"
  : `Entregado (${r.resultadoRetiro})`}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                <button
  onClick={() => entregarACliente(r.barcode)}
  disabled={busyId === r.barcode || r.resultadoRetiro != null}
>
  {r.resultadoRetiro != null
    ? "Ya entregado"
    : busyId === r.barcode
    ? "Entregando..."
    : "Entregar (cliente)"}
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