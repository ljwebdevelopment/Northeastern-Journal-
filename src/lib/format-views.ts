/**
 * Formats a read count the way a newsroom would print it.
 *
 * Rounding happens before the unit is chosen, so a number that rounds up
 * past its unit rolls over: 999,999 reads as "1M", not "1000K".
 */
export function formatViews(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count < 1000) return String(Math.round(count));

  const round = (value: number) =>
    value >= 10 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, "");

  const thousands = round(count / 1000);
  if (Number(thousands) < 1000) return `${thousands}K`;

  const millions = round(count / 1_000_000);
  if (Number(millions) < 1000) return `${millions}M`;

  return `${round(count / 1_000_000_000)}B`;
}
