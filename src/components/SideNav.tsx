"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/ingreso", label: "Ingreso" },
  { href: "/busqueda", label: "Búsqueda" },
  { href: "/reportes", label: "Reportes" },
  { href: "/retiro", label: "Retiro" },
  { href: "/debug-packages", label: "Debug paquetes" },
];

export default function SideNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();


  // Cierra con ESC (detalle de adulto funcional)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            ☰
          </button>

          <div className="flex-1">
            <div className="text-sm font-semibold">ParcelOps</div>
            <div className="text-xs text-gray-500">Gestión de paquetería</div>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={[
          "fixed left-0 top-0 z-50 h-dvh w-72 border-r bg-white shadow-lg",
          "transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-label="Menú lateral"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Secciones</div>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="p-2">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={[
                      "block rounded-md px-3 py-2 text-sm",
                      active ? "bg-gray-100 font-semibold" : "hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}