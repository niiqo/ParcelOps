"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type TipoPaquete = "entrega" | "envio" | "devolucion";
type Empresa = "SEUR";

const generarBarcode = (): string => {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
};

export default function IngresoPage() {
  const barcodeRef = useRef<HTMLInputElement | null>(null);

  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState<Empresa>("SEUR");
  const [tipo, setTipo] = useState<TipoPaquete>("entrega");
  const [estante, setEstante] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const input = document.getElementById("nombre");
    input?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (guardando) return;

    const nombreClean = nombre.trim();
    const estanteClean = estante.trim();

    try {
      setGuardando(true);
      setMensaje("");

      const barcodeGenerado = generarBarcode();
      const docRef = doc(db, "packages", barcodeGenerado);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setMensaje("⚠️ Se generó un barcode repetido. Reintenta.");
        return;
      }

      await setDoc(docRef, {
        barcode: barcodeGenerado,
        nombre: nombreClean,
        nombreLower: (nombre || "").trim().toLowerCase(),
        empresa,
        tipo,
        estante: estanteClean,
        fechaIngreso: serverTimestamp(),
        resultadoRetiro: null,
        fechaSalida: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMensaje("✅ Paquete registrado correctamente.");

      // limpiar
      setNombre("");
      setEmpresa("SEUR");
      setTipo("entrega");
      setEstante("");

      barcodeRef.current?.focus();
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al guardar el paquete.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Ingreso de Paquete</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre destinatario</label>
          <br />
          <input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div>
          <label>Estante</label>
          <br />
          <input
            value={estante}
            onChange={(e) => setEstante(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div>
          <label>Empresa</label>
          <br />
          <select
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value as Empresa)}
          >
            <option value="SEUR">SEUR</option>
          </select>
        </div>

        <div>
          <label>Tipo</label>
          <br />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoPaquete)}
          >
            <option value="entrega">Entrega</option>
            <option value="envio">Envío</option>
            <option value="devolucion">Devolución</option>
          </select>
        </div>

        <br />
        <button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </form>

      {mensaje ? <p>{mensaje}</p> : null}
    </div>
  );
}
