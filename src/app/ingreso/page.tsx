"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type TipoPaquete = "entrega" | "envio" | "devolucion";
type Empresa = "SEUR";

export default function IngresoPage() {
  const barcodeRef = useRef<HTMLInputElement | null>(null);

  const [barcode, setBarcode] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState<Empresa>("SEUR");
  const [tipo, setTipo] = useState<TipoPaquete>("entrega");
  const [estante, setEstante] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (guardando) return;

    const barcodeClean = barcode.trim();
    const nombreClean = nombre.trim();
    const empresaClean = empresa.trim();
    const estanteClean = estante.trim();

    if (!barcodeClean) {
      setMensaje("El barcode es obligatorio.");
      barcodeRef.current?.focus();
      return;
    }

    try {
      setGuardando(true);
      setMensaje("");

      const docRef = doc(db, "packages", barcodeClean);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setMensaje("⚠️ Ya existe un paquete con ese barcode.");
        barcodeRef.current?.focus();
        return;
      }

      await setDoc(docRef, {
        barcode: barcodeClean,
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
      setBarcode("");
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
          <label>Barcode *</label>
          <br />
          <input
            ref={barcodeRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            autoComplete="off"
            inputMode="text"
            required
          />
        </div>

        <div>
          <label>Nombre destinatario</label>
          <br />
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
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

        <div>
          <label>Estante</label>
          <br />
          <input
            value={estante}
            onChange={(e) => setEstante(e.target.value)}
            autoComplete="off"
          />
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