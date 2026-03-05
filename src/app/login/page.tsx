"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

function errorMessage(err: unknown) {
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as FirebaseError).message);
  }
  return "Error inesperado";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return !loading && email.trim().length > 0 && pass.length > 0;
  }, [loading, email, pass]);

  async function register() {
    setError(null);
    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pass,
      );

      // Asegura token listo (evita race condition de permisos)
      await cred.user.getIdToken(true);

      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email ?? email.trim(),
        role: "warehouse",
        createdAt: serverTimestamp(),
      });

      router.replace("/ingreso");
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      router.replace("/");
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="mb-6">
          <div className="text-sm font-medium text-slate-600">ParcelOps</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Entrá con tu email. Si es tu primera vez, podés crear un usuario.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              className="h-11 w-full rounded-md border px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="user@correo.com"
            />
          </div>

          {/* Password */}
          <div className="mt-4 space-y-1">
            <label className="text-sm font-medium">Contraseña</label>

            <div className="relative">
              <input
                className="h-11 w-full rounded-md border px-3 pr-24 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPass ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={login}
              disabled={!canSubmit}
              className={[
                "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium",
                "bg-slate-900 text-white hover:bg-slate-800",
                "disabled:cursor-not-allowed disabled:bg-slate-300",
              ].join(" ")}
            >
              {loading ? "Procesando..." : "Ingresar"}
            </button>

            <button
              onClick={register}
              disabled={!canSubmit}
              className={[
                "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium",
                "border bg-white text-slate-900 hover:bg-slate-50",
                "disabled:cursor-not-allowed disabled:text-slate-400",
              ].join(" ")}
            >
              Crear usuario
            </button>
          </div>

          {/* Footer hint */}
          <p className="mt-4 text-xs text-slate-500">
            Tip: si tenés problemas para entrar, revisá mayúsculas en la contraseña.
          </p>
        </div>
      </div>
    </div>
  );
}