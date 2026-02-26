import type { Timestamp } from "firebase/firestore";

export type Tipo = "entrega" | "envio" | "devolucion";
export type ResultadoRetiro = "cliente" | "transportista" | null;
export type Empresa = "SEUR";

export type PackageDoc = {
  nombre?: string;
  nombreLower?: string;
  empresa?: Empresa;
  tipo?: Tipo;
  estante?: string;
  resultadoRetiro?: ResultadoRetiro;
  fechaIngreso?: Timestamp;
  fechaSalida?: Timestamp | null;
};

export type PackageRow = {
  barcode: string;
  nombre?: string;
  nombreLower: string;
  empresa?: Empresa;
  tipo?: Tipo;
  estante?: string;
  resultadoRetiro?: ResultadoRetiro;
};
