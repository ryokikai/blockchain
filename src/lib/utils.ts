export const ROUND_DURATION = 600;

export function formatRoundTime(roundId: number | bigint) {
  const id = Number(roundId);
  const startDate = new Date(id * ROUND_DURATION * 1000);
  const endDate = new Date((id + 1) * ROUND_DURATION * 1000);
  const fmt = (d: Date) =>
    `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}

export function getCurrentRoundId() {
  return Math.floor(Date.now() / 1000 / ROUND_DURATION);
}
