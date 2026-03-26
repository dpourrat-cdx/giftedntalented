import bcrypt from "bcryptjs";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { normalizePlayerName } from "../utils/normalize.js";

function mapScoreRow(row: Record<string, unknown>) {
  return {
    playerName: row.player_name,
    score: row.score,
    percentage: row.percentage,
    totalQuestions: row.total_questions,
    elapsedSeconds: row.elapsed_seconds,
    completedAt: row.completed_at,
  };
}

export class ScoreService {
  async getPlayerRecord(playerName: string) {
    const normalizedName = normalizePlayerName(playerName);
    const { data, error } = await supabase.rpc("get_player_top_score", {
      target_player_name: normalizedName,
    });

    if (error) {
      throw new AppError(502, "SUPABASE_READ_FAILED", "The score record could not be loaded.", error);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapScoreRow(data[0]);
  }
  async resetScores(resetPin: string) {
    const { data, error } = await supabase
      .from("app_admin_settings")
      .select("reset_pin_hash")
      .eq("id", true)
      .single();

    if (error) {
      throw new AppError(502, "RESET_PIN_LOOKUP_FAILED", "The reset PIN could not be verified.", error);
    }

    const resetPinHash = data?.reset_pin_hash;
    if (!resetPinHash) {
      throw new AppError(409, "RESET_PIN_NOT_CONFIGURED", "The reset PIN has not been configured yet.");
    }

    const matches = await bcrypt.compare(resetPin, resetPinHash);
    if (!matches) {
      throw new AppError(401, "INVALID_RESET_PIN", "The reset PIN did not match.");
    }

    const { count, error: countError } = await supabase
      .from("test_scores")
      .select("id", { count: "exact", head: true });

    if (countError) {
      throw new AppError(502, "RESET_COUNT_FAILED", "The score reset could not be prepared.", countError);
    }

    const { count: attemptCount, error: attemptCountError } = await supabase
      .from("score_attempts")
      .select("id", { count: "exact", head: true });

    if (attemptCountError) {
      throw new AppError(502, "RESET_COUNT_FAILED", "The score reset could not be prepared.", attemptCountError);
    }

    const { error: deleteError } = await supabase
      .from("test_scores")
      .delete()
      .not("id", "is", null);

    if (deleteError) {
      throw new AppError(502, "RESET_DELETE_FAILED", "The score records could not be cleared.", deleteError);
    }

    const { error: deleteAttemptsError } = await supabase
      .from("score_attempts")
      .delete()
      .not("id", "is", null);

    if (deleteAttemptsError) {
      throw new AppError(502, "RESET_DELETE_FAILED", "The score attempts could not be cleared.", deleteAttemptsError);
    }

    return {
      deletedCount: count ?? 0,
      deletedAttemptCount: attemptCount ?? 0,
      resetAt: new Date().toISOString(),
    };
  }
}
