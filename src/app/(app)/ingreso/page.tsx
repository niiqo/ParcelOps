"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { Empresa, Tipo } from "@/types/package";
import DebugPackagesView from "@/components/DebugPackagesView";

const generarBarcode = (): string => {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
};

const CLAMP_CANTIDAD_MIN = 1;
const CLAMP_CANTIDAD_MAX = 50;

const clampCantidad = (value: number): number => {
  return Math.max(CLAMP_CANTIDAD_MIN, Math.min(CLAMP_CANTIDAD_MAX, value));
};

export default function IngresoPage() {
  const barcodeRef = useRef<HTMLInputElement | null>(null);

  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState<Empresa>("SEUR");
  const [tipo, setTipo] = useState<Tipo>("entrega");
  const [estante, setEstante] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cantidadCliente, setCantidadCliente] = useState(CLAMP_CANTIDAD_MIN);
  const [empresaCliente, setEmpresaCliente] = useState<Empresa>("SEUR");
  const [mensajeCliente, setMensajeCliente] = useState("");
  const [guardandoCliente, setGuardandoCliente] = useState(false);

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
        estado: "EN_DEPOSITO",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMensaje("✅ Paquete registrado correctamente.");

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

  const actualizarCantidadCliente = (value: number) => {
    setCantidadCliente(clampCantidad(value));
  };

  const handleSubmitCliente = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (guardandoCliente) return;

    const cantidadFinal = clampCantidad(cantidadCliente);

    try {
      setGuardandoCliente(true);
      setMensajeCliente("");

      const batch = writeBatch(db);

      for (let index = 0; index < cantidadFinal; index += 1) {
        const barcode = generarBarcode();
        const docRef = doc(db, "packages", barcode);

        batch.set(docRef, {
          barcode,
          createdAt: serverTimestamp(),
          empresa: empresaCliente,
          estado: "EN_DEPOSITO",
          estante: "",
          fechaIngreso: serverTimestamp(),
          nombre: "",
          nombreLower: "",
          tipo: "envio",
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      setMensajeCliente(
        `✅ Se crearon ${cantidadFinal} paquetes de envío para ${empresaCliente}.`,
      );
      setCantidadCliente(CLAMP_CANTIDAD_MIN);
      setEmpresaCliente("SEUR");
    } catch (error) {
      console.error(error);
      setMensajeCliente("❌ Error al crear los paquetes.");
    } finally {
      setGuardandoCliente(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="p-6">
        <div className="mx-auto max-w-6xl">
          <div
            style={{
              display: "grid",
              gap: 24,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold border-b pb-2 mb-4">
                Ingreso de Paquete Transportista
              </h2>

              <form onSubmit={handleSubmit}>
                <div>
                  <label>Nombre destinatario</label>
                  <br />
                  <input
                    className="w-full h-8 rounded-md border px-3"
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
                    className="w-full h-8 rounded-md border px-3"
                    value={estante}
                    onChange={(e) => setEstante(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label>Empresa</label>
                  <br />
                  <select
                    className="w-full h-8 rounded-md border px-3"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value as Empresa)}
                  >
                    <option value="SEUR">SEUR</option>
                    <option value="TIPSA">TIPSA</option>
                  </select>
                </div>

                <div>
                  <label>Tipo</label>
                  <br />
                  <select
                    className="w-full h-8 rounded-md border px-3"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as Tipo)}
                  >
                    <option value="entrega">Entrega</option>
                    <option value="envio">Envío</option>
                  </select>
                </div>

                <br />
                <button 
                className="h-10 rounded-md bg-slate-900 px-4 text-white hover:bg-slate-800"
                type="submit" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </form>

              {mensaje ? <p>{mensaje}</p> : null}
            </div>

            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold border-b pb-2 mb-4">
                Ingreso de Paquete Cliente
              </h2>

              <form onSubmit={handleSubmitCliente}>
                <div>
                  <label htmlFor="cantidad-cliente">Cantidad</label>
                  <br />
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        actualizarCantidadCliente(cantidadCliente - 1)
                      }
                      disabled={
                        guardandoCliente ||
                        cantidadCliente <= CLAMP_CANTIDAD_MIN
                      }
                    >
                      -
                    </button>
                    <input
                      className="w-full h-8 rounded-md border px-3"
                      id="cantidad-cliente"
                      type="number"
                      min={CLAMP_CANTIDAD_MIN}
                      max={CLAMP_CANTIDAD_MAX}
                      value={cantidadCliente}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isNaN(value)) {
                          setCantidadCliente(CLAMP_CANTIDAD_MIN);
                          return;
                        }

                        actualizarCantidadCliente(value);
                      }}
                      onBlur={() => actualizarCantidadCliente(cantidadCliente)}
                      disabled={guardandoCliente}
                      style={{ width: 70 }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        actualizarCantidadCliente(cantidadCliente + 1)
                      }
                      disabled={
                        guardandoCliente ||
                        cantidadCliente >= CLAMP_CANTIDAD_MAX
                      }
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label>Empresa</label>
                  <br />
                  <select
                    className="w-full h-8 rounded-md border px-3"
                    value={empresaCliente}
                    onChange={(e) =>
                      setEmpresaCliente(e.target.value as Empresa)
                    }
                    disabled={guardandoCliente}
                  >
                    <option value="SEUR">SEUR</option>
                    <option value="TIPSA">TIPSA</option>
                  </select>
                </div>

                <br />
                <button 
                  className="h-10 rounded-md bg-slate-900 px-4 text-white hover:bg-slate-800"
                  type="submit" disabled={guardandoCliente}>
                  {guardandoCliente ? "Guardando..." : "Guardar"}
                </button>
              </form>

              {mensajeCliente ? <p>{mensajeCliente}</p> : null}
            </div>
          </div>
        </div>
      </div>

      <DebugPackagesView title="Paquetes" />
    </div>
  );
}
