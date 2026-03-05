"use client";

import { useState } from "react";
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

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

async function register() {
  setError(null);
  setLoading(true);

  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      pass
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
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h1>Ingresar</h1>

      <label>Email</label>
      <input
        style={{ width: "100%", margin: "6px 0 12px" }}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <label>Contraseña</label>
      <input
        style={{ width: "100%", margin: "6px 0 12px" }}
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        autoComplete="current-password"
      />

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={login} disabled={loading || !email || !pass}>
          {loading ? "Procesando..." : "Ingresar"}
        </button>

        <button onClick={register} disabled={loading || !email || !pass}>
          Crear usuario
        </button>
      </div>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </div>
  );
}