"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { getCurrentRoundId, formatRoundTime } from "@/lib/utils";

export default function Header() {
  const { login, logout, authenticated, user } = usePrivy();
  const [resultsOpen, setResultsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileResultsOpen, setMobileResultsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // デスクトップドロップダウンの外をクリックしたら閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setResultsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // モバイルメニューが開いているときはbodyをスクロール無効化
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
    setMobileResultsOpen(false);
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-6">
          {/* Mobile hamburger */}
          {authenticated && (
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-zinc-700 hover:text-black"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          )}

          <Link href="/" className="text-sm font-bold leading-3 sm:leading-4 sm:text-lg text-orange-400">
            <span className="text-sky-500">Kai&apos;s</span><br />Treasure Hunt
          </Link>

          {/* Desktop nav */}
          {authenticated && (
            <nav className="hidden md:flex gap-4 text-sm font-medium">
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

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden animate-[fadeIn_200ms_ease-out]"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      {/* Mobile menu drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 bg-white shadow-lg md:hidden transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <span className="font-bold text-orange-400 leading-3">
            <span className="text-sky-500">Kai&apos;s</span><br />Treasure Hunt
          </span>
          <button
            onClick={closeMobile}
            className="text-zinc-700 hover:text-black"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>
        <nav className="flex flex-col p-4 gap-1 text-base font-medium">
          <Link
            href="/vote"
            onClick={closeMobile}
            className="rounded px-3 py-2 text-foreground hover:bg-zinc-100"
          >
            Play
          </Link>
          <Link
            href="/history"
            onClick={closeMobile}
            className="rounded px-3 py-2 text-foreground hover:bg-zinc-100"
          >
            History
          </Link>
          <button
            onClick={() => setMobileResultsOpen(!mobileResultsOpen)}
            className="flex items-center justify-between rounded px-3 py-2 text-left text-foreground hover:bg-zinc-100"
          >
            Results
            <span className="text-xs text-zinc-400">
              {mobileResultsOpen ? "▲" : "▼"}
            </span>
          </button>
          {mobileResultsOpen && (
            <div className="flex flex-col gap-1 pl-4">
              {[1, 2, 3].map((offset) => {
                const roundId = getCurrentRoundId() - offset;
                return (
                  <Link
                    key={roundId}
                    href={`/results?round=${roundId}`}
                    onClick={closeMobile}
                    className="rounded px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                  >
                    {formatRoundTime(roundId)}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
