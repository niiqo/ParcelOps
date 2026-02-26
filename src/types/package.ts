import type { Timestamp } from "firebase/firestore";

export type Tipo = "entrega" | "envio";
export type EstadoPackage =
  | "EN_DEPOSITO"
  | "PENDIENTE_DEVOLUCION"
  | "ENTREGADO"
  | "DEVUELTO";
export type Empresa = "SEUR";

export type PackageDoc = {
  nombre?: string;
  nombreLower?: string;
  empresa?: Empresa;
  tipo?: Tipo;
  estante?: string;
  estado: EstadoPackage;
  fechaIngreso?: Timestamp;
  marcadoDevolucionAt?: Timestamp;
  entregadoAt?: Timestamp;
  devueltoAt?: Timestamp;
};

export type PackageRow = {
  barcode: string;
  nombre?: string;
  nombreLower: string;
  empresa?: Empresa;
  tipo?: Tipo;
  estante?: string;
  estado: EstadoPackage;
};
