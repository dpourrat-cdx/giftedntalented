export function normalizePlayerName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 40);
}

export function normalizeElapsedSeconds(value: number | null | undefined) {
  if (value == null) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}
