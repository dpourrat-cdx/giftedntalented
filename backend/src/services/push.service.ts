import { getFirebaseMessaging } from "../lib/firebase.js";
import { AppError } from "../utils/errors.js";
import { DeviceService } from "./device.service.js";

type PushInput = {
  target: { type: "token"; token: string } | { type: "player"; playerName: string } | { type: "allAndroid" };
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
};

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export class PushService {
  constructor(private readonly deviceService: DeviceService) {}

  async sendPush(input: PushInput) {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      throw new AppError(503, "FCM_NOT_CONFIGURED", "FCM is not configured for this backend yet.");
    }

    const tokens = await this.deviceService.getActiveAndroidTokensForTarget(input.target);
    if (tokens.length === 0) {
      return {
        attempted: 0,
        succeeded: 0,
        failed: 0,
      };
    }

    const invalidTokens: string[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const tokenChunk of chunk(tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenChunk,
        notification: input.notification,
        data: input.data,
      });

      succeeded += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((entry, index) => {
        if (!entry.success) {
          const code = entry.error?.code ?? "";
          if (
            code.includes("registration-token-not-registered") ||
            code.includes("invalid-registration-token")
          ) {
            invalidTokens.push(tokenChunk[index]);
          }
        }
      });
    }

    await this.deviceService.deactivateInvalidTokens(invalidTokens);

    return {
      attempted: tokens.length,
      succeeded,
      failed,
    };
  }
}
