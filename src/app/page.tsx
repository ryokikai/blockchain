"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Copy, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find(
    (w) => w.walletClientType === "privy"
  );

  if (!ready) {
    return <div className="flex flex-1 items-center justify-center" />;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-12">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 text-center">
        <Image src="/images/kai.png" alt="Kai" width={120} height={120} />
        <h1 className="text-3xl font-bold">Kai&apos;s Treasure Hunt</h1>
        <p className="max-w-md text-zinc-500">
          Every 10 minutes, a new adventure begins. Guide Kai to the treasure chest and win the prize pool!
        </p>
        {authenticated ? (
          <Link
            href="/vote"
            className="rounded-full bg-orange-400 px-8 py-3 font-bold text-white hover:bg-orange-500 transition-colors duration-250"
          >
            Start Playing
          </Link>
        ) : (
          <button
            onClick={login}
            className="rounded-full bg-orange-400 px-8 py-3 font-bold text-white hover:bg-orange-500 transition-colors duration-250"
          >
            Login to Play
          </button>
        )}
      </div>

      {/* Account Info */}
      {authenticated && embeddedWallet && (
        <div className="w-full max-w-md rounded-lg border border-zinc-200 p-6">
          <h2 className="mb-4 text-lg font-bold">Your Account</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Email</span>
              <span>{embeddedWallet ? (
                // Get email from Privy user
                <EmailDisplay />
              ) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Wallet Address</span>
              <span className="flex items-center gap-1 font-mono">
                {embeddedWallet.address.slice(0, 6)}...{embeddedWallet.address.slice(-4)}
                <CopyButton text={embeddedWallet.address} />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* How to Play */}
      <div className="w-full max-w-md rounded-lg border border-zinc-200 p-6">
        <h2 className="mb-4 text-lg font-bold">How to Play</h2>
        <ol className="flex flex-col gap-3 text-sm text-zinc-600">
          <li className="flex gap-3">
            <span className="font-bold text-sky-500">1.</span>
            <span>Log in with your email. A wallet is automatically created for you.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-sky-500">2.</span>
            <span>Each round lasts 10 minutes. Vote to move Kai up, down, left, or right.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-sky-500">3.</span>
            <span>Each vote costs 0.0001 ETH. You can vote as many times as you want.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-sky-500">4.</span>
            <span>When the round ends, watch Kai move across the grid in the Results page.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-sky-500">5.</span>
            <span>If Kai reaches the treasure chest, the voter who made the final move wins 90% of the prize pool!</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function EmailDisplay() {
  const { user } = usePrivy();
  return <>{user?.email?.address || "—"}</>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-zinc-400 hover:text-zinc-600"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
