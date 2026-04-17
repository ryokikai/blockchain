// 投票の方向（コントラクトの enum に対応）
// Up=0, Down=1, Left=2, Right=3
export const Direction = { Up: 0, Down: 1, Left: 2, Right: 3 } as const;

export const DIRECTION_LABEL: Record<number, string> = {
  0: "Up",
  1: "Down",
  2: "Left",
  3: "Right",
};
