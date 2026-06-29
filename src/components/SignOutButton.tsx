"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-xs text-[#7b8099] hover:text-[#c8cde0] transition-colors
                 uppercase tracking-widest"
    >
      Выйти
    </button>
  );
}
