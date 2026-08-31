"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function UserDropdown() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteProfile = async () => {
    if (!confirm("Sei sicuro di voler eliminare il tuo profilo? L'azione è irreversibile.")) 
      return;

    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        await signOut({ callbackUrl: "/login" });
      } else {
        alert("Errore durante l'eliminazione del profilo.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const initial = session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold text-sm flex items-center justify-center hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-md"
      >
        {initial}
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-52 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl py-1.5 z-50 text-xs">
          <div className="px-3 py-2 border-b border-neutral-800">
            <p className="font-medium text-neutral-200 truncate">{session?.user?.name ?? "Utente"}</p>
            <p className="text-neutral-500 truncate">{session?.user?.email}</p>
          </div>

          <button
            onClick={handleDeleteProfile}
            className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-950/30 flex items-center gap-2 transition-colors"
          >
            Elimina Profilo
          </button>

          <div className="border-t border-neutral-800 my-1" />

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-3 py-2 text-neutral-400 hover:bg-neutral-800 transition-colors"
          >
            Esci
          </button>
        </div>
      )}
    </div>
  );
}