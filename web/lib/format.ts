/**
 * Money formatting shared by the campaign page, thermometer, and report.
 * Whole-dollar amounts render without cents ($600); partial amounts show cents ($612.50).
 */
export function formatUsd(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}
