"use client";

import { usePrivy, useWallets } from  "@privy-io/react-auth";
import Link from "next/link";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatEther,
} from "viem";
import { baseSepolia } from "viem/chains";
import { useState, useEffect, useCallback } from "react";
import { VOTE_GAME_ABI, VOTE_GAME_ADDRESS } from "@/contract/voteGame";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export default function AdminPage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [owner, setOwner] = useState<string | null>(null);
  const [ownerBalance, setOwnerBalance] = useState<bigint>(0n);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ownerAddr, balance] = await Promise.all([
        publicClient.readContract({
          address: VOTE_GAME_ADDRESS,
          abi: VOTE_GAME_ABI,
          functionName: "owner",
        }),
        publicClient.readContract({
          address: VOTE_GAME_ADDRESS,
          abi: VOTE_GAME_ABI,
          functionName: "ownerBalance",
        }),
      ]);

      setOwner(ownerAddr as string);
      setOwnerBalance(balance as bigint);

      // ログイン中のウォレットがオーナーか確認
      const isMatch = wallets.some(
        (w) => w.address.toLowerCase() === (ownerAddr as string).toLowerCase()
      );
      setIsOwner(isMatch);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [wallets]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleWithdraw() {
    try {
      setIsWithdrawing(true);
      setWithdrawStatus(null);

      const wallet = wallets.find(
        (w) => w.address.toLowerCase() === owner?.toLowerCase()
      )!;
      const provider = await wallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
        address: VOTE_GAME_ADDRESS,
        abi: VOTE_GAME_ABI,
        functionName: "withdrawOwnerFees",
        account: wallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setWithdrawStatus("Fees withdrawn!");
      setOwnerBalance(0n);
    } catch (err) {
      console.error(err);
      setWithdrawStatus("Withdrawal failed.");
    } finally {
      setIsWithdrawing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-zinc-500">Log in to access admin panel</p>
      </div>
    );
  }

  // ログイン中だがオーナーではない
  if (!isOwner) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-zinc-500">You are not the contract owner.</p>
        <Link href="/" className="text-sm text-sky-500 hover:underline">
          Back to voting
        </Link>
      </div>
    );
  }

  // オーナー管理画面
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <div className="w-80 rounded-lg border border-zinc-200 p-6">
        <div className="mb-4">
          <p className="text-sm text-zinc-500">Owner Address</p>
          <p className="font-mono text-sm">
            {owner?.slice(0, 6)}...{owner?.slice(-4)}
          </p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-zinc-500">Accumulated Fees</p>
          <p className="text-2xl font-bold">{formatEther(ownerBalance)} ETH</p>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={isWithdrawing || ownerBalance === 0n}
          className="w-full rounded-full bg-black px-6 py-2 text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {isWithdrawing
            ? "Withdrawing..."
            : ownerBalance === 0n
              ? "No fees to withdraw"
              : "Withdraw Fees"}
        </button>

        {withdrawStatus && (
          <p className="mt-2 text-center text-sm text-green-600">
            {withdrawStatus}
          </p>
        )}
      </div>

      <div className="mb-2">
        <p className="text-sm text-zinc-500">Contract Address</p>
        <p className="font-mono text-xs">{VOTE_GAME_ADDRESS}</p>
      </div>

      <Link href="/" className="text-sm text-sky-500 hover:underline">
        Back to voting
      </Link>
    </div>
  );
}
