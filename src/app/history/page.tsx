"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowBigUp, ArrowBigDown, ArrowBigLeft, ArrowBigRight } from "lucide-react";
import { VOTE_GAME_ABI, VOTE_GAME_ADDRESS } from "@/contract/voteGame";
import { formatRoundTime, getCurrentRoundId, ROUND_DURATION } from "@/lib/utils";
import { DIRECTION_LABEL } from "@/lib/types";

const ROUNDS_PER_DAY = Math.floor(86400 / ROUND_DURATION); // 144
const ROUNDS_PER_PAGE = 10;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
  batch: { multicall: true },
});

const DIRECTION_ICON: Record<number, React.ReactNode> = {
  0: <ArrowBigUp size={14} fill="currentColor" />,
  1: <ArrowBigDown size={14} fill="currentColor" />,
  2: <ArrowBigLeft size={14} fill="currentColor" />,
  3: <ArrowBigRight size={14} fill="currentColor" />,
};

type UserVote = {
  direction: number;
  timestamp: bigint;
};

type UserRoundHistory = {
  roundId: bigint;
  votes: UserVote[];
};

async function fetchUserVotesForRound(
  roundId: bigint,
  userAddress: string
): Promise<UserRoundHistory> {
  const votes = (await publicClient.readContract({
    address: VOTE_GAME_ADDRESS,
    abi: VOTE_GAME_ABI,
    functionName: "getRoundVotes",
    args: [roundId],
  })) as Array<{ voter: string; direction: number; timestamp: bigint }>;

  const userVotes = votes
    .filter((v) => v.voter.toLowerCase() === userAddress)
    .map((v) => ({ direction: v.direction, timestamp: v.timestamp }));

  return { roundId, votes: userVotes };
}

// ローカルタイムゾーンで "YYYY-MM-DD" 形式に変換
function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// "YYYY-MM-DD" からその日の最初のラウンドIDを取得（ローカルタイムゾーン）
function getFirstRoundIdForDate(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayStart = new Date(year, month - 1, day, 0, 0, 0).getTime() / 1000;
  return Math.floor(dayStart / ROUND_DURATION);
}

// Unixタイムスタンプから "HH:MM:SS" 形式に変換（ローカルタイム）
function formatTimestamp(timestamp: bigint) {
  const d = new Date(Number(timestamp) * 1000);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export default function HistoryPage() {
  const { ready: privyReady, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const searchParams = useSearchParams();
  const router = useRouter();

  const today = toDateString(new Date());
  const selectedDate = searchParams.get("date") ?? today;
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  const embeddedWallet =
    wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const userAddress = embeddedWallet?.address.toLowerCase() ?? null;

  const [history, setHistory] = useState<UserRoundHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // その日のラウンド範囲を計算（今日の場合は現在より後は存在しないので制限）
  const firstRoundOfDay = getFirstRoundIdForDate(selectedDate);
  const lastRoundOfDay = firstRoundOfDay + ROUNDS_PER_DAY - 1;
  const latestRound = Math.min(lastRoundOfDay, getCurrentRoundId() - 1);
  const totalRoundsInDay = Math.max(0, latestRound - firstRoundOfDay + 1);
  const totalPages = Math.max(1, Math.ceil(totalRoundsInDay / ROUNDS_PER_PAGE));

  const loadPage = useCallback(
    async (date: string, pageNum: number, address: string) => {
      setLoading(true);
      setError(null);
      try {
        const first = getFirstRoundIdForDate(date);
        const last = first + ROUNDS_PER_DAY - 1;
        const cappedLast = Math.min(last, getCurrentRoundId() - 1);

        if (cappedLast < first) {
          setHistory([]);
          return;
        }

        // ページネーション: ページ1はその日の最新から（新しい順）
        const startRound = cappedLast - (pageNum - 1) * ROUNDS_PER_PAGE;
        const roundIds = Array.from({ length: ROUNDS_PER_PAGE }, (_, i) =>
          startRound - i
        )
          .filter((id) => id >= first)
          .map((id) => BigInt(id));

        const results = await Promise.all(
          roundIds.map((id) => fetchUserVotesForRound(id, address))
        );
        setHistory(results);
      } catch (err) {
        console.error(err);
        setError("Failed to load history.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (userAddress) {
      loadPage(selectedDate, page, userAddress);
    }
  }, [selectedDate, page, userAddress, loadPage]);

  function updateParams(updates: { date?: string; page?: number }) {
    const params = new URLSearchParams(searchParams);
    if (updates.date !== undefined) {
      if (updates.date === today) {
        params.delete("date");
      } else {
        params.set("date", updates.date);
      }
    }
    if (updates.page !== undefined) {
      if (updates.page === 1) {
        params.delete("page");
      } else {
        params.set("page", String(updates.page));
      }
    }
    const query = params.toString();
    router.push(`/history${query ? `?${query}` : ""}`);
  }

  function handleDateChange(newDate: string) {
    updateParams({ date: newDate, page: 1 });
  }

  function handlePageChange(pageNum: number) {
    updateParams({ page: pageNum });
  }

  // 見やすい日付表示
  const selectedDateObj = (() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  })();
  const displayDate = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Privy の準備ができるまでローディング
  if (!privyReady) {
    return <div className="flex flex-1 items-center justify-center" />;
  }

  // 未ログイン
  if (!authenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">Your Bet History</h1>
        <p className="text-zinc-500">Log in to see your bets</p>
        <button
          onClick={login}
          className="rounded-full bg-orange-400 px-8 py-3 font-bold text-white hover:bg-orange-500"
        >
          Login to Play
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Your Bet History</h1>
      </div>

      {/* Date selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">{displayDate}</h2>
        </div>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => handleDateChange(e.target.value)}
          className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />
      </div>

      {error && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}

      {loading && history.length === 0 && (
        <p className="text-center text-sm text-zinc-500">Loading...</p>
      )}

      {!loading && history.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
          <p className="text-zinc-500">No bets on this date.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {history.map((r) => {
          const isEmpty = r.votes.length === 0;
          const currentRoundId = getCurrentRoundId();
          // ナビゲーションの Results ドロップダウンと同じ: 直近3ラウンドのみ結果表示可能
          const isResultAvailable =
            Number(r.roundId) >= currentRoundId - 3 &&
            Number(r.roundId) < currentRoundId;
          const canLink = !isEmpty && isResultAvailable;
          return (
            <li
              key={String(r.roundId)}
              className={`rounded-lg border border-zinc-200 p-4 ${isEmpty ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                {canLink ? (
                  <Link
                    href={`/results?round=${r.roundId}`}
                    className="font-semibold hover:text-sky-500"
                  >
                    {formatRoundTime(r.roundId)}
                  </Link>
                ) : (
                  <span className="font-semibold">
                    {formatRoundTime(r.roundId)}
                  </span>
                )}
                <span className="text-xs text-zinc-500">
                  {isEmpty
                    ? "No bets"
                    : `${r.votes.length} bet${r.votes.length === 1 ? "" : "s"}`}
                </span>
              </div>
              {!isEmpty && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {r.votes.map((v, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-mono text-xs text-zinc-500">
                        {formatTimestamp(v.timestamp)}
                      </span>
                      <span className="flex items-center gap-1 rounded-md bg-orange-400 px-2 py-0.5 text-xs font-bold text-white">
                        {DIRECTION_ICON[v.direction]}
                        {DIRECTION_LABEL[v.direction]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
