import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const CAREGIVER_API_URL = (process.env.EXPO_PUBLIC_CAREGIVER_API_URL || "").replace(/\/$/, "");
export const PATIENT_KEY = "clearcue.caregiver.patient.v1";
export const CAREGIVER_KEY = "clearcue.caregiver.receiver.v1";
const PROJECT_ID = "b098a7c8-a84b-4f12-9f41-67c63e292c78";
const storeOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
let patientSyncQueue: Promise<void> = Promise.resolve();

export type CaregiverSchedule = { id: string; minuteOfDay: number };
export type CaregiverRecord = { doseId: string; date: string; status: "taken" | "late" | "skipped" };

export async function caregiverRequest<T>(
  path: string,
  body: object = {},
  secret?: string,
): Promise<T> {
  if (!CAREGIVER_API_URL.startsWith("https://")) throw new Error("not-configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${CAREGIVER_API_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const result: unknown = await response.json();
    if (!response.ok) throw new Error(`service-${response.status}`);
    return result as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getPatientSecret() {
  return SecureStore.getItemAsync(PATIENT_KEY);
}

export async function getCaregiverSecret() {
  return SecureStore.getItemAsync(CAREGIVER_KEY);
}

export async function savePatientSecret(secret: string) {
  await SecureStore.setItemAsync(PATIENT_KEY, secret, storeOptions);
}

export async function saveCaregiverSecret(secret: string) {
  await SecureStore.setItemAsync(CAREGIVER_KEY, secret, storeOptions);
}

export async function deletePatientConnection() {
  const secret = await getPatientSecret();
  if (!secret) return;
  await patientSyncQueue.catch(() => undefined);
  try {
    await caregiverRequest("/plan/delete", {}, secret);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "service-401") throw error;
  }
  await SecureStore.deleteItemAsync(PATIENT_KEY);
}

export function queuePatientSync(secret: string, schedule: CaregiverSchedule[], records: CaregiverRecord[]) {
  patientSyncQueue = patientSyncQueue.catch(() => undefined).then(async () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    await caregiverRequest("/plan/sync", { timezone, doses: schedule, records }, secret);
    await caregiverRequest("/plan/pause", { paused: false }, secret);
  });
  return patientSyncQueue;
}

export function queuePatientPause(secret: string) {
  patientSyncQueue = patientSyncQueue.catch(() => undefined).then(async () => {
    await caregiverRequest("/plan/pause", { paused: true }, secret);
  });
  return patientSyncQueue;
}

export async function caregiverPushToken(prompt = true) {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("caregiver-alerts", {
      name: "Caregiver alerts",
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted || !prompt ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("permission-denied");
  return (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data;
}
