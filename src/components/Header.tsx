"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

export default function Header() {
  const { login, logout, authenticated, user } = usePrivy();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-4 sm:px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-sm font-bold leading-3 sm:leading-4 sm:text-lg text-orange-400">
          <span className="text-sky-500">Kai&apos;s</span><br />Treasure Hunt
        </Link>
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/" className="text-foreground hover:text-black">
            Vote
          </Link>
          <Link href="/results" className="text-foreground hover:text-black">
            Results
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {authenticated ? (
          <>
            <span className="hidden text-sm text-zinc-500 sm:inline">
              {user?.email?.address || "Logged in"}
            </span>
            <button
              onClick={logout}
              className="rounded-full bg-sky-500 px-3 py-1.5 text-xs text-white font-bold sm:px-4 sm:text-sm hover:bg-sky-600"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={login}
            className="rounded-full bg-sky-500 px-3 py-1.5 text-xs text-white font-bold sm:px-4 sm:text-sm hover:bg-sky-600"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
