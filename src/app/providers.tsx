"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { baseSepolia } from "viem/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // ログイン方法：メールとGoogleのみ（ウォレット不要）
        loginMethods: ["email"],
        // 埋め込みウォレットを自動作成
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
        // Base Sepolia テストネットを使用
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
