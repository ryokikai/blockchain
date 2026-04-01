// コントラクトのアドレス（デプロイ後に更新する）
export const VOTE_GAME_ADDRESS = "0x3a0077dbDb075Fa5f48FE34C9a2C89beFa2C0B28" as const;

// コントラクトのABI（API仕様書のようなもの）
// フロントエンドはこれを見て、どの関数を呼べるか・引数は何かを知る
export const VOTE_GAME_ABI = [
  {
    type: "function",
    name: "vote",
    inputs: [{ name: "direction", type: "uint8" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getCurrentRound",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoundVoteCount",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoundVotes",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "voter", type: "address" },
          { name: "direction", type: "uint8" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoundCharacterPosition",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "", type: "uint8" },
      { name: "", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoundTreasurePosition",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [
      { name: "", type: "uint8" },
      { name: "", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoundWinner",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isRoundActive",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isRoundFinished",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoundEndTime",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "GRID_SIZE",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimPrize",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawOwnerFees",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getRoundPool",
    inputs: [{ name: "roundId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerBalance",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;
