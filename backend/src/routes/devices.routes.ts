import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { DeviceService } from "../services/device.service.js";
import { registerDeviceBodySchema, unregisterDeviceBodySchema } from "../validators/device.validators.js";

const deviceService = new DeviceService();

export const devicesRouter = Router();

devicesRouter.post(
  "/devices/register",
  writeLimiter,
  validate({ body: registerDeviceBodySchema }),
  asyncHandler(async (request, response) => {
    const device = await deviceService.registerDevice(request.body);
    response.status(201).json({
      success: true,
      device,
      requestId: request.requestId,
    });
  }),
);

devicesRouter.post(
  "/devices/unregister",
  writeLimiter,
  validate({ body: unregisterDeviceBodySchema }),
  asyncHandler(async (request, response) => {
    const result = await deviceService.unregisterDevice(request.body.deviceToken);
    response.json({
      ...result,
      requestId: request.requestId,
    });
  }),
);
