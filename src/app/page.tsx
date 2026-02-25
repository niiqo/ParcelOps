import Link from "next/link";

export default function Home() {
  return (
    <div style={{ padding: 40 }}>
      <h1>ParcelOps</h1>
      <p>Sistema de gestión de paquetería</p>

      <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
        <Link href="/ingreso">
          <button>Ingreso de Paquetes</button>
        </Link>

        <Link href="/retiro">
          <button>Registrar Retiro</button>
        </Link>

        <Link href="/reportes">
          <button>Reportes Mensuales</button>
        </Link>
      </div>
    </div>
  );
}