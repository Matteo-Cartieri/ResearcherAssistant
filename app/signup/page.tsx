"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Errore durante la registrazione.");
      setLoading(false);
      return;
    }

    // login after successful signup
    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    window.location.href = callbackUrl;
  };

  return (
    <main className="h-screen flex items-center justify-center bg-neutral-950">
      <form
        onSubmit={handleSignup}
        className="flex flex-col gap-3 p-6 rounded-xl border border-neutral-800 bg-neutral-900 w-80"
      >
        <h1 className="text-lg font-semibold text-neutral-200">Crea un account</h1>
        <input
          type="text"
          placeholder="Nome (opzionale)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 rounded-md bg-neutral-800 text-neutral-100 text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 rounded-md bg-neutral-800 text-neutral-100 text-sm"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 rounded-md bg-neutral-800 text-neutral-100 text-sm"
          required
          minLength={6}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="p-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Registrazione in corso..." : "Registrati"}
        </button>

        <p className="text-xs text-neutral-400 text-center mt-1">
          Hai già un account?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Accedi
          </Link>
        </p>
      </form>
    </main>
  );
}