import Link from "next/link";
import PageHeader from "@/components/base/PageHeader";
import EmptyState from "@/components/base/EmptyState";

export default function Home() {
  return (
    <div className="dashboard-home">
      <PageHeader
        title="Panel principal"
        description="Accede rápido a los módulos operativos de ParcelOps."
      />

      <EmptyState
        title="Selecciona un módulo"
        description="Usa la navegación lateral para comenzar con ingresos, retiros, búsquedas o reportes."
        cta={
          <Link href="/ingreso" className="dashboard-home__cta">
            Ir a Ingreso
          </Link>
        }
      />
    </div>
  );
}
