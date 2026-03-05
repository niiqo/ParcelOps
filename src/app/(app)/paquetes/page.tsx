import DebugPackagesView from "@/components/DebugPackagesView";

export default function PaquetesPage() {
  return (
    <section className="mx-auto  max-w-6xl space-y-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">Paquetes</h2>
        <p className="text-sm text-slate-600">
          Vista general del depósito y estados.
        </p>
      </header>

      <DebugPackagesView title="Paquetes" />
    </section>
  );
}
