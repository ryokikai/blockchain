"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import Image from "next/image";
import { createPublicClient, createWalletClient, custom, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import { useState, useEffect, useCallback } from "react";
import { VOTE_GAME_ABI, VOTE_GAME_ADDRESS } from "@/contract/voteGame";

import { formatRoundTime } from "@/lib/utils";

const GRID_SIZE = 11;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// 方向に対応する移動量
const DIRECTION_DELTA: Record<number, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 }, // Up
  1: { dx: 0, dy: 1 },  // Down
  2: { dx: -1, dy: 0 }, // Left
  3: { dx: 1, dy: 0 },  // Right
};

const DIRECTION_LABEL: Record<number, string> = {
  0: "Up",
  1: "Down",
  2: "Left",
  3: "Right",
};

type Vote = {
  voter: string;
  direction: number;
  timestamp: bigint;
};

export default function ResultsPage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [treasureX, setTreasureX] = useState(0);
  const [treasureY, setTreasureY] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [pool, setPool] = useState<bigint>(0n);
  const [charX, setCharX] = useState(5);
  const [charY, setCharY] = useState(5);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<bigint | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  // 前のラウンドのデータを取得
  const fetchRoundData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 現在のラウンドIDを取得
      const currentRound = (await publicClient.readContract({
        address: VOTE_GAME_ADDRESS,
        abi: VOTE_GAME_ABI,
        functionName: "getCurrentRound",
      })) as bigint;

      // 前のラウンド
      const prevRound = currentRound - 1n;
      setRoundId(prevRound);

      // 投票データ、宝箱位置、winner、プールを並列で取得
      const [roundVotes, treasurePos, roundWinner, roundPool] = await Promise.all([
        publicClient.readContract({
          address: VOTE_GAME_ADDRESS,
          abi: VOTE_GAME_ABI,
          functionName: "getRoundVotes",
          args: [prevRound],
        }),
        publicClient.readContract({
          address: VOTE_GAME_ADDRESS,
          abi: VOTE_GAME_ABI,
          functionName: "getRoundTreasurePosition",
          args: [prevRound],
        }),
        publicClient.readContract({
          address: VOTE_GAME_ADDRESS,
          abi: VOTE_GAME_ABI,
          functionName: "getRoundWinner",
          args: [prevRound],
        }),
        publicClient.readContract({
          address: VOTE_GAME_ADDRESS,
          abi: VOTE_GAME_ABI,
          functionName: "getRoundPool",
          args: [prevRound],
        }),
      ]);

      const typedVotes = roundVotes as Array<{
        voter: string;
        direction: number;
        timestamp: bigint;
      }>;
      const [tx, ty] = treasurePos as [number, number];
      const winnerAddr = roundWinner as string;

      setVotes(typedVotes);
      setTreasureX(tx);
      setTreasureY(ty);
      setPool(roundPool as bigint);
      setWinner(
        winnerAddr === "0x0000000000000000000000000000000000000000"
          ? null
          : winnerAddr
      );

      // キャラを初期位置にリセット
      setCharX(5);
      setCharY(5);
      setCurrentStep(0);
      setIsPlaying(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load round data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoundData();
  }, [fetchRoundData]);

  // アニメーション再生
  useEffect(() => {
    if (!isPlaying || currentStep >= votes.length) {
      if (currentStep >= votes.length && votes.length > 0) {
        setIsPlaying(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      const vote = votes[currentStep];
      const delta = DIRECTION_DELTA[vote.direction];
      if (delta) {
        setCharX((prev) => {
          const next = prev + delta.dx;
          return next >= 0 && next < GRID_SIZE ? next : prev;
        });
        setCharY((prev) => {
          const next = prev + delta.dy;
          return next >= 0 && next < GRID_SIZE ? next : prev;
        });
      }
      setCurrentStep((prev) => prev + 1);
    }, 500); // 0.5秒ごとに1マス移動

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, votes]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p>Loading round data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchRoundData}
          className="rounded-full bg-black px-6 py-2 text-white hover:bg-zinc-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:gap-6">
      <h1 className="text-2xl font-bold">
        Round {roundId != null ? formatRoundTime(roundId) : ""} Results
      </h1>

      <div className="text-center text-sm">
        <p className="text-zinc-500">{votes.length} votes · Prize pool: {formatEther(pool)} ETH</p>
        <p className="h-5 text-foreground font-bold">
          {currentStep >= votes.length && votes.length > 0
            ? winner
              ? `Winner: ${winner.slice(0, 6)}...${winner.slice(-4)} 🏆`
              : "No winner this round :("
            : null}
        </p>
      </div>

      {/* Grid */}
      <div
        className="grid gap-0 border border-zinc-300"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const isCharacter = x === charX && y === charY;
          const isTreasure = x === treasureX && y === treasureY;

          return (
            <div
              key={i}
              className={`relative flex h-8 w-8 items-center justify-center border border-zinc-200 text-sm ${
                isCharacter && isTreasure
                  ? "bg-green-400"
                  : ""
              }`}
            >
              {isTreasure && (
                <Image src="/images/treasure.png" alt="Treasure" width={28} height={28} className="absolute z-0" />
              )}
              {isCharacter && (
                <Image src="/images/kai.png" alt="Kai" width={28} height={28} className="absolute z-10" />
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            setCharX(5);
            setCharY(5);
            setCurrentStep(0);
            setIsPlaying(true);
          }}
          disabled={votes.length === 0}
          className="rounded-full bg-orange-400 font-bold px-6 py-2 text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {currentStep > 0 ? "Replay" : "Play"}
        </button>
      </div>

      {/* Vote log - toast style */}
      <div className="fixed left-4 top-16 z-50">
        {votes
          .slice(0, currentStep)
          .reverse()
          .slice(0, 5)
          .map((v, i) => {
            const originalIndex = votes.indexOf(v);
            return (
              <div
                key={originalIndex}
                className="absolute left-0 flex w-36 justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md transition-[top,opacity] duration-300 ease-out animate-[slideDown_300ms_ease-out]"
                style={{ top: `${i * 36}px`, opacity: 1 - i * 0.2 }}
              >
                <span className="font-medium text-zinc-500">#{originalIndex + 1}</span>
                <span className="font-semibold">{DIRECTION_LABEL[v.direction]}</span>
                <span className="text-zinc-400">
                  {v.voter.slice(0, 6)}...
                </span>
              </div>
            );
          })}
      </div>

      {/* Claim Prize */}
      {winner &&
        authenticated &&
        wallets.some(
          (w) => w.address.toLowerCase() === winner.toLowerCase()
        ) && (
          <div className="text-center">
            <button
              onClick={async () => {
                try {
                  setIsClaiming(true);
                  setClaimStatus(null);
                  const wallet = wallets.find(
                    (w) => w.address.toLowerCase() === winner.toLowerCase()
                  )!;
                  const provider = await wallet.getEthereumProvider();
                  const walletClient = createWalletClient({
                    chain: baseSepolia,
                    transport: custom(provider),
                  });
                  const hash = await walletClient.writeContract({
                    address: VOTE_GAME_ADDRESS,
                    abi: VOTE_GAME_ABI,
                    functionName: "claimPrize",
                    args: [roundId!],
                    account: wallet.address as `0x${string}`,
                  });
                  await publicClient.waitForTransactionReceipt({ hash });
                  setClaimStatus("Prize claimed!");
                } catch (err) {
                  console.error(err);
                  setClaimStatus("Failed to claim prize.");
                } finally {
                  setIsClaiming(false);
                }
              }}
              disabled={isClaiming}
              className="rounded-full bg-green-500 px-6 py-2 font-bold text-white hover:bg-green-600 disabled:opacity-50"
            >
              {isClaiming ? "Claiming..." : `Claim ${formatEther(pool)} ETH`}
            </button>
            {claimStatus && (
              <p className="mt-2 text-sm text-green-600">{claimStatus}</p>
            )}
          </div>
        )} 
    </div>
  );
}
