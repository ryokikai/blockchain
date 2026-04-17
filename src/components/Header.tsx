"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useRef, useEffect } from "react";
import { getCurrentRoundId, formatRoundTime } from "@/lib/utils";

export default function Header() {
  const { login, logout, authenticated, user } = usePrivy();
  const [resultsOpen, setResultsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ドロップダウンの外をクリックしたら閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setResultsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-4 sm:px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-sm font-bold leading-3 sm:leading-4 sm:text-lg text-orange-400">
          <span className="text-sky-500">Kai&apos;s</span><br />Treasure Hunt
        </Link>
        {authenticated && (
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/vote" className="text-foreground hover:text-black">
              Play
            </Link>
            <Link href="/history" className="text-foreground hover:text-black">
              History
            </Link>
            <div
              className="relative"
              ref={dropdownRef}
              onMouseEnter={() => setResultsOpen(true)}
              onMouseLeave={() => setResultsOpen(false)}
            >
              <button
                onClick={() => setResultsOpen(!resultsOpen)}
                className="text-foreground hover:text-black"
              >
                Results
              </button>
              {resultsOpen && (
                <div className="absolute left-0 top-full z-50 w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-md animate-[dropdownIn_150ms_ease-out]">
                  {[1, 2, 3].map((offset) => {
                    const roundId = getCurrentRoundId() - offset;
                    return (
                      <Link
                        key={roundId}
                        href={`/results?round=${roundId}`}
                        onClick={() => setResultsOpen(false)}
                        className="block px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                      >
                        {formatRoundTime(roundId)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        )}
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
