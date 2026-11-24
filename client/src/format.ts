export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function recordLabel(count: number): string {
  return count === 1 ? "1 record" : `${count} records`;
}
