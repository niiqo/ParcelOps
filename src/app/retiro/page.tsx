"use client";

import { useState, useEffect, FormEvent } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function RetiroPage() {
  const [barcode, setBarcode] = useState("");
  const [resultado, setResultado] = useState("cliente");
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

      if (!docSnap.exists()) {
        setMensaje("❌ No existe un paquete con ese barcode.");
        return;
      }

      const data = docSnap.data();

      if (data.resultadoRetiro) {
        setMensaje("⚠️ Este paquete ya fue retirado.");
        return;
      }

      await updateDoc(docRef, {
        resultadoRetiro: resultado,
        fechaSalida: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMensaje("✅ Retiro registrado correctamente.");

      setBarcode("");
      const input = document.getElementById("barcode");
      input?.focus();
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al registrar el retiro.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Registrar Retiro</h1>

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
          <label>Resultado</label>
          <br />
          <select
            value={resultado}
            onChange={(e) => setResultado(e.target.value)}
          >
            <option value="cliente">Retirado por cliente</option>
            <option value="transportista">
              Retirado por transportista
            </option>
          </select>
        </div>

        <br />
        <button type="submit">Registrar retiro</button>
      </form>

      <p>{mensaje}</p>
    </div>
  );
}