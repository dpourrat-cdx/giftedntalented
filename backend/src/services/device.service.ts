import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { normalizePlayerName } from "../utils/normalize.js";

type RegisterDeviceInput = {
  deviceToken: string;
  platform: "android" | "web";
  clientType: "android" | "web";
  playerName?: string;
  appVersion?: string;
};

export class DeviceService {
  async registerDevice(input: RegisterDeviceInput) {
    const { data, error } = await supabase
      .from("notification_devices")
      .upsert(
        {
          device_token: input.deviceToken,
          platform: input.platform,
          client_type: input.clientType,
          player_name: input.playerName ? normalizePlayerName(input.playerName) : null,
          app_version: input.appVersion ?? null,
          is_active: true,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "device_token" },
      )
      .select("id, platform, client_type, player_name, app_version, is_active, updated_at, last_seen_at")
      .single();

    if (error) {
      throw new AppError(502, "DEVICE_REGISTER_FAILED", "The device token could not be registered.", error);
    }

    return data;
  }

  async unregisterDevice(deviceToken: string) {
    const { error } = await supabase
      .from("notification_devices")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("device_token", deviceToken);

    if (error) {
      throw new AppError(502, "DEVICE_UNREGISTER_FAILED", "The device token could not be unregistered.", error);
    }

    return {
      success: true,
    };
  }

  async getActiveAndroidTokensForTarget(
    target: { type: "token"; token: string } | { type: "player"; playerName: string } | { type: "allAndroid" },
  ) {
    if (target.type === "token") {
      return [target.token];
    }

    let query = supabase
      .from("notification_devices")
      .select("device_token")
      .eq("platform", "android")
      .eq("is_active", true);

    if (target.type === "player") {
      query = query.eq("player_name", normalizePlayerName(target.playerName));
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(502, "DEVICE_LOOKUP_FAILED", "The target device tokens could not be loaded.", error);
    }

    return [...new Set((data ?? []).map((row) => row.device_token))];
  }

  async deactivateInvalidTokens(tokens: string[]) {
    if (tokens.length === 0) {
      return;
    }

    const { error } = await supabase
      .from("notification_devices")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in("device_token", tokens);

    if (error) {
      throw new AppError(502, "DEVICE_DEACTIVATE_FAILED", "Invalid device tokens could not be deactivated.", error);
    }
  }
}
