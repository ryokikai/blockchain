"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

export default function Header() {
  const { login, logout, authenticated, user } = usePrivy();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-sm font-bold leading-tight sm:text-lg">
          Kai&apos;s<br />Treasure Hunt
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
            Vote
          </Link>
          <Link href="/results" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
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
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs sm:px-4 sm:text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={login}
            className="rounded-full bg-black px-3 py-1.5 text-xs text-white sm:px-4 sm:text-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
