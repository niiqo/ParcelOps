"use client";

import { useState } from "react";
import { signInWithEmailAndPassword,createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

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
      await createUserWithEmailAndPassword(auth, email.trim(), pass);
      router.replace("/ingreso");
    } catch (e: any) {
      setError(e?.message ?? "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      router.replace("/"); // o a donde quieras mandarlo post-login
    } catch (e: any) {
      setError(e?.message ?? "Error al iniciar sesión");
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
      />

      <label>Contraseña</label>
      <input
        style={{ width: "100%", margin: "6px 0 12px" }}
        type="password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
      />

      <button onClick={login} disabled={loading || !email || !pass}>
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
      <button onClick={register} disabled={loading || !email || !pass} style={{ marginLeft: 10 }}>
  Crear usuario
</button>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </div>
  );
}