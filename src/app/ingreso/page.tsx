"use client";

import { useState, useEffect, FormEvent } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export default function IngresoPage() {
  const [barcode, setBarcode] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [tipo, setTipo] = useState("entrega");
  const [estante, setEstante] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const input = document.getElementById("barcode");
    input?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!barcode) {
      setMensaje("El barcode es obligatorio.");
      return;
    }

    try {
      const docRef = doc(db, "packages", barcode);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setMensaje("⚠️ Ya existe un paquete con ese barcode.");
        return;
      }

      await setDoc(docRef, {
        barcode,
        nombre,
        empresa,
        tipo,
        estante,
        fechaIngreso: serverTimestamp(),
        resultadoRetiro: null,
        fechaSalida: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMensaje("✅ Paquete registrado correctamente.");

      // limpiar formulario
      setBarcode("");
      setNombre("");
      setEmpresa("");
      setTipo("entrega");
      setEstante("");

      const input = document.getElementById("barcode");
      input?.focus();
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al guardar el paquete.");
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
            id="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
        </div>

        <div>
          <label>Nombre destinatario</label>
          <br />
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label>Empresa</label>
          <br />
          <input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
          />
        </div>

        <div>
          <label>Tipo</label>
          <br />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
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
          />
        </div>

        <br />
        <button type="submit">Guardar</button>
      </form>

      <p>{mensaje}</p>
    </div>
  );
}