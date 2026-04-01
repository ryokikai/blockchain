"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import Link from "next/link";
import { createPublicClient, createWalletClient, custom, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import { useState, useEffect, useCallback } from "react";
import { VOTE_GAME_ABI, VOTE_GAME_ADDRESS } from "@/contract/voteGame";

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
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">
        Round {roundId?.toString()} Results
      </h1>

      <div className="text-center text-sm text-zinc-500">
        <p>{votes.length} votes · Prize pool: {formatEther(pool)} ETH</p>
        <p>
          {winner
            ? `Winner: ${winner.slice(0, 6)}...${winner.slice(-4)}`
            : "No winner this round"}
        </p>
      </div>

      {/* Grid */}
      <div
        className="grid gap-0 border border-zinc-300 dark:border-zinc-700"
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
              className={`flex h-8 w-8 items-center justify-center border border-zinc-200 text-sm dark:border-zinc-800 ${
                isCharacter && isTreasure
                  ? "bg-green-400"
                  : isCharacter
                    ? "bg-blue-400"
                    : isTreasure
                      ? "bg-yellow-400"
                      : ""
              }`}
            >
              {isCharacter && isTreasure
                ? "★"
                : isCharacter
                  ? "●"
                  : isTreasure
                    ? "◆"
                    : ""}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-sm">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 bg-blue-400" /> Character
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 bg-yellow-400" /> Treasure
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 bg-green-400" /> Found!
        </span>
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
          className="rounded-full bg-black px-6 py-2 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {currentStep > 0 ? "Replay" : "Play"}
        </button>
        <p className="text-sm text-zinc-500">
          Step {currentStep} / {votes.length}
        </p>
      </div>

      {/* Vote log */}
      {currentStep > 0 && (
        <div className="max-h-40 w-64 overflow-y-auto rounded border border-zinc-200 p-2 text-xs dark:border-zinc-800">
          {votes.slice(0, currentStep).map((v, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="text-zinc-500">#{i + 1}</span>
              <span>{DIRECTION_LABEL[v.direction]}</span>
              <span className="text-zinc-400">
                {v.voter.slice(0, 6)}...
              </span>
            </div>
          ))}
        </div>
      )}

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
              className="rounded-full bg-green-500 px-6 py-2 text-white hover:bg-green-600 disabled:opacity-50"
            >
              {isClaiming ? "Claiming..." : `Claim ${formatEther(pool)} ETH`}
            </button>
            {claimStatus && (
              <p className="mt-2 text-sm text-green-600">{claimStatus}</p>
            )}
          </div>
        )}

      {/* Back to vote */}
      <Link
        href="/"
        className="text-sm text-blue-500 hover:underline"
      >
        Back to voting
      </Link>
    </div>
  );
}
