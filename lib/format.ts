export function formatNum(n: number | undefined | null): string {
  return Number(n || 0).toLocaleString('ms-MY');
}
