"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { VOTE_GAME_ABI, VOTE_GAME_ADDRESS } from "@/contract/voteGame";
import { ArrowBigUp, ArrowBigDown, ArrowBigLeft, ArrowBigRight } from "lucide-react";
import { formatRoundTime, getCurrentRoundId } from "@/lib/utils";

const Direction = { Up: 0, Down: 1, Left: 2, Right: 3 } as const;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export default function Home() {
  const { ready: privyReady, authenticated } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const [isVoting, setIsVoting] = useState(false);
  const [lastVote, setLastVote] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    function updateTimer() {
      const now = Math.floor(Date.now() / 1000);
      const roundDuration = 600;
      const elapsed = now % roundDuration;
      setTimeLeft(roundDuration - elapsed);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVote = useCallback(async (direction: number, label: string) => {
    try {
      setIsVoting(true);
      setLastVote(null);

      if (!walletsReady) {
        alert("Wallet is still loading. Please wait a moment and try again.");
        return;
      }

      const embeddedWallet = wallets.find(
        (wallet) => wallet.walletClientType === "privy"
      ) || wallets[0];
      if (!embeddedWallet) {
        alert("Wallet not found. Please try logging out and in again.");
        return;
      }

      const provider = await embeddedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
        address: VOTE_GAME_ADDRESS,
        abi: VOTE_GAME_ABI,
        functionName: "vote",
        args: [direction],
        value: parseEther("0.0001"),
        account: embeddedWallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setLastVote(`Voted ${label}!`);
    } catch (error) {
      console.error("Vote failed:", error);
      setLastVote("Vote failed. Please try again.");
    } finally {
      setIsVoting(false);
    }
  }, [walletsReady, wallets]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isVoting || !authenticated) return;

      const keyMap: Record<string, [number, string]> = {
        ArrowUp: [Direction.Up, "Up"],
        ArrowDown: [Direction.Down, "Down"],
        ArrowLeft: [Direction.Left, "Left"],
        ArrowRight: [Direction.Right, "Right"],
      };

      const match = keyMap[e.key];
      if (match) {
        e.preventDefault();
        handleVote(match[0], match[1]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVoting, authenticated, handleVote]);

  if (!privyReady) {
    return <div className="flex flex-1 items-center justify-center" />;
  }

  if (!authenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">Kai&apos;s Treasure Hunt</h1>
        <p className="text-zinc-500">Log in to join the vote</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <h1 className="text-2xl font-bold">Help Kai find the treasure!</h1>

      {/* Timer */}
      <div className="text-center">
        <p className="text-sm text-zinc-500">
          Round {formatRoundTime(getCurrentRoundId())}
        </p>
        <p className="text-4xl font-mono font-bold">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
        </p>
      </div>

      {/* Status */}
      <p className="h-5 text-sm font-medium">
        {isVoting ? (
          <span className="text-sky-500">Sending vote...</span>
        ) : lastVote ? (
          <span className={lastVote.includes("failed") ? "text-red-500" : "text-green-600"}>{lastVote}</span>
        ) : null}
      </p>

      {/* Direction buttons */}
      <div className="grid grid-cols-3 gap-2">
        <div />
        <button
          onClick={() => handleVote(Direction.Up, "Up")}
          disabled={isVoting}
          className="flex h-16 w-16 items-center justify-center rounded-lg bg-orange-400 text-2xl text-white hover:bg-orange-500 disabled:opacity-50"
        >
          <ArrowBigUp size={28} fill="white" />
        </button>
        <div />

        <button
          onClick={() => handleVote(Direction.Left, "Left")}
          disabled={isVoting}
          className="flex h-16 w-16 items-center justify-center rounded-lg bg-orange-400 text-white hover:bg-orange-500 disabled:opacity-50"
        >
          <ArrowBigLeft size={28} fill="white" />
        </button>
        <div className="flex items-center justify-center">
          <Image src="/images/kai.png" alt="Kai" width={56} height={56} />
        </div>
        <button
          onClick={() => handleVote(Direction.Right, "Right")}
          disabled={isVoting}
          className="flex h-16 w-16 items-center justify-center rounded-lg bg-orange-400 text-white hover:bg-orange-500 disabled:opacity-50"
        >
          <ArrowBigRight size={28} fill="white" />
        </button>

        <div />
        <button
          onClick={() => handleVote(Direction.Down, "Down")}
          disabled={isVoting}
          className="flex h-16 w-16 items-center justify-center rounded-lg bg-orange-400 text-white hover:bg-orange-500 disabled:opacity-50"
        >
          <ArrowBigDown size={28} fill="white" />
        </button>
        <div />
      </div>
    </div>
  );
}
