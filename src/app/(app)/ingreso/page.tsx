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
import { useNotification } from "@/components/notifications/NotificationProvider";

const generarBarcode = (): string => {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
};

const CLAMP_CANTIDAD_MIN = 1;
const CLAMP_CANTIDAD_MAX = 50;

const clampCantidad = (value: number): number => {
  return Math.max(CLAMP_CANTIDAD_MIN, Math.min(CLAMP_CANTIDAD_MAX, value));
};

export default function IngresoPage() {
  const nombreRef = useRef<HTMLInputElement | null>(null);

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

  const [fueraDeEstanteria, setFueraDeEstanteria] = useState(false);

  const notify = useNotification();

  useEffect(() => {
    nombreRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (guardando) return;

    const nombreClean = nombre.trim();
    const estanteClean = fueraDeEstanteria ? "s/n estante" : estante.trim();

    if (!fueraDeEstanteria && !estante.trim()) {
      notify.warning("Ingresá un número de estante o marcá 'Fuera de estantería'.");
      return;
    }

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
        nombreLower: nombreClean.toLowerCase(),
        empresa,
        tipo,
        estante: estanteClean,
        fechaIngreso: serverTimestamp(),
        estado: "EN_DEPOSITO",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      notify.success("Paquete registrado correctamente.");

      setNombre("");
      setEmpresa("SEUR");
      setTipo("entrega");
      setEstante("");
      setFueraDeEstanteria(false);

      nombreRef.current?.focus();
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

      notify.success(
        `Se crearon ${cantidadFinal} paquetes de envío para ${empresaCliente}.`,
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
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Ingreso de paquetes
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Registrá paquetes de transportista o generá envíos de clientes en lote.
        </p>
      </div>

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="mb-4 border-b pb-2 text-lg font-semibold text-slate-900">
            Ingreso de Paquete Transportista
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre destinatario</label>
              <input
                ref={nombreRef}
                id="nombre"
                className="mt-1 h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={nombre}
                style={{ textTransform: "uppercase" }}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Estante</label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  className="h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={estante}
                  onChange={(e) => setEstante(e.target.value.replace(/\D/g, ""))}
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={fueraDeEstanteria}
                />

                <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={fueraDeEstanteria}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFueraDeEstanteria(checked);
                      if (checked) setEstante("");
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Fuera de estantería
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Empresa</label>
              <select
                className="mt-1 h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value as Empresa)}
              >
                <option value="SEUR">SEUR</option>
                <option value="TIPSA">TIPSA</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                className="mt-1 h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Tipo)}
              >
                <option value="entrega">Entrega</option>
                <option value="envio">Envío</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </form>

          {mensaje ? <p className="mt-3 text-sm text-slate-700">{mensaje}</p> : null}
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="mb-4 border-b pb-2 text-lg font-semibold text-slate-900">
            Ingreso de Paquete Cliente
          </h2>

          <form onSubmit={handleSubmitCliente} className="space-y-4">
            <div>
              <label htmlFor="cantidad-cliente" className="text-sm font-medium">
                Cantidad
              </label>

              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => actualizarCantidadCliente(cantidadCliente - 1)}
                  disabled={
                    guardandoCliente || cantidadCliente <= CLAMP_CANTIDAD_MIN
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-white text-base text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  -
                </button>

                <input
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
                  className="h-10 w-20 rounded-md border px-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />

                <button
                  type="button"
                  onClick={() => actualizarCantidadCliente(cantidadCliente + 1)}
                  disabled={
                    guardandoCliente || cantidadCliente >= CLAMP_CANTIDAD_MAX
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-white text-base text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Empresa</label>
              <select
                className="mt-1 h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={empresaCliente}
                onChange={(e) => setEmpresaCliente(e.target.value as Empresa)}
              >
                <option value="SEUR">SEUR</option>
                <option value="TIPSA">TIPSA</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={guardandoCliente}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {guardandoCliente ? "Guardando..." : "Guardar"}
            </button>
          </form>

          {mensajeCliente ? (
            <p className="mt-3 text-sm text-slate-700">{mensajeCliente}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}