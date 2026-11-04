/** Keep the server's hundredth-of-a-percent precision in every results view. */
export function formatVotePercentage(value: number, locale: string) {
  return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}
