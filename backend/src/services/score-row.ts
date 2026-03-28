export type PersistedScoreRow = {
  player_name: string;
  score: number;
  percentage: number;
  total_questions: number;
  elapsed_seconds: number | null;
  completed_at: string | null;
};

export function isPersistedScoreRow(value: unknown): value is PersistedScoreRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.player_name === "string" &&
    typeof candidate.score === "number" &&
    typeof candidate.percentage === "number" &&
    typeof candidate.total_questions === "number" &&
    (candidate.elapsed_seconds === null || typeof candidate.elapsed_seconds === "number") &&
    (candidate.completed_at === null || typeof candidate.completed_at === "string")
  );
}

export function mapPersistedScoreRow(row: PersistedScoreRow) {
  return {
    playerName: row.player_name,
    score: row.score,
    percentage: row.percentage,
    totalQuestions: row.total_questions,
    elapsedSeconds: row.elapsed_seconds,
    completedAt: row.completed_at,
  };
}
