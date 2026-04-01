"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { useState, useEffect } from "react";
import { VOTE_GAME_ABI, VOTE_GAME_ADDRESS } from "@/contract/voteGame";

// 方向の値（コントラクトの enum に対応）
// Up=0, Down=1, Left=2, Right=3
const Direction = { Up: 0, Down: 1, Left: 2, Right: 3 } as const;

// コントラクトからデータを読み取るクライアント（無料）
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export default function Home() {
  const { login, logout, authenticated, user } = usePrivy();
  const { ready, wallets } = useWallets();
  const [isVoting, setIsVoting] = useState(false);
  const [lastVote, setLastVote] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // ラウンドの残り時間を毎秒更新
  useEffect(() => {
    function updateTimer() {
      const now = Math.floor(Date.now() / 1000); // 現在の秒数
      const roundDuration = 600; // 10分 = 600秒
      const elapsed = now % roundDuration; // このラウンドで経過した秒数
      setTimeLeft(roundDuration - elapsed); // 残り秒数
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // 投票を送信する関数
  async function handleVote(direction: number, label: string) {
    try {
      setIsVoting(true);
      setLastVote(null);

      // ウォレットの準備を待つ
      if (!ready) {
        alert("Wallet is still loading. Please wait a moment and try again.");
        return;
      }

      // Privy が作った埋め込みウォレットを取得（なければ最初のウォレットを使う）
      const embeddedWallet = wallets.find(
        (wallet) => wallet.walletClientType === "privy"
      ) || wallets[0];
      if (!embeddedWallet) {
        alert("Wallet not found. Please try logging out and in again.");
        return;
      }

      // ウォレットのプロバイダーを取得（ブロックチェーンとの通信経路）
      const provider = await embeddedWallet.getEthereumProvider();

      // 書き込み用クライアントを作成
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider),
      });

      // コントラクトの vote() 関数を呼び出す（0.001 ETH の参加費を送付）
      const hash = await walletClient.writeContract({
        address: VOTE_GAME_ADDRESS,
        abi: VOTE_GAME_ABI,
        functionName: "vote",
        args: [direction],
        value: parseEther("0.001"),
        account: embeddedWallet.address as `0x${string}`,
      });

      // トランザクションの完了を待つ
      await publicClient.waitForTransactionReceipt({ hash });

      setLastVote(`Voted ${label}!`);
    } catch (error) {
      console.error("Vote failed:", error);
      setLastVote("Vote failed. Please try again.");
    } finally {
      setIsVoting(false);
    }
  }

  // 未ログイン
  if (!authenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold">Kai&apos;s Treasure Hunt</h1>
        <p className="text-zinc-500">Log in to join the vote</p>
        <button
          onClick={login}
          className="rounded-full bg-black px-8 py-3 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Log In
        </button>
      </div>
    );
  }

  // ログイン済み
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="flex items-center gap-4">
        <p className="text-sm text-zinc-500">
          {user?.email?.address || "Logged in"}
        </p>
        <button
          onClick={logout}
          className="rounded-full border border-zinc-300 px-4 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Log Out
        </button>
      </div>

      <h1 className="text-2xl font-bold">Vote</h1>

      {/* Timer */}
      <div className="text-center">
        <p className="text-4xl font-mono font-bold">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
        </p>
        <p className="text-sm text-zinc-500">until round ends</p>
      </div>

      {/* Status */}
      {isVoting && <p className="text-sm text-blue-500">Sending vote...</p>}
      {lastVote && <p className="text-sm text-green-600">{lastVote}</p>}

      {/* Direction buttons */}
      <div className="grid grid-cols-3 gap-2">
        <div />
        <button
          onClick={() => handleVote(Direction.Up, "Up")}
          disabled={isVoting}
          className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-500 text-2xl text-white hover:bg-blue-600 disabled:opacity-50"
        >
          ↑
        </button>
        <div />

        <button
          onClick={() => handleVote(Direction.Left, "Left")}
          disabled={isVoting}
          className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-500 text-2xl text-white hover:bg-blue-600 disabled:opacity-50"
        >
          ←
        </button>
        <div />
        <button
          onClick={() => handleVote(Direction.Right, "Right")}
          disabled={isVoting}
          className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-500 text-2xl text-white hover:bg-blue-600 disabled:opacity-50"
        >
          →
        </button>

        <div />
        <button
          onClick={() => handleVote(Direction.Down, "Down")}
          disabled={isVoting}
          className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-500 text-2xl text-white hover:bg-blue-600 disabled:opacity-50"
        >
          ↓
        </button>
        <div />
      </div>

      {/* Link to results */}
      <a
        href="/results"
        className="text-sm text-blue-500 hover:underline"
      >
        View previous round results
      </a>
    </div>
  );
}
