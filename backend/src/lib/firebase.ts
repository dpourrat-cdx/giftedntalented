import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { env } from "../config/env.js";

let initialized = false;

function ensureFirebase() {
  if (!env.isFcmConfigured) {
    return null;
  }

  if (!initialized && getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: env.FCM_PROJECT_ID,
        clientEmail: env.FCM_CLIENT_EMAIL,
        privateKey: env.FCM_PRIVATE_KEY,
      }),
    });
    initialized = true;
  }

  return getMessaging();
}

export function getFirebaseMessaging() {
  return ensureFirebase();
}
