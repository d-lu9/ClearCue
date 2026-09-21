import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import {
  CatalogMedication,
  MEDICATION_FILTERS,
  MedicationFilter,
  medicationDailyMedUrl,
  searchMedications,
} from "./data/medications";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  AppState,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

type Eye = "Left eye" | "Right eye" | "Both eyes";
type Supply = {
  bottleMl: number;
  dropsPerApplication: number;
  applicationsPerDay: number;
  openedOn: string;
  warningDays: number;
  dropsPerMl: number;
};
type PrescriptionDetails = {
  prescriber?: string;
  prescriberPhone?: string;
  pharmacy?: string;
  pharmacyPhone?: string;
  rxNumber?: string;
  notes?: string;
};
type Dose = {
  id: string;
  name: string;
  eye: Eye;
  color: string;
  time: string;
  completed: boolean;
  scheduleGroupId?: string;
  catalogId?: string;
  taperPlan?: string;
  supply?: Supply;
  prescription?: PrescriptionDetails;
};
type AdherenceStatus = "taken" | "late" | "missed" | "skipped";
type DoseLog = {
  doseId: string;
  date: string;
  status: AdherenceStatus;
  completedAt?: string;
};
type ReminderCheckup = {
  tone: "ready" | "attention";
  message: string;
  next: string | null;
};
type AppSettings = {
  largeText: boolean;
  highContrast: boolean;
  colorBlindMode: boolean;
  reduceMotion: boolean;
  hideNotificationDetails: boolean;
  appLockEnabled: boolean;
  language: "en" | "es";
};
const AccessibilityPresentationContext = createContext({
  largeText: false,
  monochrome: false,
});
const STARTING_DOSES: Dose[] = [
  {
    id: "1",
    name: "Prednisolone Acetate",
    eye: "Right eye",
    color: "#E88C3A",
    time: "8:00 AM",
    completed: false,
  },
  {
    id: "2",
    name: "Moxifloxacin",
    eye: "Right eye",
    color: "#35A7D9",
    time: "8:05 AM",
    completed: false,
  },
  {
    id: "3",
    name: "Artificial Tears",
    eye: "Both eyes",
    color: "#876CC4",
    time: "1:00 PM",
    completed: false,
  },
];
const COLORS = ["#35A7D9", "#E88C3A", "#876CC4", "#25A77B", "#DE5D6A"];
const NO_COLOR = "none";
const TIME_OPTIONS = [
  "6:00 AM",
  "7:00 AM",
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
];
const STORAGE_KEY = "clearcue-doses-v1";
const HISTORY_KEY = "clearcue-adherence-v1";
const TRACKING_START_KEY = "clearcue-tracking-start-v1";
const SETTINGS_KEY = "clearcue-accessibility-settings-v1";
const ONBOARDING_KEY = "clearcue-onboarding-v1";
const DEMO_MODE_KEY = "clearcue-demo-mode-v1";
const DEFAULT_SETTINGS: AppSettings = {
  largeText: true,
  highContrast: true,
  colorBlindMode: false,
  reduceMotion: false,
  hideNotificationDetails: true,
  appLockEnabled: false,
  language: "en",
};
const COLOR_NAMES: Record<string, { en: string; es: string }> = {
  "#35A7D9": { en: "Blue", es: "Azul" },
  "#E88C3A": { en: "Orange", es: "Naranja" },
  "#876CC4": { en: "Purple", es: "Morado" },
  "#25A77B": { en: "Green", es: "Verde" },
  "#DE5D6A": { en: "Red", es: "Rojo" },
};
const COPY = {
  en: {
    today: "TODAY",
    greeting: "Good morning.",
    subheading: "Your eye-care routine, made easier.",
    routine: "TODAY’S ROUTINE",
    next: "UP NEXT",
    schedule: "Today’s schedule",
    insights: "Insights",
    close: "Close",
    done: "Done",
    add: "Add eye drop",
    settings: "Accessibility settings",
    reminders: "Daily reminders",
    enable: "Enable",
    synced: "Reminders on",
    spacing: "Spacing matters",
    spacingDetail:
      "Leave at least 5 minutes between different drops in the same eye.",
    insightsReport: "Insights & report",
    insightsDetail: "Review progress and share a read-only report",
    privacyData: "Privacy & data",
    privacyDetail: "Control notifications and local data",
    settingsDetail: "Accessibility and language",
    demo: "DEMO MODE — sample data only",
    dueToday: "Due today",
    completed: "Completed",
  },
  es: {
    today: "HOY",
    greeting: "Buenos días.",
    subheading: "Tu rutina de cuidado ocular, más sencilla.",
    routine: "RUTINA DE HOY",
    next: "PRÓXIMAMENTE",
    schedule: "Horario de hoy",
    insights: "Estadísticas",
    close: "Cerrar",
    done: "Listo",
    add: "Añadir gotas",
    settings: "Ajustes de accesibilidad",
    reminders: "Recordatorios diarios",
    enable: "Activar",
    synced: "Recordatorios activos",
    spacing: "El espacio importa",
    spacingDetail:
      "Deja al menos 5 minutos entre gotas diferentes en el mismo ojo.",
    insightsReport: "Estadísticas e informe",
    insightsDetail: "Revisa el progreso y comparte un informe de solo lectura",
    privacyData: "Privacidad y datos",
    privacyDetail: "Controla las notificaciones y los datos locales",
    settingsDetail: "Accesibilidad e idioma",
    demo: "MODO DEMO — solo datos de muestra",
    dueToday: "Pendiente hoy",
    completed: "Completado",
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DOSE_REMINDER_CATEGORY = "clearcue-dose-reminder";

const sharedStyles = StyleSheet.create({
  safeAreaBreathingRoom: { paddingTop: 16 },
});

function SafeAreaView({
  style,
  ...props
}: React.ComponentProps<typeof NativeSafeAreaView>) {
  const needsHeaderGap = style !== extraStyles.onboardingScreen;
  return (
    <NativeSafeAreaView
      {...props}
      style={[style, needsHeaderGap && sharedStyles.safeAreaBreathingRoom]}
    />
  );
}

const extraStyles = StyleSheet.create({
  appLockScreen: {
    flex: 1,
    backgroundColor: "#FAF7F2",
    padding: 28,
    justifyContent: "space-between",
  },
  appLockContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  appLockTitle: {
    color: "#3A302B",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "center",
  },
  appLockBody: {
    color: "#6F625B",
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 310,
    textAlign: "center",
  },
  supplySection: {
    backgroundColor: "#EFF8F5",
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  detailsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: "#E7DDD4",
  },
  supplyHelp: { color: "#6F625B", fontSize: 13, lineHeight: 19, marginTop: -6 },
  supplyRow: { flexDirection: "row", gap: 10 },
  supplyHalf: { flex: 1 },
  supplyFootnote: {
    color: "#6F625B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  supplyStatus: {
    fontSize: 11,
    fontWeight: "800",
    color: "#557A66",
    marginTop: 5,
  },
  supplyWarning: { color: "#B36A18" },
  timePickerButton: {
    height: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timePickerValue: { color: "#3A302B", fontSize: 17, fontWeight: "700" },
  timePickerArrow: { color: "#B85C4A", fontSize: 18, fontWeight: "800" },
  timeMenu: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 13,
    padding: 8,
    gap: 7,
  },
  timeMenuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  timeOption: {
    width: "31%",
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#FAF7F2",
  },
  timeOptionSelected: {
    backgroundColor: "#F5E5D8",
    borderWidth: 1,
    borderColor: "#B85C4A",
  },
  timeOptionText: { color: "#6F625B", fontSize: 15, lineHeight: 21, fontWeight: "800" },
  timeOptionTextSelected: { color: "#B85C4A" },
  clockPicker: {
    alignItems: "center",
    backgroundColor: "#FAF7F2",
    borderRadius: 12,
    padding: 10,
    gap: 9,
  },
  clockDial: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E7DDD4",
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  clockHour: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  clockHourSelected: { backgroundColor: "#B85C4A" },
  clockHourText: { color: "#3A302B", fontSize: 14, lineHeight: 19, fontWeight: "800" },
  clockHourTextSelected: { color: "#FFFFFF" },
  clockCenterText: {
    alignSelf: "center",
    color: "#B85C4A",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 88,
  },
  clockMinuteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  clockMinute: {
    width: 39,
    borderRadius: 9,
    paddingVertical: 7,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  clockMinuteSelected: { backgroundColor: "#F5E5D8", borderWidth: 1, borderColor: "#B85C4A" },
  clockMinuteText: { color: "#6F625B", fontSize: 14, lineHeight: 19, fontWeight: "800" },
  clockMinuteTextSelected: { color: "#B85C4A" },
  clockPeriodRow: { flexDirection: "row", gap: 8 },
  clockPeriod: {
    minWidth: 78,
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  clockPeriodSelected: { backgroundColor: "#F5E5D8", borderWidth: 1, borderColor: "#B85C4A" },
  clockPeriodText: { color: "#6F625B", fontSize: 14, lineHeight: 19, fontWeight: "800" },
  clockPeriodTextSelected: { color: "#B85C4A" },
  dateMenu: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 13,
    padding: 10,
    gap: 9,
  },
  dateMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateMonthButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FAF7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  dateMonthButtonText: { color: "#B85C4A", fontSize: 24, lineHeight: 27 },
  dateMonthLabel: { color: "#3A302B", fontSize: 15, fontWeight: "800" },
  dateWeekRow: { flexDirection: "row" },
  dateWeekday: {
    width: "14.2857%",
    textAlign: "center",
    color: "#6F625B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
  dateGrid: { flexDirection: "row", flexWrap: "wrap" },
  dateCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  dateCellSelected: { backgroundColor: "#B85C4A" },
  dateCellText: { color: "#3A302B", fontSize: 14, lineHeight: 19, fontWeight: "700" },
  dateCellTextSelected: { color: "#FFFFFF" },
  extraTimes: {
    backgroundColor: "#EFF8F5",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  extraTimeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  removeTime: {
    width: 38,
    height: 50,
    marginTop: 21,
    borderRadius: 12,
    backgroundColor: "#FBE7E4",
    alignItems: "center",
    justifyContent: "center",
  },
  removeTimeText: { color: "#B3362D", fontSize: 23, lineHeight: 25 },
  addTime: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B85C4A",
    borderRadius: 11,
    padding: 11,
    backgroundColor: "#FFFFFF",
  },
  addTimeText: { color: "#B85C4A", fontSize: 14, fontWeight: "800" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  languageSupportNote: {
    color: "#6F625B",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#E7DDD4",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterChipSelected: { borderColor: "#B85C4A", backgroundColor: "#F5E5D8" },
  filterChipText: { color: "#6F625B", fontSize: 12, fontWeight: "800" },
  filterChipTextSelected: { color: "#B85C4A" },
  onboardingScreen: {
    flex: 1,
    backgroundColor: "#FAF7F2",
    padding: 28,
    justifyContent: "space-between",
  },
  onboardingContent: { flex: 1, justifyContent: "center", gap: 18 },
  onboardingTitle: {
    color: "#3A302B",
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "800",
    letterSpacing: -1,
  },
  onboardingBody: { color: "#6F625B", fontSize: 17, lineHeight: 25 },
  onboardingDots: { flexDirection: "row", gap: 7, marginTop: 12 },
  onboardingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C6DBD6",
  },
  onboardingDotActive: { width: 24, backgroundColor: "#B85C4A" },
  onboardingFooter: { gap: 14 },
  onboardingSkip: { alignItems: "center", padding: 10 },
  guideStep: {
    flexDirection: "row",
    gap: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 15,
    padding: 14,
  },
  guideNumber: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B85C4A",
  },
  guideNumberText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  guideTitle: { color: "#3A302B", fontSize: 15, fontWeight: "800" },
  guideDetail: { color: "#6F625B", fontSize: 13, lineHeight: 19, marginTop: 4 },
  guideSource: { color: "#6F625B", fontSize: 11, lineHeight: 16 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  historyDate: { color: "#3A302B", fontSize: 14, fontWeight: "800" },
  historyTime: { color: "#6F625B", fontSize: 11, marginTop: 3 },
  historyBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  historyBadgeText: { fontSize: 11, fontWeight: "800" },
  eraseSection: {
    backgroundColor: "#FBE7E4",
    borderRadius: 14,
    padding: 15,
    gap: 8,
  },
  eraseTitle: { color: "#8F302A", fontSize: 14, fontWeight: "800" },
  eraseText: { color: "#8F302A", fontSize: 12, lineHeight: 18 },
  eraseButton: {
    borderWidth: 1,
    borderColor: "#B3362D",
    borderRadius: 11,
    padding: 12,
    alignItems: "center",
    marginTop: 5,
  },
  eraseButtonText: { color: "#B3362D", fontSize: 13, fontWeight: "800" },
  deleteConfirm: {
    backgroundColor: "#FBE7E4",
    borderRadius: 14,
    padding: 15,
    gap: 9,
  },
  deleteConfirmButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#B3362D",
    borderRadius: 11,
    padding: 12,
  },
  deleteConfirmButtonText: { color: "#FFFFFF", fontWeight: "800" },
  quickTools: { gap: 9, marginTop: 18 },
  homeAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 15,
    padding: 13,
  },
  homeActionIcon: {
    color: "#B85C4A",
    fontSize: 19,
    fontWeight: "800",
    width: 22,
    textAlign: "center",
  },
  homeActionLabel: { color: "#3A302B", fontSize: 14, fontWeight: "800" },
  homeActionDetail: { color: "#6F625B", fontSize: 11, marginTop: 2 },
  homeActionArrow: {
    color: "#B85C4A",
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "800",
  },
  medicationCard: {
    flexDirection: "row",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 18,
  },
  completedMedicationCard: { backgroundColor: "#FCF9F5" },
  medicationStripe: { width: 7 },
  medicationBody: { flex: 1, padding: 15 },
  medicationTop: { flexDirection: "row", gap: 12 },
  timeBlock: { alignItems: "flex-end", gap: 6 },
  groupedTimes: { marginTop: 14, gap: 9 },
  groupedTimeRow: {
    borderTopWidth: 1,
    borderTopColor: "#F2EBE4",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
  },
  statusComplete: { color: "#557A66", backgroundColor: "#E7F0E9" },
  statusDue: { color: "#9B6B3D", backgroundColor: "#F5E5D8" },
  statusLate: { color: "#A33C34", backgroundColor: "#FBE7E4" },
  missedDoseSafety: {
    backgroundColor: "#FFF7E9",
    borderRadius: 10,
    padding: 11,
    gap: 9,
  },
  missedDoseSafetyText: { color: "#704D30", fontSize: 13, lineHeight: 18 },
  missedDoseActions: { flexDirection: "row", gap: 8 },
  reminderCheckup: { marginTop: -8 },
  reminderCheckupResult: {
    backgroundColor: "#E7F0E9",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  reminderCheckupAttention: { backgroundColor: "#FFF7E9" },
  reminderCheckupText: { color: "#3A302B", fontSize: 13, lineHeight: 18 },
  reminderCheckupNext: { color: "#557A66", fontSize: 13, fontWeight: "800" },
  monochromeCheckup: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#000000" },
  medicationFooter: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#F2EBE4",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLinks: { flexDirection: "row", gap: 7, alignItems: "center" },
  cardLink: { color: "#B85C4A", fontSize: 12, fontWeight: "800" },
  cardLinkDivider: { color: "#D6C4B8", fontSize: 14 },
  emptyRoutine: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#F5E5D8",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-25deg" }],
  },
  emptyIconText: { color: "#B85C4A", fontSize: 31, fontWeight: "800" },
  emptyTitle: {
    color: "#3A302B",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  emptyText: {
    color: "#6F625B",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 5,
  },
  emptyGuide: { paddingVertical: 7 },
  splashScreen: {
    position: "absolute",
    inset: 0,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF7F2",
  },
  splashIcon: { width: 124, height: 124, borderRadius: 28 },
  splashTitle: {
    color: "#B85C4A",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.7,
    marginTop: 18,
  },
  splashSubtitle: { color: "#6F625B", fontSize: 14, marginTop: 6 },
  welcomeGuideButton: { alignItems: "center", paddingVertical: 9 },
  demoBanner: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#F5E5D8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  demoBannerText: {
    color: "#9B6B3D",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  monochromeSurface: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#000000" },
  monochromeIcon: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#000000" },
  monochromeText: { color: "#000000" },
  monochromeMutedText: { color: "#303030" },
  monochromeStatusBadge: { color: "#FFFFFF", backgroundColor: "#000000" },
});

function parseReminderTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}
function formatReminderTime(hour: number, minute: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function buildDemoRoutine() {
  const today = new Date();
  const opened = new Date(today);
  opened.setDate(opened.getDate() - 18);
  const doses: Dose[] = [
    {
      id: "demo-latanoprost",
      name: "Latanoprost",
      eye: "Both eyes",
      color: "#876CC4",
      time: "8:00 AM",
      completed: true,
      catalogId: "latanoprost",
      supply: {
        bottleMl: 2.5,
        dropsPerApplication: 1,
        applicationsPerDay: 1,
        openedOn: dateKey(opened),
        warningDays: 7,
        dropsPerMl: 20,
      },
    },
    {
      id: "demo-prednisolone",
      name: "Prednisolone Acetate",
      eye: "Right eye",
      color: "#E88C3A",
      time: "1:00 PM",
      completed: true,
      catalogId: "prednisolone",
      taperPlan: "Follow clinician instructions on the prescription label.",
      supply: {
        bottleMl: 5,
        dropsPerApplication: 1,
        applicationsPerDay: 3,
        openedOn: dateKey(opened),
        warningDays: 7,
        dropsPerMl: 20,
      },
    },
    {
      id: "demo-tears",
      name: "Artificial Tears",
      eye: "Both eyes",
      color: "#35A7D9",
      time: "8:00 PM",
      completed: false,
      catalogId: "artificial-tears",
    },
  ];
  const history: DoseLog[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = new Date(today);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const date = dateKey(day);
    doses.forEach((dose, index) => {
      if (
        (offset === 4 && index === 1) ||
        (offset === 2 && index === 2) ||
        (offset === 0 && index === 2)
      )
        return;
      const status: DoseLog["status"] =
        (offset === 3 && index === 0) || (offset === 1 && index === 1)
          ? "late"
          : "taken";
      const completedAt = new Date(day);
      completedAt.setHours(
        index === 1 && status === "late" ? 14 : index === 0 ? 8 : 20,
        5,
        0,
        0,
      );
      history.push({
        doseId: dose.id,
        date,
        status,
        completedAt: completedAt.toISOString(),
      });
    });
  }
  return {
    doses,
    history,
    trackingStart: dateKey(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
    ),
  };
}
function scheduledDate(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const clock = parseReminderTime(time);
  return clock
    ? new Date(year, month - 1, day, clock.hour, clock.minute)
    : null;
}
type TodayDoseState = "upcoming" | "due" | "completed" | "late" | "skipped";
function todayDoseState(dose: Dose, history: DoseLog[]): TodayDoseState {
  const today = dateKey(new Date());
  const logged = history.find((item) => item.doseId === dose.id && item.date === today);
  if (logged?.status === "skipped") return "skipped";
  if (logged?.status === "taken" || logged?.status === "late") return "completed";
  const due = scheduledDate(today, dose.time);
  if (!due || due.getTime() > Date.now()) return "upcoming";
  if (Date.now() <= due.getTime() + 30 * 60_000) return "due";
  return "late";
}
function timePeriod(time: string) {
  const clock = parseReminderTime(time);
  if (!clock) return "other";
  return clock.hour < 12
    ? "morning"
    : clock.hour < 17
      ? "afternoon"
      : "evening";
}
function sharesAnEye(first: Eye, second: Eye) {
  return first === "Both eyes" || second === "Both eyes" || first === second;
}
function minutesBetween(first: string, second: string) {
  const a = parseReminderTime(first);
  const b = parseReminderTime(second);
  if (!a || !b) return null;
  const difference = Math.abs(
    a.hour * 60 + a.minute - (b.hour * 60 + b.minute),
  );
  return Math.min(difference, 1440 - difference);
}
function isValidIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
function supplyEstimate(supply?: Supply) {
  if (
    !supply ||
    supply.bottleMl <= 0 ||
    supply.dropsPerApplication <= 0 ||
    supply.applicationsPerDay <= 0
  )
    return null;
  const opened = new Date(`${supply.openedOn}T00:00:00`);
  if (Number.isNaN(opened.getTime())) return null;
  const dailyDrops = supply.dropsPerApplication * supply.applicationsPerDay;
  const durationDays = Math.max(
    0,
    Math.floor((supply.bottleMl * supply.dropsPerMl) / dailyDrops),
  );
  const finish = new Date(opened);
  finish.setDate(finish.getDate() + durationDays);
  const remaining = Math.max(
    0,
    Math.ceil((finish.getTime() - Date.now()) / 86400000),
  );
  const warningDate = new Date(finish);
  warningDate.setDate(warningDate.getDate() - supply.warningDays);
  warningDate.setHours(9, 0, 0, 0);
  return {
    days: remaining,
    isWarning: remaining <= supply.warningDays,
    warningDate,
  };
}
function groupRoutineDoses(doses: Dose[]) {
  const groups = new Map<string, Dose[]>();
  doses.forEach((dose) => {
    const id = dose.scheduleGroupId ?? dose.id;
    groups.set(id, [...(groups.get(id) ?? []), dose]);
  });
  return [...groups.entries()]
    .map(([id, groupedDoses]) => ({
      id,
      doses: [...groupedDoses].sort(
        (a, b) =>
          (parseReminderTime(a.time)?.hour ?? 0) * 60 +
          (parseReminderTime(a.time)?.minute ?? 0) -
            ((parseReminderTime(b.time)?.hour ?? 0) * 60 +
              (parseReminderTime(b.time)?.minute ?? 0)),
      ),
    }))
    .sort((a, b) => a.doses[0].name.localeCompare(b.doses[0].name));
}
function localizedEye(eye: Eye, language: "en" | "es") {
  if (language === "en") return eye;
  return eye === "Left eye"
    ? "Ojo izquierdo"
    : eye === "Right eye"
      ? "Ojo derecho"
      : "Ambos ojos";
}
function localizedMedicationFilter(filter: MedicationFilter, language: "en" | "es") {
  if (language === "en") return filter;
  return ({
    All: "Todos",
    Glaucoma: "Glaucoma",
    "Dry eye & lubricants": "Ojo seco y lubricantes",
    Allergy: "Alergia",
    Infection: "Infección",
    "Inflammation & post-op": "Inflamación y posoperatorio",
    "Redness relief": "Alivio del enrojecimiento",
  } as Record<string, string>)[filter] ?? filter;
}

async function scheduleReminders(
  doses: Dose[],
  hideNotificationDetails: boolean,
  language: "en" | "es",
) {
  const spanish = language === "es";
  await Notifications.cancelAllScheduledNotificationsAsync();
  const validDoses = doses
    .map((dose) => ({ dose, clock: parseReminderTime(dose.time) }))
    .filter(
      (item): item is { dose: Dose; clock: { hour: number; minute: number } } =>
        item.clock !== null,
  );
  for (const { dose, clock } of validDoses) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: spanish ? "Recordatorio de ClearCue" : "ClearCue reminder",
        body: hideNotificationDetails
          ? spanish
            ? "Un recordatorio programado de gotas está pendiente."
            : "A scheduled eye-drop reminder is due."
          : `${dose.name} · ${localizedEye(dose.eye, language)}`,
        sound: "default",
        categoryIdentifier: DOSE_REMINDER_CATEGORY,
        data: { doseId: dose.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: clock.hour,
        minute: clock.minute,
      },
    });
  }
  const refillDates = doses
    .map((dose) => ({ dose, estimate: supplyEstimate(dose.supply) }))
    .filter(
      (
        item,
      ): item is {
        dose: Dose;
        estimate: NonNullable<ReturnType<typeof supplyEstimate>>;
      } =>
        item.estimate !== null &&
        item.estimate.warningDate.getTime() > Date.now(),
  );
  for (const { dose, estimate } of refillDates) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: spanish ? "Estimación de reposición de ClearCue" : "ClearCue refill estimate",
        body: hideNotificationDetails
          ? spanish
            ? "Una estimación de suministro de medicamento necesita tu atención."
            : "A medication supply estimate needs your attention."
          : spanish
            ? `${dose.name} podría estar por terminarse. Confirma la reposición con tu farmacia o profesional.`
            : `${dose.name} may be running low. Confirm your refill with your pharmacy or clinician.`,
        sound: "default",
        data: { doseId: dose.id, kind: "refill-estimate" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: estimate.warningDate,
      },
    });
  }
  return validDoses.length;
}

export default function App() {
  const [doses, setDoses] = useState(STARTING_DOSES);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [time, setTime] = useState("9:00 AM");
  const [additionalTimes, setAdditionalTimes] = useState<string[]>([]);
  const [eye, setEye] = useState<Eye>("Right eye");
  const [color, setColor] = useState(NO_COLOR);
  const [taperPlan, setTaperPlan] = useState("");
  const [prescriber, setPrescriber] = useState("");
  const [prescriberPhone, setPrescriberPhone] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [pharmacyPhone, setPharmacyPhone] = useState("");
  const [rxNumber, setRxNumber] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [bottleMl, setBottleMl] = useState("");
  const [dropsPerApplication, setDropsPerApplication] = useState("1");
  const [applicationsPerDay, setApplicationsPerDay] = useState("1");
  const [openedOn, setOpenedOn] = useState(dateKey(new Date()));
  const [warningDays, setWarningDays] = useState("7");
  const [routineFormNotice, setRoutineFormNotice] = useState<{
    title: string;
    message: string;
    allowReview?: boolean;
  } | null>(null);
  const [selectedMedication, setSelectedMedication] =
    useState<CatalogMedication | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoModeNotice, setDemoModeNotice] = useState<string | null>(null);
  const demoTransitionInProgress = useRef(false);
  const reminderUpdateInProgress = useRef(false);
  const routineSaveInProgress = useRef(false);
  const handledNotificationResponses = useRef(new Set<string>());
  const previousLanguage = useRef(DEFAULT_SETTINGS.language);
  const personalSnapshot = useRef<{
    doses: Dose[];
    history: DoseLog[];
    trackingStart: string;
  } | null>(null);
  const personalReminders = useRef(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [remindersNeedRefresh, setRemindersNeedRefresh] = useState(false);
  const [reminderCheckup, setReminderCheckup] = useState<ReminderCheckup | null>(null);
  const [history, setHistory] = useState<DoseLog[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const homeScrollRef = useRef<ScrollView>(null);
  const insightsY = useRef(0);
  const [trackingStart, setTrackingStart] = useState(dateKey(new Date()));
  const [reportOpen, setReportOpen] = useState(false);
  const [routineReviewOpen, setRoutineReviewOpen] = useState(false);
  const [pendingRoutineSheet, setPendingRoutineSheet] = useState<
    "review" | "editor" | null
  >(null);
  const [routineConfirmed, setRoutineConfirmed] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [careToolsOpen, setCareToolsOpen] = useState(false);
  const [pendingCareSheet, setPendingCareSheet] = useState<
    "privacy" | "settings" | null
  >(null);
  const [showOnboardingAfterSettings, setShowOnboardingAfterSettings] =
    useState(false);
  const [historyDoseId, setHistoryDoseId] = useState<string | null>(null);
  const [reportDays, setReportDays] = useState<7 | 30>(7);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [appLocked, setAppLocked] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [showOnboardingAfterPrivacy, setShowOnboardingAfterPrivacy] =
    useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [launching, setLaunching] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const timer = setTimeout(
      () =>
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 360,
          useNativeDriver: true,
        }).start(() => setLaunching(false)),
      700,
    );
    return () => clearTimeout(timer);
  }, [splashOpacity]);
  useEffect(() => {
    async function restoreRoutine() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        const restoredDoses = saved
          ? (JSON.parse(saved) as Dose[])
          : STARTING_DOSES;
        if (saved) setDoses(restoredDoses);
        const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);
        const restoredHistory = savedHistory
          ? (JSON.parse(savedHistory) as DoseLog[])
          : restoredDoses
              .filter((dose) => dose.completed)
              .map((dose) => ({
                doseId: dose.id,
                date: dateKey(new Date()),
                status: "taken" as const,
                completedAt: new Date().toISOString(),
              }));
        setHistory(restoredHistory);
        const today = dateKey(new Date());
        setDoses(
          restoredDoses.map((dose) => ({
            ...dose,
            completed: restoredHistory.some(
              (log) => log.doseId === dose.id && log.date === today,
            ),
          })),
        );
        const savedTrackingStart =
          await AsyncStorage.getItem(TRACKING_START_KEY);
        if (savedTrackingStart) setTrackingStart(savedTrackingStart);
        const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
          const restoredSettings = {
            ...DEFAULT_SETTINGS,
            ...(JSON.parse(savedSettings) as AppSettings),
          };
          setSettings(restoredSettings);
          setAppLocked(restoredSettings.appLockEnabled);
        } else if (await AccessibilityInfo.isReduceMotionEnabled())
          setSettings((current) => ({ ...current, reduceMotion: true }));
        if (!(await AsyncStorage.getItem(ONBOARDING_KEY)))
          setOnboardingVisible(true);
        const scheduled =
          await Notifications.getAllScheduledNotificationsAsync();
        setRemindersEnabled(scheduled.length > 0);
        if (await AsyncStorage.getItem(DEMO_MODE_KEY)) {
          const demo = buildDemoRoutine();
          setDoses(demo.doses);
          setHistory(demo.history);
          setTrackingStart(demo.trackingStart);
          setDemoMode(true);
          setRemindersEnabled(false);
          await Notifications.cancelAllScheduledNotificationsAsync();
        }
      } catch {
        Alert.alert(
          "Could not restore saved routine / No se pudo restaurar la rutina guardada",
          "ClearCue will continue with the current routine. / ClearCue continuará con la rutina actual.",
        );
      } finally {
        setHydrated(true);
      }
    }
    restoreRoutine();
  }, []);
  useEffect(() => {
    if (hydrated && !demoMode)
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(doses)).catch(
        () => undefined,
      );
  }, [doses, hydrated, demoMode]);
  useEffect(() => {
    if (hydrated && !demoMode)
      void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(
        () => undefined,
      );
  }, [history, hydrated, demoMode]);
  useEffect(() => {
    if (hydrated && !demoMode)
      void AsyncStorage.setItem(TRACKING_START_KEY, trackingStart).catch(
        () => undefined,
      );
  }, [trackingStart, hydrated, demoMode]);
  useEffect(() => {
    if (hydrated)
      void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(
        () => undefined,
      );
  }, [settings, hydrated]);
  useEffect(() => {
    if (
      hydrated &&
      previousLanguage.current !== settings.language &&
      remindersEnabled
    )
      setRemindersNeedRefresh(true);
    previousLanguage.current = settings.language;
  }, [hydrated, remindersEnabled, settings.language]);
  useEffect(() => {
    function refreshDailyCompletion() {
      const today = dateKey(new Date());
      setDoses((current) => {
        let changed = false;
        const next = current.map((dose) => {
          const completed = history.some(
            (log) => log.doseId === dose.id && log.date === today,
          );
          if (dose.completed === completed) return dose;
          changed = true;
          return { ...dose, completed };
        });
        return changed ? next : current;
      });
    }
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refreshDailyCompletion();
        if (
          (state === "background" || state === "inactive") &&
          hydrated &&
          settings.appLockEnabled
        )
          setAppLocked(true);
      },
    );
    const timer = setInterval(refreshDailyCompletion, 60_000);
    return () => {
      appStateSubscription.remove();
      clearInterval(timer);
    };
  }, [history, hydrated, settings.appLockEnabled]);
  useEffect(() => {
    void Notifications.setNotificationCategoryAsync(DOSE_REMINDER_CATEGORY, [
      {
        identifier: "TAKEN",
        buttonTitle: settings.language === "es" ? "Tomada" : "Taken",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "SNOOZE",
        buttonTitle: settings.language === "es" ? "Posponer 10 min" : "Snooze 10 min",
        options: { opensAppToForeground: true },
      },
      {
        identifier: "SKIP",
        buttonTitle: settings.language === "es" ? "Omitir" : "Skip",
        options: { opensAppToForeground: true },
      },
    ]);
    async function handleNotificationResponse(
      response: Notifications.NotificationResponse,
    ) {
      if (!hydrated || demoMode) return;
      const doseId = response.notification.request.content.data?.doseId;
      const action = response.actionIdentifier;
      if (
        typeof doseId !== "string" ||
        !["TAKEN", "SKIP", "SNOOZE"].includes(action)
      )
        return;
      const responseKey = `${response.notification.request.identifier}:${action}`;
      if (handledNotificationResponses.current.has(responseKey)) return;
      handledNotificationResponses.current.add(responseKey);
      try {
        if (action === "TAKEN") recordDose(doseId, "taken");
        if (action === "SKIP") recordDose(doseId, "skipped");
        if (action === "SNOOZE")
          await Notifications.scheduleNotificationAsync({
            content: {
            title: settings.language === "es" ? "Recordatorio de ClearCue" : "ClearCue reminder",
            body: settings.hideNotificationDetails
              ? settings.language === "es"
                ? "Un recordatorio programado de gotas está pendiente."
                : "A scheduled eye-drop reminder is due."
              : settings.language === "es"
                ? "Tu recordatorio de gotas pospuesto está pendiente."
                : "Your snoozed eye-drop reminder is due.",
              sound: "default",
              categoryIdentifier: DOSE_REMINDER_CATEGORY,
              data: { doseId },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(Date.now() + 10 * 60_000),
            },
          });
        Notifications.clearLastNotificationResponse();
      } catch (error) {
        handledNotificationResponses.current.delete(responseKey);
        throw error;
      }
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void handleNotificationResponse(response).catch(() => undefined);
      },
    );
    if (hydrated)
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => response && handleNotificationResponse(response))
        .catch(() => undefined);
    return () => subscription.remove();
  }, [demoMode, doses, hydrated, settings.hideNotificationDetails, settings.language]);
  const accessibilityPresentation = useMemo(
    () => ({ largeText: settings.largeText, monochrome: settings.colorBlindMode }),
    [settings.largeText, settings.colorBlindMode],
  );
  const complete = doses.filter((dose) => dose.completed).length;
  const percentage = doses.length
    ? Math.round((complete / doses.length) * 100)
    : 0;
  const progress = useMemo(
    () => `${complete} of ${doses.length} completed`,
    [complete, doses.length],
  );
  const adherence = useMemo(
    () => buildAdherence(doses, history, trackingStart, 7, settings.language),
    [doses, history, trackingStart, settings.language],
  );
  const reportData = useMemo(
    () => buildAdherence(doses, history, trackingStart, reportDays, settings.language),
    [doses, history, trackingStart, reportDays, settings.language],
  );
  const historyDose = doses.find((dose) => dose.id === historyDoseId) ?? null;
  const routineGroups = useMemo(() => groupRoutineDoses(doses), [doses]);
  const copy = COPY[settings.language];
  const scaleText = settings.largeText ? styles.largeText : undefined;
  const scaleHeading = settings.largeText
    ? { fontSize: 46, lineHeight: 54 }
    : undefined;
  const scaleSectionTitle = settings.largeText
    ? { fontSize: 30, lineHeight: 37 }
    : undefined;
  function recordDose(id: string, requestedStatus: AdherenceStatus) {
    const dose = doses.find((item) => item.id === id);
    if (!dose) return;
    const today = dateKey(new Date());
    const due = scheduledDate(today, dose.time);
    const status =
      requestedStatus === "taken" &&
      due &&
      new Date().getTime() > due.getTime() + 30 * 60 * 1000
        ? "late"
        : requestedStatus;
    setDoses((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed: status !== "missed" && status !== "skipped" }
          : item,
      ),
    );
    setHistory((current) => [
      ...current.filter((log) => !(log.doseId === id && log.date === today)),
      {
        doseId: id,
        date: today,
        status,
        completedAt:
          status === "missed" || status === "skipped"
            ? undefined
            : new Date().toISOString(),
      },
    ]);
  }
  function toggleDose(id: string) {
    const dose = doses.find((item) => item.id === id);
    if (!dose) return;
    const today = dateKey(new Date());
    if (dose.completed) {
      setDoses((current) =>
        current.map((item) =>
          item.id === id ? { ...item, completed: false } : item,
        ),
      );
      setHistory((current) =>
        current.filter((log) => !(log.doseId === id && log.date === today)),
      );
      return;
    }
    recordDose(id, "taken");
  }
  function saveDose() {
    setRoutineFormNotice(null);
    if (!name.trim()) {
      setRoutineFormNotice({
        title: settings.language === "es" ? "Añade un nombre de medicamento" : "Add a medication name",
        message: settings.language === "es" ? "Por ejemplo, Lágrimas artificiales o acetato de prednisolona." : "For example, Artificial Tears or Prednisolone Acetate.",
      });
      return;
    }
    const allTimes = [time, ...additionalTimes];
    if (allTimes.some((item) => !parseReminderTime(item))) {
      setRoutineFormNotice({
        title: settings.language === "es" ? "Usa una hora como 8:00 AM" : "Use a time like 8:00 AM",
        message: settings.language === "es" ? "ClearCue necesita una hora válida para cada recordatorio diario." : "ClearCue needs a valid time for every daily reminder.",
      });
      return;
    }
    if (
      new Set(allTimes.map((item) => item.trim().toUpperCase())).size !==
      allTimes.length
    ) {
      setRoutineFormNotice({
        title: settings.language === "es" ? "Elige horas diferentes" : "Choose different times",
        message: settings.language === "es" ? "Cada recordatorio diario de este medicamento necesita una hora distinta." : "Each daily reminder for this medication needs its own time.",
      });
      return;
    }
    if (
      bottleMl &&
      (!Number.isFinite(Number(bottleMl)) ||
        Number(bottleMl) <= 0 ||
        !Number.isFinite(Number(dropsPerApplication)) ||
        Number(dropsPerApplication) <= 0 ||
        !Number.isFinite(Number(applicationsPerDay)) ||
        Number(applicationsPerDay) <= 0 ||
        !Number.isInteger(Number(applicationsPerDay)) ||
        !Number.isFinite(Number(warningDays)) ||
        Number(warningDays) < 0 ||
        !Number.isInteger(Number(warningDays)) ||
        !isValidIsoDate(openedOn))
    ) {
      setRoutineFormNotice({
        title: settings.language === "es" ? "Revisa la estimación de suministro" : "Check the supply estimate",
        message: settings.language === "es" ? "Ingresa un tamaño de frasco y gotas por uso positivos, usos y días de aviso en números enteros, y una fecha real como 2026-09-05; o deja vacío el tamaño del frasco para omitir la estimación." : "Enter a positive numeric bottle size and drops per use, whole-number uses and warning days, and a real date like 2026-09-05—or leave bottle size blank to skip the estimate.",
      });
      return;
    }
    const editingGroup =
      doses.find((dose) => dose.id === editingDoseId)?.scheduleGroupId ??
      editingDoseId;
    const closeDose = doses.find(
      (dose) =>
        dose.scheduleGroupId !== editingGroup &&
        dose.id !== editingDoseId &&
        sharesAnEye(dose.eye, eye) &&
        allTimes.some((item) => (minutesBetween(dose.time, item) ?? 999) < 5),
    );
    if (closeDose) {
      setRoutineFormNotice({
        title: settings.language === "es" ? "Estas gotas están muy juntas" : "These drops are very close together",
        message: settings.language === "es" ? `${closeDose.name} está programado a las ${closeDose.time}. Confirma el intervalo en las instrucciones del profesional antes de guardar.` : `${closeDose.name} is scheduled at ${closeDose.time}. Confirm the spacing in the clinician’s instructions before saving.`,
        allowReview: true,
      });
      return;
    }
    openRoutineReview();
  }
  function openRoutineReview() {
    routineSaveInProgress.current = false;
    setRoutineFormNotice(null);
    setRoutineConfirmed(false);
    setPendingRoutineSheet("review");
    setModalOpen(false);
  }
  function persistDose() {
    const supply = bottleMl
      ? {
          bottleMl: Number(bottleMl),
          dropsPerApplication: Number(dropsPerApplication) || 1,
          applicationsPerDay: Number(applicationsPerDay) || 1,
          openedOn,
          warningDays: Number(warningDays) || 7,
          dropsPerMl: 20,
        }
      : undefined;
    const prescription =
      prescriber.trim() ||
      prescriberPhone.trim() ||
      pharmacy.trim() ||
      pharmacyPhone.trim() ||
      rxNumber.trim() ||
      personalNotes.trim()
        ? {
            prescriber: prescriber.trim() || undefined,
            prescriberPhone: prescriberPhone.trim() || undefined,
            pharmacy: pharmacy.trim() || undefined,
            pharmacyPhone: pharmacyPhone.trim() || undefined,
            rxNumber: rxNumber.trim() || undefined,
            notes: personalNotes.trim() || undefined,
          }
        : undefined;
    const groupId = editingDoseId
      ? (doses.find((dose) => dose.id === editingDoseId)?.scheduleGroupId ??
        editingDoseId)
      : `schedule-${Date.now()}`;
    const times = [time, ...additionalTimes]
      .map((item) => item.trim())
      .sort(
        (a, b) =>
          parseReminderTime(a)!.hour * 60 +
          parseReminderTime(a)!.minute -
          (parseReminderTime(b)!.hour * 60 + parseReminderTime(b)!.minute),
      );
    setDoses((current) => {
      const existing = current.filter(
        (dose) => (dose.scheduleGroupId ?? dose.id) === groupId,
      );
      const untouched = current.filter(
        (dose) => (dose.scheduleGroupId ?? dose.id) !== groupId,
      );
      const next = {
        name: name.trim(),
        eye,
        color,
        catalogId: selectedMedication?.id,
        taperPlan: taperPlan.trim() || undefined,
        supply,
        prescription,
        scheduleGroupId: groupId,
      };
      return [
        ...untouched,
        ...times.map((scheduledTime, index) => {
          const matching = existing.find((dose) => dose.time === scheduledTime);
          return {
            id:
              matching?.id ??
              (index === 0 && editingDoseId
                ? editingDoseId
                : `${groupId}-${index}`),
            ...next,
            time: scheduledTime,
            completed: matching?.completed ?? false,
          };
        }),
      ];
    });
    setName("");
    setTime("9:00 AM");
    setAdditionalTimes([]);
    setEye("Right eye");
    setColor(NO_COLOR);
    setTaperPlan("");
    setPrescriber("");
    setPrescriberPhone("");
    setPharmacy("");
    setPharmacyPhone("");
    setRxNumber("");
    setPersonalNotes("");
    setBottleMl("");
    setDropsPerApplication("1");
    setApplicationsPerDay("1");
    setOpenedOn(dateKey(new Date()));
    setWarningDays("7");
    setSelectedMedication(null);
    setEditingDoseId(null);
    setDeleteConfirming(false);
    setModalOpen(false);
    if (remindersEnabled) setRemindersNeedRefresh(true);
  }
  function editDose(dose: Dose) {
    const group = doses
      .filter(
        (item) =>
          (item.scheduleGroupId ?? item.id) ===
          (dose.scheduleGroupId ?? dose.id),
      )
      .sort(
        (a, b) =>
          parseReminderTime(a.time)!.hour * 60 +
          parseReminderTime(a.time)!.minute -
          (parseReminderTime(b.time)!.hour * 60 +
            parseReminderTime(b.time)!.minute),
      );
    setEditingDoseId(dose.id);
    setName(dose.name);
    setTime(group[0]?.time ?? dose.time);
    setAdditionalTimes(group.slice(1).map((item) => item.time));
    setEye(dose.eye);
    setColor(dose.color);
    setTaperPlan(dose.taperPlan ?? "");
    setPrescriber(dose.prescription?.prescriber ?? "");
    setPrescriberPhone(dose.prescription?.prescriberPhone ?? "");
    setPharmacy(dose.prescription?.pharmacy ?? "");
    setPharmacyPhone(dose.prescription?.pharmacyPhone ?? "");
    setRxNumber(dose.prescription?.rxNumber ?? "");
    setPersonalNotes(dose.prescription?.notes ?? "");
    setBottleMl(dose.supply ? String(dose.supply.bottleMl) : "");
    setDropsPerApplication(String(dose.supply?.dropsPerApplication ?? 1));
    setApplicationsPerDay(String(dose.supply?.applicationsPerDay ?? 1));
    setOpenedOn(dose.supply?.openedOn ?? dateKey(new Date()));
    setWarningDays(String(dose.supply?.warningDays ?? 7));
    setSelectedMedication(null);
    setDeleteConfirming(false);
    setRoutineFormNotice(null);
    setModalOpen(true);
  }
  function startAddingDose() {
    setEditingDoseId(null);
    setName("");
    setTime("9:00 AM");
    setAdditionalTimes([]);
    setEye("Right eye");
    setColor(NO_COLOR);
    setTaperPlan("");
    setPrescriber("");
    setPrescriberPhone("");
    setPharmacy("");
    setPharmacyPhone("");
    setRxNumber("");
    setPersonalNotes("");
    setBottleMl("");
    setDropsPerApplication("1");
    setApplicationsPerDay("1");
    setOpenedOn(dateKey(new Date()));
    setWarningDays("7");
    setSelectedMedication(null);
    setDeleteConfirming(false);
    setRoutineFormNotice(null);
    setModalOpen(true);
  }
  function deleteEditingDose() {
    if (!editingDoseId) return;
    setDeleteConfirming(true);
  }
  function confirmDeleteEditingDose() {
    if (!editingDoseId) return;
    const dose = doses.find((item) => item.id === editingDoseId);
    const groupId = dose?.scheduleGroupId ?? editingDoseId;
    const ids = doses
      .filter((item) => (item.scheduleGroupId ?? item.id) === groupId)
      .map((item) => item.id);
    setDoses((current) => current.filter((item) => !ids.includes(item.id)));
    setHistory((current) =>
      current.filter((log) => !ids.includes(log.doseId)),
    );
    setEditingDoseId(null);
    setSelectedMedication(null);
    setDeleteConfirming(false);
    setModalOpen(false);
    if (remindersEnabled) setRemindersNeedRefresh(true);
  }
  async function enableReminders() {
    if (reminderUpdateInProgress.current) return;
    if (demoMode) {
      Alert.alert(
        settings.language === "es"
          ? "Las notificaciones de demo permanecen desactivadas"
          : "Demo notifications stay off",
        settings.language === "es"
          ? "El modo demo nunca programa notificaciones reales. Desactívalo para usar recordatorios para tu propia rutina."
          : "Demo Mode never schedules real notifications. Turn off Demo Mode to use reminders for your own routine.",
      );
      return;
    }
    reminderUpdateInProgress.current = true;
    try {
      let permissions = await Notifications.getPermissionsAsync();
      if (!permissions.granted)
        permissions = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: false, allowSound: true },
        });
      if (!permissions.granted) {
        Alert.alert(
          settings.language === "es" ? "Las notificaciones están desactivadas" : "Notifications are off",
          settings.language === "es"
            ? "Para recibir recordatorios, permite las notificaciones de ClearCue en la configuración de tu iPhone."
            : "To receive reminders, allow notifications for ClearCue in your iPhone Settings.",
        );
        return;
      }
      const scheduled = await scheduleReminders(
        doses,
        settings.hideNotificationDetails,
        settings.language,
      );
      setRemindersEnabled(true);
      setRemindersNeedRefresh(false);
      void checkReminders();
      Alert.alert(
        settings.language === "es" ? "Los recordatorios diarios están activados" : "Daily reminders are on",
        settings.language === "es"
          ? `${scheduled} recordatorio${scheduled === 1 ? "" : "s"} aparecerá${scheduled === 1 ? "" : "n"} a las horas programadas.`
          : `${scheduled} reminder${scheduled === 1 ? "" : "s"} will appear at the scheduled times.`,
      );
    } catch {
      Alert.alert(
        settings.language === "es" ? "No se pudieron actualizar los recordatorios" : "Could not refresh reminders",
        settings.language === "es"
          ? "Tu rutina sigue guardada. Intenta actualizar de nuevo después de volver a abrir ClearCue."
          : "Your routine is still saved. Try Refresh again after reopening ClearCue.",
      );
    } finally {
      reminderUpdateInProgress.current = false;
    }
  }
  async function checkReminders() {
    if (demoMode) {
      setReminderCheckup({
        tone: "attention",
        message:
          settings.language === "es"
            ? "El modo demo no programa notificaciones reales."
            : "Demo Mode does not schedule real notifications.",
        next: null,
      });
      return;
    }
    try {
      const permissions = await Notifications.getPermissionsAsync();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const now = new Date();
      const nextDose = doses
        .map((dose) => ({ dose, clock: parseReminderTime(dose.time) }))
        .filter((item): item is { dose: Dose; clock: { hour: number; minute: number } } => item.clock !== null)
        .map(({ dose, clock }) => {
          const next = new Date();
          next.setHours(clock.hour, clock.minute, 0, 0);
          if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
          return { dose, next };
        })
        .sort((a, b) => a.next.getTime() - b.next.getTime())[0];
      const next = nextDose
        ? `${nextDose.dose.name} · ${nextDose.dose.time}`
        : null;
      if (!permissions.granted) {
        setReminderCheckup({
          tone: "attention",
          message:
            settings.language === "es"
              ? "Las notificaciones están desactivadas en el teléfono. Actívalas para ClearCue en Configuración."
              : "Notifications are off on this phone. Enable them for ClearCue in Settings.",
          next,
        });
      } else if (!scheduled.length || remindersNeedRefresh) {
        setReminderCheckup({
          tone: "attention",
          message:
            settings.language === "es"
              ? "Tus recordatorios necesitan actualizarse. Toca Actualizar para programarlos de nuevo."
              : "Your reminders need an update. Tap Refresh to schedule them again.",
          next,
        });
      } else {
        setReminderCheckup({
          tone: "ready",
          message:
            settings.language === "es"
              ? "Las notificaciones están permitidas y ClearCue tiene recordatorios programados."
              : "Notifications are allowed and ClearCue has scheduled reminders.",
          next,
        });
      }
    } catch {
      setReminderCheckup({
        tone: "attention",
        message:
          settings.language === "es"
            ? "No se pudo revisar los recordatorios. Inténtalo de nuevo después de abrir ClearCue."
            : "Could not check reminders. Try again after reopening ClearCue.",
        next: null,
      });
    }
  }
  async function toggleDemoMode(enabled: boolean) {
    if (demoTransitionInProgress.current) return;
    demoTransitionInProgress.current = true;
    setDemoModeNotice(null);
    try {
      if (enabled) {
        personalSnapshot.current = { doses, history, trackingStart };
        personalReminders.current = remindersEnabled;
        const demo = buildDemoRoutine();
        setDoses(demo.doses);
        setHistory(demo.history);
        setTrackingStart(demo.trackingStart);
        setRemindersEnabled(false);
        setRemindersNeedRefresh(false);
        setDemoMode(true);
        try {
          await Promise.all([
            Notifications.cancelAllScheduledNotificationsAsync(),
            AsyncStorage.setItem(DEMO_MODE_KEY, "active"),
          ]);
        } catch {
          // Demo content is already active; persistence and notification cleanup can retry next launch.
        }
        return;
      }
      const saved = personalSnapshot.current;
      const [savedDoses, savedHistory, savedTracking] = saved
        ? [null, null, null]
        : await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(HISTORY_KEY),
            AsyncStorage.getItem(TRACKING_START_KEY),
          ]);
      setDoses(
        saved?.doses ??
          (savedDoses ? (JSON.parse(savedDoses) as Dose[]) : STARTING_DOSES),
      );
      setHistory(
        saved?.history ??
          (savedHistory ? (JSON.parse(savedHistory) as DoseLog[]) : []),
      );
      setTrackingStart(
        saved?.trackingStart ?? savedTracking ?? dateKey(new Date()),
      );
      setDemoMode(false);
      setRemindersEnabled(personalReminders.current);
      setRemindersNeedRefresh(false);
      personalSnapshot.current = null;
      try {
        await AsyncStorage.removeItem(DEMO_MODE_KEY);
      } catch {
        // The restored personal routine remains usable even if the demo flag clears on the next launch.
      }
    } catch {
      setDemoModeNotice(
        settings.language === "es"
          ? "ClearCue no pudo cambiar de modo. Tu rutina actual no cambió; cierra y vuelve a abrir la app, luego inténtalo de nuevo."
          : "ClearCue could not switch modes. Your current routine is unchanged; close and reopen the app, then try again.",
      );
    } finally {
      demoTransitionInProgress.current = false;
    }
  }
  function resetDemoMode() {
    if (!demoMode) return;
    const demo = buildDemoRoutine();
    setDoses(demo.doses);
    setHistory(demo.history);
    setTrackingStart(demo.trackingStart);
  }
  function eraseRoutineData() {
    void AsyncStorage.multiRemove([
      STORAGE_KEY,
      HISTORY_KEY,
      TRACKING_START_KEY,
      ONBOARDING_KEY,
    ]).catch(() => undefined);
    void Notifications.cancelAllScheduledNotificationsAsync().catch(() =>
      undefined,
    );
    setDoses([]);
    setHistory([]);
    setTrackingStart(dateKey(new Date()));
    setRemindersEnabled(false);
    setRemindersNeedRefresh(false);
    setShowOnboardingAfterPrivacy(true);
    setPrivacyOpen(false);
  }
  function openInsights() {
    setShowInsights(true);
  }
  async function authenticateAppLock() {
    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          settings.language === "es"
            ? "La protección del dispositivo no está lista"
            : "Device protection is not ready",
          settings.language === "es"
            ? "Configura Face ID, Touch ID o un código del dispositivo antes de activar el bloqueo de ClearCue."
            : "Set up Face ID, Touch ID, or a device passcode before turning on ClearCue app lock.",
        );
        return false;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          settings.language === "es"
            ? "Desbloquea tu plan de medicamentos de ClearCue"
            : "Unlock your ClearCue medication plan",
        fallbackLabel: settings.language === "es" ? "Usar código" : "Use Passcode",
        cancelLabel: settings.language === "es" ? "Ahora no" : "Not now",
      });
      return result.success;
    } catch {
      Alert.alert(
        settings.language === "es"
          ? "No se pudo verificar la protección del dispositivo"
          : "Could not verify device protection",
        settings.language === "es"
          ? "Inténtalo de nuevo en una compilación de desarrollo de ClearCue o TestFlight en tu iPhone."
          : "Try again in a ClearCue development or TestFlight build on your iPhone.",
      );
      return false;
    }
  }
  async function changeAppLock(enabled: boolean) {
    if (!enabled) {
      setSettings((current) => ({ ...current, appLockEnabled: false }));
      setAppLocked(false);
      return;
    }
    if (!(await authenticateAppLock())) return;
    setSettings((current) => ({ ...current, appLockEnabled: true }));
    setAppLocked(false);
  }
  return (
    <AccessibilityPresentationContext.Provider
      value={{ largeText: settings.largeText, monochrome: settings.colorBlindMode }}
    >
      <SafeAreaView
        style={[
          styles.safeArea,
          settings.highContrast && styles.highContrastRoot,
          settings.colorBlindMode && styles.monochromeRoot,
        ]}
      >
        <StatusBar style={settings.highContrast && !settings.colorBlindMode ? "light" : "dark"} />
        <ScrollView
          ref={homeScrollRef}
          contentContainerStyle={[
            styles.content,
            settings.largeText && styles.largeContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topbar}>
            <View style={styles.brandRow}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>◒</Text>
              </View>
              <Text style={[styles.brand, scaleText]}>ClearCue</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={settings.language === "es" ? "Guía sobre cómo usar gotas" : "How to use eye drops guide"}
                accessibilityHint={settings.language === "es" ? "Abre una guía paso a paso segura según el profesional" : "Opens a clinician-safe step-by-step guide"}
                onPress={() => setGuideOpen(true)}
                style={styles.help}
              >
                <Text style={styles.helpText}>?</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.date, scaleText, settings.largeText && styles.largeAccentLabel, settings.colorBlindMode && styles.monochromeText]}>{copy.today}</Text>
          <Text style={[styles.greeting, scaleHeading]}>{copy.greeting}</Text>
          <Text style={[styles.subheading, scaleText]}>{copy.subheading}</Text>
          {demoMode && (
            <View
              accessible
              accessibilityLabel={copy.demo}
              style={extraStyles.demoBanner}
            >
              <Text style={extraStyles.demoBannerText}>{copy.demo}</Text>
            </View>
          )}
          <View
            style={[
              styles.progressCard,
              settings.highContrast && styles.highContrastCard,
              settings.colorBlindMode && styles.monochromePrimaryCard,
            ]}
          >
            <View>
              <Text style={[styles.cardLabel, settings.largeText && styles.largeCardLabel, settings.colorBlindMode && styles.monochromeLightText]}>{copy.routine}</Text>
              <Text style={[styles.progressText, scaleText]}>{progress}</Text>
            </View>
              <View style={[styles.progressCircle, settings.colorBlindMode && styles.monochromeProgressCircle]}>
              <View style={[styles.progressInner, settings.colorBlindMode && styles.monochromeProgressInner]}>
                <Text style={styles.progressNumber}>{percentage}%</Text>
              </View>
            </View>
          </View>
          <View style={extraStyles.reminderCheckup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={settings.language === "es" ? "Revisar confiabilidad de recordatorios" : "Check reminder reliability"}
              onPress={() => void checkReminders()}
              style={extraStyles.emptyGuide}
            >
              <Text style={extraStyles.cardLink}>
                {settings.language === "es" ? "Revisar recordatorios" : "Check reminders"}
              </Text>
            </Pressable>
            {reminderCheckup && (
              <View
                style={[
                  extraStyles.reminderCheckupResult,
                  reminderCheckup.tone === "attention" && extraStyles.reminderCheckupAttention,
                  settings.colorBlindMode && extraStyles.monochromeCheckup,
                ]}
              >
                <Text style={[extraStyles.reminderCheckupText, settings.colorBlindMode && extraStyles.monochromeText]}>{reminderCheckup.message}</Text>
                {reminderCheckup.next && (
                  <Text style={[extraStyles.reminderCheckupNext, settings.colorBlindMode && extraStyles.monochromeText]}>
                    {settings.language === "es" ? "Próximo: " : "Next: "}
                    {reminderCheckup.next}
                  </Text>
                )}
              </View>
            )}
          </View>
          <View style={extraStyles.quickTools}>
            <HomeAction
              label={
                settings.language === "es"
                  ? "Más herramientas"
                  : "More care tools"
              }
              detail={
                settings.language === "es"
                  ? "Informes, privacidad y accesibilidad."
                  : "Reports, privacy, and accessibility."
              }
              onPress={() => setCareToolsOpen(true)}
              monochrome={settings.colorBlindMode}
            />
          </View>
          <View style={styles.sectionHeader}>
            <View>
              <AccentLabel>{copy.next}</AccentLabel>
              <Text style={[styles.sectionTitle, scaleSectionTitle]}>
                {copy.schedule}
              </Text>
            </View>
          </View>
          <View style={styles.list}>
            {routineGroups.length ? (
              routineGroups.map((group) => (
                <DoseCard
                  key={group.id}
                  doses={group.doses}
                  language={settings.language}
                  largeText={settings.largeText}
                  monochrome={settings.colorBlindMode}
                  history={history}
                  onToggle={toggleDose}
                  onSkip={(id) => recordDose(id, "skipped")}
                  onEdit={() => editDose(group.doses[0])}
                  onHistory={setHistoryDoseId}
                />
              ))
            ) : (
              <EmptyRoutine
                onAdd={startAddingDose}
                onGuide={() => setGuideOpen(true)}
                language={settings.language}
                largeText={settings.largeText}
                monochrome={settings.colorBlindMode}
              />
            )}
          </View>
          {showInsights && (
            <View
              onLayout={(event) => {
                insightsY.current = event.nativeEvent.layout.y;
                homeScrollRef.current?.scrollTo({
                  y: Math.max(0, insightsY.current - 12),
                  animated: true,
                });
              }}
            >
              <AdherencePanel
                data={adherence}
                onGenerateReport={() => setReportOpen(true)}
                language={settings.language}
              />
            </View>
          )}
          <View
            style={[
              styles.reminderCard,
              settings.highContrast && styles.highContrastSoftCard,
              settings.colorBlindMode && styles.monochromeSoftCard,
            ]}
          >
            <View style={styles.reminderCopy}>
              <Text style={[styles.reminderTitle, scaleText, settings.colorBlindMode && styles.monochromeText]}>
                {copy.reminders}
              </Text>
              <Text style={[styles.reminderText, scaleText, settings.colorBlindMode && styles.monochromeText]}>
                {remindersEnabled && remindersNeedRefresh
                  ? "Routine changes are saved. Refresh reminders when you are ready."
                  : remindersEnabled
                  ? settings.language === "es"
                    ? "Los recordatorios de ClearCue están activos."
                    : "ClearCue reminders are on."
                  : settings.language === "es"
                    ? "Activa recordatorios suaves para tu rutina."
                    : "Turn on gentle reminders for your routine."}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                remindersNeedRefresh ? "Refresh ClearCue reminders" : remindersEnabled ? copy.synced : copy.enable
              }
              onPress={() => void enableReminders()}
              style={[
                styles.reminderButton,
                remindersEnabled && styles.reminderButtonOn,
                settings.colorBlindMode && styles.monochromeButton,
              ]}
            >
              <Text style={styles.reminderButtonText}>
                {remindersNeedRefresh
                  ? "Refresh"
                  : remindersEnabled
                    ? copy.synced
                    : copy.enable}
              </Text>
            </Pressable>
          </View>
          <View
            style={[
              styles.tip,
              settings.highContrast && styles.highContrastSoftCard,
              settings.colorBlindMode && styles.monochromeSoftCard,
            ]}
          >
            <Text style={[styles.tipIcon, settings.colorBlindMode && styles.monochromeText]}>i</Text>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, scaleText, settings.colorBlindMode && styles.monochromeText]}>{copy.spacing}</Text>
              <Text style={[styles.tipText, scaleText, settings.colorBlindMode && styles.monochromeText]}>
                {copy.spacingDetail}
              </Text>
            </View>
          </View>
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          style={[styles.addButton, settings.colorBlindMode && styles.monochromeButton]}
          onPress={startAddingDose}
          accessibilityLabel={copy.add}
          accessibilityHint={settings.language === "es" ? "Abre un formulario para añadir un recordatorio de gotas" : "Opens a form to add an eye-drop reminder"}
        >
          <Text style={styles.addPlus}>＋</Text>
          <Text style={[styles.addText, scaleText]}>{copy.add}</Text>
        </Pressable>
        <AddMedicationModal
          visible={modalOpen}
          animation={settings.reduceMotion ? "none" : "slide"}
          isEditing={Boolean(editingDoseId)}
          name={name}
          time={time}
          additionalTimes={additionalTimes}
          eye={eye}
          color={color}
          clinicianInstructions={taperPlan}
          prescriber={prescriber}
          prescriberPhone={prescriberPhone}
          pharmacy={pharmacy}
          pharmacyPhone={pharmacyPhone}
          rxNumber={rxNumber}
          personalNotes={personalNotes}
          bottleMl={bottleMl}
          dropsPerApplication={dropsPerApplication}
          applicationsPerDay={applicationsPerDay}
          openedOn={openedOn}
          warningDays={warningDays}
          language={settings.language}
          largeText={settings.largeText}
          deleteConfirming={deleteConfirming}
          formNotice={routineFormNotice}
          selectedMedication={selectedMedication}
          onName={(value) => {
            setName(value);
            setSelectedMedication(null);
          }}
          onSelectMedication={(medication) => {
            setSelectedMedication(medication);
            setName(medication.genericName);
          }}
          onTime={setTime}
          onAdditionalTimes={setAdditionalTimes}
          onClinicianInstructions={setTaperPlan}
          onPrescriber={setPrescriber}
          onPrescriberPhone={(value) =>
            setPrescriberPhone(value.replace(/[^0-9+() -]/g, "").slice(0, 20))
          }
          onPharmacy={setPharmacy}
          onPharmacyPhone={(value) =>
            setPharmacyPhone(value.replace(/[^0-9+() -]/g, "").slice(0, 20))
          }
          onRxNumber={setRxNumber}
          onPersonalNotes={setPersonalNotes}
          onBottleMl={(value) => setBottleMl(value.replace(/[^0-9.]/g, ""))}
          onDropsPerApplication={(value) =>
            setDropsPerApplication(value.replace(/[^0-9.]/g, ""))
          }
          onApplicationsPerDay={(value) =>
            setApplicationsPerDay(value.replace(/\D/g, ""))
          }
          onOpenedOn={(value) =>
            setOpenedOn(value.replace(/[^0-9-]/g, "").slice(0, 10))
          }
          onWarningDays={(value) => setWarningDays(value.replace(/\D/g, ""))}
          onEye={setEye}
          onColor={setColor}
          onClose={() => setModalOpen(false)}
          onDismissNotice={() => setRoutineFormNotice(null)}
          onReviewNotice={openRoutineReview}
          onDismiss={() => {
            if (pendingRoutineSheet === "review") {
              setPendingRoutineSheet(null);
              setRoutineReviewOpen(true);
            }
          }}
          onSave={saveDose}
          onDelete={deleteEditingDose}
          onCancelDelete={() => setDeleteConfirming(false)}
          onConfirmDelete={confirmDeleteEditingDose}
        />
      </SafeAreaView>
      <RoutineReviewModal
        visible={routineReviewOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        name={name.trim()}
        eye={eye}
        times={[time, ...additionalTimes]}
        clinicianInstructions={taperPlan}
        bottleMl={bottleMl}
        dropsPerApplication={dropsPerApplication}
        applicationsPerDay={applicationsPerDay}
        openedOn={openedOn}
        warningDays={warningDays}
        language={settings.language}
        confirmed={routineConfirmed}
        onConfirmed={setRoutineConfirmed}
        onBack={() => {
          setPendingRoutineSheet("editor");
          setRoutineReviewOpen(false);
        }}
        onDismiss={() => {
          routineSaveInProgress.current = false;
          if (pendingRoutineSheet === "editor") {
            setPendingRoutineSheet(null);
            setModalOpen(true);
          }
        }}
        onSave={() => {
          if (routineSaveInProgress.current) return;
          routineSaveInProgress.current = true;
          setPendingRoutineSheet(null);
          setRoutineReviewOpen(false);
          persistDose();
        }}
      />
      <CareToolsModal
        visible={careToolsOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        language={settings.language}
        monochrome={settings.colorBlindMode}
        onInsights={() => {
          setCareToolsOpen(false);
          openInsights();
        }}
        onPrivacy={() => {
          setPendingCareSheet("privacy");
          setCareToolsOpen(false);
        }}
        onSettings={() => {
          setPendingCareSheet("settings");
          setCareToolsOpen(false);
        }}
        onClose={() => setCareToolsOpen(false)}
        onDismiss={() => {
          if (pendingCareSheet === "privacy") setPrivacyOpen(true);
          if (pendingCareSheet === "settings") setSettingsOpen(true);
          setPendingCareSheet(null);
        }}
      />
      {launching && (
        <Animated.View
          pointerEvents="none"
          accessible
          accessibilityLabel={settings.language === "es" ? "ClearCue se está cargando" : "ClearCue is loading"}
          style={[extraStyles.splashScreen, { opacity: splashOpacity }]}
        >
          <Image
            source={require("./assets/clearcue-icon.png")}
            style={extraStyles.splashIcon}
          />
          <Text style={extraStyles.splashTitle}>ClearCue</Text>
          <Text style={extraStyles.splashSubtitle}>
            Clearer routines, one drop at a time.
          </Text>
        </Animated.View>
      )}
      <DoctorReportModal
        visible={reportOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        language={settings.language}
        days={reportDays}
        data={reportData}
        onDays={setReportDays}
        onClose={() => setReportOpen(false)}
      />
      <DoseHistoryModal
        visible={historyDose !== null}
        animation={settings.reduceMotion ? "none" : "slide"}
        language={settings.language}
        dose={historyDose}
        history={history}
        trackingStart={trackingStart}
        onClose={() => setHistoryDoseId(null)}
      />
      <PrivacyModal
        visible={privacyOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        language={settings.language}
        hideNotificationDetails={settings.hideNotificationDetails}
        onHideNotificationDetails={(value) =>
          setSettings((current) => ({
            ...current,
            hideNotificationDetails: value,
          }))
        }
        appLockEnabled={settings.appLockEnabled}
        onAppLockChange={(value) => void changeAppLock(value)}
        onErase={eraseRoutineData}
        onClose={() => setPrivacyOpen(false)}
        onDismiss={() => {
          if (showOnboardingAfterPrivacy) {
            setShowOnboardingAfterPrivacy(false);
            setOnboardingStep(0);
            setOnboardingVisible(true);
          }
        }}
      />
      <SettingsModal
        visible={settingsOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        settings={settings}
        onChange={setSettings}
        onShowOnboarding={() => {
          setShowOnboardingAfterSettings(true);
          setSettingsOpen(false);
        }}
        demoMode={demoMode}
        notice={demoModeNotice}
        onDismissNotice={() => setDemoModeNotice(null)}
        onDemoMode={(enabled) => void toggleDemoMode(enabled)}
        onResetDemo={resetDemoMode}
        onClose={() => setSettingsOpen(false)}
        onDismiss={() => {
          if (showOnboardingAfterSettings) {
            setShowOnboardingAfterSettings(false);
            setOnboardingStep(0);
            setOnboardingVisible(true);
          }
        }}
      />
      <DropGuideModal
        visible={guideOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        language={settings.language}
        onClose={() => setGuideOpen(false)}
      />
      <AppLockModal
        visible={hydrated && appLocked}
        language={settings.language}
        onUnlock={() =>
          void authenticateAppLock().then((success) => {
            if (success) setAppLocked(false);
          })
        }
      />
      <OnboardingModal
        visible={onboardingVisible}
        animation={settings.reduceMotion ? "none" : "slide"}
        language={settings.language}
        step={onboardingStep}
        onNext={() => setOnboardingStep((current) => Math.min(current + 1, 2))}
        onComplete={() => {
          setOnboardingVisible(false);
          setOnboardingStep(0);
          void AsyncStorage.setItem(ONBOARDING_KEY, "complete").catch(
            () => undefined,
          );
        }}
      />
    </AccessibilityPresentationContext.Provider>
  );
}
function AccentLabel({ children }: { children: string }) {
  const { largeText, monochrome } = useContext(AccessibilityPresentationContext);
  return (
    <Text
      style={[
        styles.sectionLabel,
        largeText && styles.largeAccentLabel,
        monochrome && styles.monochromeText,
      ]}
    >
      {children}
    </Text>
  );
}
function EmptyRoutine({
  onAdd,
  onGuide,
  language,
  monochrome,
}: {
  onAdd: () => void;
  onGuide: () => void;
  language: "en" | "es";
  largeText: boolean;
  monochrome: boolean;
}) {
  const spanish = language === "es";
  return (
    <View
      accessible
      accessibilityLabel={spanish ? "Tu rutina está vacía. Añade tus primeras gotas para comenzar." : "Your routine is empty. Add your first eye drop to begin."}
      style={[extraStyles.emptyRoutine, monochrome && extraStyles.monochromeSurface]}
    >
      <View style={[extraStyles.emptyIcon, monochrome && extraStyles.monochromeIcon]}>
        <Text style={[extraStyles.emptyIconText, monochrome && extraStyles.monochromeText]}>◒</Text>
      </View>
      <Text style={[extraStyles.emptyTitle, monochrome && extraStyles.monochromeText]}>{spanish ? "Comienza tu rutina" : "Start your routine"}</Text>
      <Text style={[extraStyles.emptyText, monochrome && extraStyles.monochromeMutedText]}>
        {spanish ? "Añade gotas para crear recordatorios, registrar el progreso y crear un informe que puedes compartir." : "Add an eye drop to create reminders, track progress, and build a shareable report."}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spanish ? "Añadir tus primeras gotas" : "Add your first eye drop"}
        onPress={onAdd}
        style={[styles.saveButton, monochrome && styles.monochromeButton]}
      >
        <Text style={styles.saveText}>{spanish ? "Añadir primeras gotas" : "Add first eye drop"}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spanish ? "Abrir la guía sobre cómo usar gotas" : "Open how to use eye drops guide"}
        onPress={onGuide}
        style={extraStyles.emptyGuide}
      >
        <Text style={extraStyles.cardLink}>{spanish ? "Cómo usar gotas" : "How to use eye drops"}</Text>
      </Pressable>
    </View>
  );
}
function CareToolsModal({
  visible,
  animation,
  language,
  monochrome,
  onInsights,
  onPrivacy,
  onSettings,
  onClose,
  onDismiss,
}: {
  visible: boolean;
  animation: "none" | "slide";
  language: "en" | "es";
  monochrome: boolean;
  onInsights: () => void;
  onPrivacy: () => void;
  onSettings: () => void;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const spanish = language === "es";
  return (
    <Modal
      visible={visible}
      animationType={animation}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <SafeAreaView style={[styles.modalScreen, monochrome && styles.monochromeRoot]}>
        <View style={styles.modalHeader}>
          <View>
            <AccentLabel>
              {spanish ? "HERRAMIENTAS ADICIONALES" : "ADDITIONAL TOOLS"}
            </AccentLabel>
            <Text style={styles.modalTitle}>
              {spanish ? "Atención y ajustes" : "Care & settings"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              spanish ? "Cerrar herramientas adicionales" : "Close care tools"
            }
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <View style={[styles.note, monochrome && styles.monochromeSoftCard]}>
            <Text style={[styles.noteTitle, monochrome && styles.monochromeText]}>
              {spanish ? "Tu rutina es lo primero" : "Your routine comes first"}
            </Text>
            <Text style={[styles.noteText, monochrome && styles.monochromeText]}>
              {spanish
                ? "Estas herramientas te ayudan a revisar tu progreso y ajustar ClearCue sin distraerte de las gotas de hoy."
                : "These supporting tools help you review progress and adjust ClearCue without taking focus from today’s eye drops."}
            </Text>
          </View>
          <View style={extraStyles.quickTools}>
            <HomeAction
              label={spanish ? "Progreso e informe" : "Insights & report"}
              detail={
                spanish
                  ? "Revisa tu adherencia y comparte un informe."
                  : "Review adherence and share a read-only report."
              }
              onPress={onInsights}
              monochrome={monochrome}
            />
            <HomeAction
              label={spanish ? "Privacidad y datos" : "Privacy & data"}
              detail={
                spanish
                  ? "Controla tus datos locales y notificaciones."
                  : "Control local data and notifications."
              }
              onPress={onPrivacy}
              monochrome={monochrome}
            />
            <HomeAction
              label={spanish ? "Accesibilidad" : "Accessibility"}
              detail={
                spanish
                  ? "Ajusta texto, contraste, idioma y demostración."
                  : "Adjust text, contrast, language, and demo mode."
              }
              onPress={onSettings}
              monochrome={monochrome}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function HomeAction({
  label,
  detail,
  onPress,
  monochrome = false,
}: {
  label: string;
  detail: string;
  onPress: () => void;
  monochrome?: boolean;
}) {
  const { largeText } = useContext(AccessibilityPresentationContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={detail}
      onPress={onPress}
      style={[extraStyles.homeAction, monochrome && extraStyles.monochromeSurface]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[extraStyles.homeActionLabel, largeText && styles.largeHomeActionLabel, monochrome && extraStyles.monochromeText]}>{label}</Text>
        <Text style={[extraStyles.homeActionDetail, largeText && styles.largeHomeActionDetail, monochrome && extraStyles.monochromeMutedText]}>{detail}</Text>
      </View>
      <Text style={[extraStyles.homeActionArrow, largeText && styles.largeHomeActionLabel, monochrome && extraStyles.monochromeText]}>›</Text>
    </Pressable>
  );
}
function DoseCard({
  doses,
  language,
  largeText,
  monochrome,
  history,
  onToggle,
  onSkip,
  onEdit,
  onHistory,
}: {
  doses: Dose[];
  language: "en" | "es";
  largeText: boolean;
  monochrome: boolean;
  history: DoseLog[];
  onToggle: (id: string) => void;
  onSkip: (id: string) => void;
  onEdit: () => void;
  onHistory: (id: string) => void;
}) {
  const dose = doses[0];
  const colorName =
    dose.color === NO_COLOR
      ? language === "es"
        ? "Sin color especificado"
        : "No color specified"
      : COLOR_NAMES[dose.color]?.[language] ??
        (language === "es" ? "Personalizado" : "Custom");
  const estimate = supplyEstimate(dose.supply);
  const estimateText = estimate
    ? estimate.isWarning
      ? language === "es"
        ? `Estimación de reposición: quedan aproximadamente ${estimate.days} día${estimate.days === 1 ? "" : "s"}`
        : `Refill estimate: about ${estimate.days} day${estimate.days === 1 ? "" : "s"} left`
      : language === "es"
        ? `Estimación de suministro: quedan aproximadamente ${estimate.days} día${estimate.days === 1 ? "" : "s"}`
        : `Supply estimate: about ${estimate.days} day${estimate.days === 1 ? "" : "s"} left`
    : null;
  return (
    <View
      accessible
      accessibilityLabel={`${dose.name}, ${localizedEye(dose.eye, language)}, ${language === "es" ? "etiqueta" : "label"} ${colorName}, ${doses.length} ${language === "es" ? `recordatorio${doses.length === 1 ? "" : "s"} programado${doses.length === 1 ? "" : "s"}` : `scheduled reminder${doses.length === 1 ? "" : "s"}`}${estimateText ? `, ${estimateText}` : ""}`}
      style={[
        extraStyles.medicationCard,
        doses.every((item) => item.completed) && extraStyles.completedMedicationCard,
        monochrome && extraStyles.monochromeSurface,
      ]}
    >
      <View
        style={[extraStyles.medicationStripe, { backgroundColor: monochrome ? "#000000" : dose.color === NO_COLOR ? "#D6C4B8" : dose.color }]}
      />
      <View style={extraStyles.medicationBody}>
        <View style={extraStyles.medicationTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.doseName, largeText && styles.largeText, monochrome && styles.monochromeText]}>
              {dose.name}
            </Text>
            <Text style={[styles.doseDetails, largeText && styles.largeText, monochrome && styles.monochromeText]}>
              {localizedEye(dose.eye, language)} · {language === "es" ? "etiqueta" : "label"} {colorName}
            </Text>
          </View>
        </View>
        {estimateText && (
          <Text
            style={[
              extraStyles.supplyStatus,
              estimate?.isWarning && extraStyles.supplyWarning,
            ]}
          >
            {estimateText}
          </Text>
        )}
        <View style={extraStyles.groupedTimes}>
          {doses.map((scheduledDose) => {
            const state = todayDoseState(scheduledDose, history);
            const status =
              state === "completed"
                ? language === "es"
                  ? "Completada"
                  : "Completed"
                : state === "skipped"
                  ? language === "es"
                    ? "Omitida"
                    : "Skipped"
                  : state === "late"
                    ? language === "es"
                      ? "Atrasada"
                      : "Late"
                    : state === "due"
                      ? language === "es"
                        ? "Ahora"
                        : "Due now"
                      : language === "es"
                        ? "Próxima"
                        : "Upcoming";
            return (
              <View key={scheduledDose.id} style={extraStyles.groupedTimeRow}>
                <View style={extraStyles.timeBlock}>
                  <Text style={[styles.time, largeText && styles.largeText, monochrome && styles.monochromeText]}>
                    {scheduledDose.time}
                  </Text>
                  <Text
                    style={[
                      extraStyles.statusBadge,
                      state === "completed"
                        ? extraStyles.statusComplete
                        : state === "late" || state === "skipped"
                          ? extraStyles.statusLate
                          : extraStyles.statusDue,
                      monochrome && extraStyles.monochromeStatusBadge,
                    ]}
                  >
                    {status}
                  </Text>
                </View>
                <View style={extraStyles.cardLinks}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={language === "es" ? `Ver historial de ${dose.name} para las ${scheduledDose.time}` : `View ${dose.name} history for ${scheduledDose.time}`}
                    onPress={() => onHistory(scheduledDose.id)}
                  >
                    <Text style={[extraStyles.cardLink, largeText && styles.largeCardLink, monochrome && extraStyles.monochromeText]}>
                      {language === "es" ? "Historial" : "History"}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={language === "es" ? `${state === "completed" ? "Marcar como no tomada" : "Marcar como tomada"}: ${dose.name} a las ${scheduledDose.time}` : `${state === "completed" ? "Mark incomplete" : "Mark as taken"}: ${dose.name} at ${scheduledDose.time}`}
                    accessibilityHint={language === "es" ? "Registra esta dosis en el historial de seguimiento" : "Records this dose in adherence history"}
                    onPress={() => onToggle(scheduledDose.id)}
                    style={[styles.doneButton, state === "completed" && styles.checkedButton, monochrome && styles.monochromeButton]}
                  >
                    <Text style={styles.doneText}>
                      {state === "completed"
                        ? language === "es"
                          ? "✓ Tomada"
                          : "✓ Taken"
                        : language === "es"
                          ? "Marcar tomada"
                          : "Mark taken"}
                    </Text>
                  </Pressable>
                </View>
                {state === "late" && (
                  <View style={extraStyles.missedDoseSafety}>
                    <Text style={extraStyles.missedDoseSafetyText}>
                      {language === "es"
                        ? "Sigue la etiqueta de tu receta o las instrucciones de tu profesional. No dupliques una dosis a menos que te lo indiquen."
                        : "Follow your prescription label or clinician’s instructions. Do not double-dose unless instructed."}
                    </Text>
                    <View style={extraStyles.missedDoseActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={language === "es" ? "Registrar como omitida" : "Record as skipped"}
                        onPress={() => onSkip(scheduledDose.id)}
                        style={styles.choice}
                      >
                        <Text style={styles.choiceText}>{language === "es" ? "Omitida" : "Skipped"}</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={language === "es" ? "Registrar como tomada más tarde" : "Record as taken later"}
                        onPress={() => onToggle(scheduledDose.id)}
                        style={[styles.doneButton, monochrome && styles.monochromeButton]}
                      >
                        <Text style={styles.doneText}>{language === "es" ? "Tomada más tarde" : "Taken later"}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View style={extraStyles.medicationFooter}>
          <View style={extraStyles.cardLinks}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === "es" ? `Editar ${dose.name}` : `Edit ${dose.name}`}
              onPress={onEdit}
            >
              <Text style={[extraStyles.cardLink, largeText && styles.largeCardLink, monochrome && extraStyles.monochromeText]}>{language === "es" ? "Editar" : "Edit"}</Text>
            </Pressable>
          </View>
          <Text style={[extraStyles.supplyHelp, monochrome && extraStyles.monochromeMutedText]}>
            {language === "es" ? "Cada hora se registra por separado." : "Each time is tracked separately."}
          </Text>
        </View>
      </View>
    </View>
  );
}
type DaySummary = { date: string; label: string; statuses: AdherenceStatus[] };
type AdherenceData = {
  days: DaySummary[];
  expected: number;
  taken: number;
  late: number;
  missed: number;
  streak: number;
  byMedication: {
    name: string;
    color: string;
    percent: number;
    taken: number;
    expected: number;
  }[];
  insight: string;
};
function buildAdherence(
  doses: Dose[],
  history: DoseLog[],
  trackingStart: string,
  dayCount = 7,
  language: "en" | "es" = "en",
): AdherenceData {
  const now = new Date();
  const days: DaySummary[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset--) {
    const current = new Date(now);
    current.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() - offset);
    const key = dateKey(current);
    const statuses: AdherenceStatus[] = [];
    doses.forEach((dose) => {
      const log = history.find(
        (item) => item.date === key && item.doseId === dose.id,
      );
      const due = scheduledDate(key, dose.time);
      if (log) statuses.push(log.status);
      else if (key >= trackingStart && due && due.getTime() <= now.getTime())
        statuses.push("missed");
    });
    days.push({
      date: key,
      label: current.toLocaleDateString(language === "es" ? "es-US" : "en-US", { weekday: "narrow" }),
      statuses,
    });
  }
  const statuses = days.flatMap((day) => day.statuses);
  const taken = statuses.filter((status) => status === "taken").length;
  const late = statuses.filter((status) => status === "late").length;
  const missed = statuses.filter(
    (status) => status === "missed" || status === "skipped",
  ).length;
  const expected = statuses.length;
  let streak = 0;
  for (const day of [...days].reverse()) {
    if (
      day.statuses.length === doses.length &&
      day.statuses.every(
        (status) => status !== "missed" && status !== "skipped",
      )
    )
      streak++;
    else if (day.statuses.length === doses.length) break;
  }
  const byMedication = doses.map((dose) => {
    const doseStatuses: AdherenceStatus[] = [];
    days.forEach((day) => {
      const log = history.find(
        (item) => item.date === day.date && item.doseId === dose.id,
      );
      const due = scheduledDate(day.date, dose.time);
      if (log) doseStatuses.push(log.status);
      else if (
        day.date >= trackingStart &&
        due &&
        due.getTime() <= now.getTime()
      )
        doseStatuses.push("missed");
    });
    const doseTaken = doseStatuses.filter(
      (status) => status === "taken" || status === "late",
    ).length;
    return {
      name: dose.name,
      color: dose.color === NO_COLOR ? "#B7AAA0" : dose.color,
      percent: doseStatuses.length
        ? Math.round((doseTaken / doseStatuses.length) * 100)
        : 0,
      taken: doseTaken,
      expected: doseStatuses.length,
    };
  });
  const periods = ["morning", "afternoon", "evening"]
    .map((period) => {
      const periodDoses = doses.filter(
        (dose) => timePeriod(dose.time) === period,
      );
      let periodExpected = 0;
      let periodMissed = 0;
      periodDoses.forEach((dose) => {
        days.forEach((day) => {
          const log = history.find(
            (item) => item.date === day.date && item.doseId === dose.id,
          );
          const due = scheduledDate(day.date, dose.time);
          if (
            log ||
            (day.date >= trackingStart && due && due.getTime() <= now.getTime())
          ) {
            periodExpected++;
            if (!log) periodMissed++;
          }
        });
      });
      return {
        period,
        expected: periodExpected,
        missed: periodMissed,
        rate: periodExpected ? periodMissed / periodExpected : 0,
      };
    })
    .filter((item) => item.expected > 0);
  const highest = [...periods].sort((a, b) => b.rate - a.rate)[0];
  const others = periods.filter((item) => item !== highest);
  const otherRate = others.length
    ? others.reduce((sum, item) => sum + item.rate, 0) / others.length
    : 0;
  const periodName = (period?: string) =>
    language === "es"
      ? ({ morning: "mañana", afternoon: "tarde", evening: "noche" }[period ?? ""] ?? "registrado")
      : period ?? "tracked";
  const insight = !expected
    ? language === "es"
      ? "Registra algunas dosis para ver tu primera estadística de rutina."
      : "Complete a few doses to unlock your first adherence insight."
    : !missed
      ? language === "es"
        ? "Excelente constancia: no hay dosis omitidas en el período registrado."
        : "Excellent consistency—no missed doses in the tracked period."
      : highest && otherRate > 0
        ? language === "es"
          ? "Omites dosis de la " + periodName(highest.period) + ` ${(highest.rate / otherRate).toFixed(1)}× más que en otros horarios.`
          : `You miss ${highest.period} doses ${(highest.rate / otherRate).toFixed(1)}× more often than other times.`
        : language === "es"
          ? `La mayoría de las dosis omitidas son por la ${periodName(highest?.period)}.`
          : `Most missed doses are in the ${highest?.period ?? "tracked"} period.`;
  return { days, expected, taken, late, missed, streak, byMedication, insight };
}
function AdherencePanel({
  data,
  onGenerateReport,
  language,
}: {
  data: AdherenceData;
  onGenerateReport: () => void;
  language: "en" | "es";
}) {
  const spanish = language === "es";
  const overall = data.expected
    ? Math.round(((data.taken + data.late) / data.expected) * 100)
    : 0;
  const onTime = data.expected
    ? Math.round((data.taken / data.expected) * 100)
    : 0;
  return (
    <View style={styles.insightsPanel}>
      <AccentLabel>{spanish ? "ÚLTIMOS 7 DÍAS" : "LAST 7 DAYS"}</AccentLabel>
      <Text style={styles.insightsTitle}>{spanish ? "Registro de rutina autoinformado" : "Self-reported routine record"}</Text>
      <Text style={styles.settingsIntro}>{spanish ? "Se basa solo en las dosis que marcas en ClearCue. No verifica la administración ni la efectividad del tratamiento." : "Based only on doses you mark in ClearCue. It does not verify administration or treatment effectiveness."}</Text>
      <View style={styles.metricRow}>
        <Metric value={`${overall}%`} label={spanish ? "Registradas" : "Recorded"} />
        <Metric value={`${onTime}%`} label={spanish ? "Marcadas a tiempo" : "Marked on time"} />
        <Metric value={String(data.streak)} label={spanish ? "Días seguidos registrados" : "Recorded-day streak"} />
      </View>
      <Text style={styles.chartLabel}>{spanish ? "Registro de dosis autoinformado" : "Self-reported dose record"}</Text>
      <View style={styles.weekRow}>
        {data.days.map((day) => (
          <View key={day.date} style={styles.dayColumn}>
            <View style={styles.dayDots}>
              {day.statuses.length === 0 ? (
                <View style={styles.emptyDot} />
              ) : (
                day.statuses.map((status, index) => (
                  <View
                    key={`${status}-${index}`}
                    style={[
                      styles.statusDot,
                      status === "taken"
                        ? styles.takenDot
                        : status === "late"
                          ? styles.lateDot
                          : styles.missedDot,
                    ]}
                  />
                ))
              )}
            </View>
            <Text style={styles.dayLabel}>{day.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Legend color="#557A66" label={spanish ? "Marcada a tiempo" : "Marked on time"} />
        <Legend color="#B9823E" label={spanish ? "Tarde" : "Late"} />
        <Legend color="#B85C4A" label={spanish ? "Omitida" : "Missed"} />
      </View>
      <View style={styles.insightBox}>
        <Text style={styles.insightEyebrow}>{spanish ? "PATRÓN DETECTADO" : "PATTERN DETECTED"}</Text>
        <Text style={styles.insightText}>{data.insight}</Text>
      </View>
      <Text style={styles.chartLabel}>{spanish ? "Por medicamento" : "By medication"}</Text>
      {data.byMedication.map((medication) => (
        <View key={medication.name} style={styles.medicationRow}>
          <View
            style={[styles.miniColor, { backgroundColor: medication.color }]}
          />
          <View style={styles.medicationInfo}>
            <View style={styles.medicationLabelRow}>
              <Text numberOfLines={1} style={styles.medicationName}>
                {medication.name}
              </Text>
              <Text style={styles.medicationPercent}>
                {medication.percent}%
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${medication.percent}%`,
                    backgroundColor: medication.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.medicationDetail}>
              {spanish ? `${medication.taken} de ${medication.expected} dosis marcadas` : `${medication.taken} of ${medication.expected} doses taken`}
            </Text>
          </View>
        </View>
      ))}
      <Pressable onPress={onGenerateReport} style={styles.reportButton}>
        <Text style={styles.reportButtonText}>{spanish ? "Crear resumen autoinformado" : "Generate self-reported summary"}</Text>
        <Text style={styles.reportButtonArrow}>›</Text>
      </Pressable>
    </View>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}
function DoctorReportModal({
  visible,
  animation,
  language,
  days,
  data,
  onDays,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  language: "en" | "es";
  days: 7 | 30;
  data: AdherenceData;
  onDays: (days: 7 | 30) => void;
  onClose: () => void;
}) {
  const spanish = language === "es";
  const { largeText, monochrome } = useContext(AccessibilityPresentationContext);
  const overall = data.expected
    ? Math.round(((data.taken + data.late) / data.expected) * 100)
    : 0;
  const onTime = data.expected
    ? Math.round((data.taken / data.expected) * 100)
    : 0;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const locale = spanish ? "es-US" : "en-US";
  const range = `${start.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
  async function shareReport() {
    await Share.share({
      message: spanish
        ? `Resumen autoinformado de rutina de ClearCue\nPeriodo: ${range}\nDosis registradas: ${overall}%\nMarcadas a tiempo: ${onTime}%\nDosis no registradas: ${data.missed}\nDosis tardías: ${data.late}\nPatrón: ${data.insight}\n\nEste resumen refleja las dosis que la persona marcó en ClearCue. No verifica la administración, eficacia del tratamiento ni adherencia clínica.`
        : `ClearCue self-reported routine summary\nPeriod: ${range}\nRecorded doses: ${overall}%\nMarked on time: ${onTime}%\nMissed doses: ${data.missed}\nLate doses: ${data.late}\nPattern: ${data.insight}\n\nThis summary reflects doses the user marked in ClearCue. It does not verify administration, treatment effectiveness, or clinical adherence.`,
    });
  }
  return (
    <Modal
      visible={visible}
      animationType={animation}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <AccentLabel>{spanish ? "RESUMEN DEL PACIENTE" : "PATIENT SUMMARY"}</AccentLabel>
            <Text style={styles.modalTitle}>{spanish ? "Informe para compartir" : "Shareable report"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Cerrar informe para compartir" : "Close shareable report"}
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.reportContent}>
          <View style={styles.periodPicker}>
            {([7, 30] as const).map((period) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={spanish ? "Mostrar los últimos " + period + " días" : `Show last ${period} days`}
                key={period}
                onPress={() => onDays(period)}
                style={[
                  styles.periodOption,
                  days === period && styles.periodOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    days === period && styles.periodTextSelected,
                  ]}
                >
                  {spanish ? `Últimos ${period} días` : `Last ${period} days`}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.reportCard}>
            <Text style={[styles.reportBrand, largeText && styles.largeAccentLabel, monochrome && styles.monochromeText]}>{spanish ? "RESUMEN AUTOINFORMADO DE CLEARCUE" : "CLEARCUE SELF-REPORTED SUMMARY"}</Text>
            <Text style={styles.reportRange}>{range}</Text>
            <View style={styles.reportMetricGrid}>
              <ReportMetric value={`${overall}%`} label={spanish ? "Dosis registradas" : "Recorded doses"} />
              <ReportMetric value={`${onTime}%`} label={spanish ? "Marcadas a tiempo" : "Marked on time"} />
              <ReportMetric value={String(data.missed)} label={spanish ? "Dosis no registradas" : "Missed doses"} />
              <ReportMetric value={String(data.late)} label={spanish ? "Dosis tardías" : "Late doses"} />
            </View>
            <Text style={styles.reportHeading}>{spanish ? "Actividad de medicamentos registrada" : "Recorded medication activity"}</Text>
            {data.byMedication.map((medication) => (
              <View key={medication.name} style={styles.reportMedication}>
                <Text style={styles.reportMedicationName}>
                  {medication.name}
                </Text>
                <Text style={styles.reportMedicationValue}>
                  {medication.percent}% ({medication.taken}/
                  {medication.expected})
                </Text>
              </View>
            ))}
            <View style={styles.reportPattern}>
              <Text style={styles.insightEyebrow}>{spanish ? "PATRÓN CON MÁS OMISIONES" : "MOST MISSED PATTERN"}</Text>
              <Text style={styles.insightText}>{data.insight}</Text>
            </View>
            <Text style={styles.reportDisclaimer}>
              {spanish ? "Esto refleja las dosis que la persona marcó en ClearCue. No prueba la administración, eficacia del tratamiento ni adherencia clínica." : "This reflects doses the user marked in ClearCue. It does not prove administration, treatment effectiveness, or clinical adherence."}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Compartir informe de solo lectura" : "Share read-only report"}
            onPress={() => void shareReport()}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>{spanish ? "Compartir informe de solo lectura" : "Share read-only report"}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function DoseHistoryModal({
  visible,
  animation,
  language,
  dose,
  history,
  trackingStart,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  language: "en" | "es";
  dose: Dose | null;
  history: DoseLog[];
  trackingStart: string;
  onClose: () => void;
}) {
  if (!dose) return null;
  const spanish = language === "es";
  const locale = spanish ? "es-US" : "en-US";
  const now = new Date();
  const entries = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (13 - index));
    const date = dateKey(day);
    const log = history.find(
      (item) => item.doseId === dose.id && item.date === date,
    );
    const due = scheduledDate(date, dose.time);
    const status =
      log?.status ??
      (date < trackingStart
        ? "not tracked"
        : due && due.getTime() > now.getTime()
          ? "upcoming"
          : "missed");
    return {
      date,
      label: day.toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      status,
      recordedAt: log?.completedAt
        ? new Date(log.completedAt).toLocaleTimeString(locale, {
            hour: "numeric",
            minute: "2-digit",
          })
        : null,
    };
  }).reverse();
  const statusStyle = (status: string) =>
    status === "taken"
      ? { color: "#557A66", backgroundColor: "#E7F0E9" }
      : status === "late"
        ? { color: "#9B6B3D", backgroundColor: "#F5E5D8" }
        : status === "missed"
          ? { color: "#A33C34", backgroundColor: "#FBE7E4" }
          : { color: "#6F625B", backgroundColor: "#F2EBE4" };
  const statusLabel = (status: string) =>
    status === "taken"
      ? spanish ? "A tiempo" : "On time"
      : status === "late"
        ? spanish ? "Tardía" : "Late"
        : status === "skipped"
          ? spanish ? "Omitida" : "Skipped"
        : status === "missed"
          ? spanish ? "No registrada" : "Missed"
        : status === "upcoming"
            ? spanish ? "Próxima" : "Upcoming"
            : spanish ? "Sin seguimiento" : "Not tracked";
  return (
    <Modal
      visible={visible}
      animationType={animation}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <AccentLabel>{spanish ? "ÚLTIMOS 14 DÍAS" : "LAST 14 DAYS"}</AccentLabel>
            <Text style={styles.modalTitle}>{dose.name} {spanish ? "historial" : "history"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Cerrar historial de dosis" : "Close dose history"}
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>{spanish ? "Actividad registrada" : "Recorded activity"}</Text>
            <Text style={styles.noteText}>
              {spanish ? "Este historial refleja las dosis marcadas en ClearCue. Una entrada de dosis no registrada también puede significar que no se registró la dosis." : "This history reflects doses marked in ClearCue. A “missed” entry can also mean the dose was not recorded."}
            </Text>
          </View>
          {entries.map((entry) => (
            <View
              key={entry.date}
              accessible
              accessibilityLabel={`${entry.label}: ${statusLabel(entry.status)}${entry.recordedAt ? spanish ? `, registrada ${entry.recordedAt}` : `, recorded ${entry.recordedAt}` : ""}`}
              style={extraStyles.historyRow}
            >
              <View>
                <Text style={extraStyles.historyDate}>{entry.label}</Text>
                <Text style={extraStyles.historyTime}>
                  {entry.recordedAt
                    ? spanish ? `Registrada ${entry.recordedAt}` : `Recorded ${entry.recordedAt}`
                    : entry.status === "upcoming"
                      ? spanish ? `Programada ${dose.time}` : `Scheduled ${dose.time}`
                      : spanish ? "Sin dosis registrada" : "No recorded dose"}
                </Text>
              </View>
              <View
                style={[extraStyles.historyBadge, statusStyle(entry.status)]}
              >
                <Text
                  style={[
                    extraStyles.historyBadgeText,
                    { color: statusStyle(entry.status).color },
                  ]}
                >
                  {statusLabel(entry.status)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function ReportMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.reportMetric}>
      <Text style={styles.reportMetricValue}>{value}</Text>
      <Text style={styles.reportMetricLabel}>{label}</Text>
    </View>
  );
}
function AppLockModal({
  visible,
  language,
  onUnlock,
}: {
  visible: boolean;
  language: "en" | "es";
  onUnlock: () => void;
}) {
  const spanish = language === "es";
  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => undefined}
    >
      <SafeAreaView style={extraStyles.appLockScreen}>
        <View style={extraStyles.appLockContent}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>◒</Text>
          </View>
          <AccentLabel>
            {spanish ? "PRIVADO POR DEFECTO" : "PRIVATE BY DEFAULT"}
          </AccentLabel>
          <Text style={extraStyles.appLockTitle}>
            {spanish ? "Tu plan está protegido" : "Your plan is protected"}
          </Text>
          <Text style={extraStyles.appLockBody}>
            {spanish
              ? "Usa Face ID, Touch ID o el código de tu dispositivo para abrir ClearCue."
              : "Use Face ID, Touch ID, or your device passcode to open ClearCue."}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            spanish
              ? "Desbloquear el plan de medicamentos de ClearCue"
              : "Unlock ClearCue medication plan"
          }
          onPress={onUnlock}
          style={styles.saveButton}
        >
          <Text style={styles.saveText}>
            {spanish ? "Desbloquear ClearCue" : "Unlock ClearCue"}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
function PrivacyModal({
  visible,
  animation,
  language,
  hideNotificationDetails,
  onHideNotificationDetails,
  appLockEnabled,
  onAppLockChange,
  onErase,
  onClose,
  onDismiss,
}: {
  visible: boolean;
  animation: "none" | "slide";
  language: "en" | "es";
  hideNotificationDetails: boolean;
  onHideNotificationDetails: (value: boolean) => void;
  appLockEnabled: boolean;
  onAppLockChange: (value: boolean) => void;
  onErase: () => void;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const [eraseConfirming, setEraseConfirming] = useState(false);
  const spanish = language === "es";
  return (
    <Modal
      visible={visible}
      animationType={animation}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <AccentLabel>{spanish ? "TUS DATOS" : "YOUR DATA"}</AccentLabel>
            <Text style={styles.modalTitle}>{spanish ? "Privacidad y datos" : "Privacy & data"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Cerrar controles de privacidad y datos" : "Close privacy and data controls"}
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>{spanish ? "Local por defecto" : "Local by default"}</Text>
            <Text style={styles.noteText}>
              {spanish ? "ClearCue guarda tu rutina, detalles de medicamentos e historial de seguimiento en este dispositivo. No tiene cuenta de ClearCue, sincronización en la nube ni monitoreo de cuidadores." : "ClearCue stores your routine, medication details, and adherence history on this device. It has no ClearCue account, cloud sync, or caregiver monitoring."}
            </Text>
          </View>
          <SettingRow
            title={spanish ? "Ocultar detalles de medicamentos en notificaciones" : "Hide medication details in notifications"}
            detail={spanish ? "Usa texto general en recordatorios de pantalla bloqueada y alertas de estimación de reposición." : "Use general wording on lock-screen reminders and refill-estimate alerts."}
            value={hideNotificationDetails}
            onChange={onHideNotificationDetails}
          />
          <SettingRow
            title={
              spanish
                ? "Proteger ClearCue con Face ID"
                : "Protect ClearCue with Face ID"
            }
            detail={
              spanish
                ? "Usa Face ID, Touch ID o el código de tu dispositivo para desbloquear tu plan cuando ClearCue vuelve al frente."
                : "Use Face ID, Touch ID, or your device passcode to unlock your medication plan after ClearCue leaves the foreground."
            }
            value={appLockEnabled}
            onChange={onAppLockChange}
          />
          <Text style={styles.settingsIntro}>
            {spanish
              ? "Face ID requiere una compilación de desarrollo de ClearCue o TestFlight en un iPhone; no se puede probar completamente en Expo Go."
              : "Face ID requires a ClearCue development or TestFlight build on an iPhone; it cannot be fully tested in Expo Go."}
          </Text>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>{spanish ? "Compartir permanece bajo tu control" : "Sharing stays in your control"}</Text>
            <Text style={styles.noteText}>
              {spanish ? "Un informe para compartir se crea solo cuando eliges Compartir informe de solo lectura. Revisa el destino antes de enviarlo." : "A shareable report is created only when you choose Share read-only report. Review the destination before sending it."}
            </Text>
          </View>
          <View style={extraStyles.eraseSection}>
            <Text style={extraStyles.eraseTitle}>{spanish ? "Borrar datos locales de la rutina" : "Erase local routine data"}</Text>
            <Text style={extraStyles.eraseText}>
              {spanish ? "Esto elimina tus medicamentos, detalles privados de receta, historial de dosis y notificaciones programadas de ClearCue de este dispositivo. No se puede deshacer." : "This removes your medications, private prescription details, dose history, and scheduled ClearCue notifications from this device. It cannot be undone."}
            </Text>
            {eraseConfirming ? (
              <View style={extraStyles.deleteConfirm}>
                <Text style={extraStyles.eraseTitle}>{spanish ? "¿Borrar todos los datos de la rutina?" : "Erase all routine data?"}</Text>
                <Text style={extraStyles.eraseText}>
                  {spanish ? "No se puede deshacer. Los ajustes de accesibilidad permanecerán en este dispositivo." : "This cannot be undone. Accessibility settings will stay on this device."}
                </Text>
                <View style={styles.choiceRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={spanish ? "Conservar datos locales de la rutina de ClearCue" : "Keep local ClearCue routine data"}
                    onPress={() => setEraseConfirming(false)}
                    style={styles.choice}
                  >
                    <Text style={styles.choiceText}>{spanish ? "Conservar datos" : "Keep data"}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={spanish ? "Confirmar borrado de datos locales de la rutina de ClearCue" : "Confirm erasing local ClearCue routine data"}
                    onPress={onErase}
                    style={extraStyles.deleteConfirmButton}
                  >
                    <Text style={extraStyles.deleteConfirmButtonText}>{spanish ? "Borrar datos" : "Erase data"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={spanish ? "Borrar datos locales de la rutina de ClearCue" : "Erase local ClearCue routine data"}
                onPress={() => setEraseConfirming(true)}
                style={extraStyles.eraseButton}
              >
                <Text style={extraStyles.eraseButtonText}>
                  {spanish ? "Borrar los datos de mi rutina" : "Erase my routine data"}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function SettingsModal({
  visible,
  animation,
  settings,
  onChange,
  onShowOnboarding,
  demoMode,
  notice,
  onDismissNotice,
  onDemoMode,
  onResetDemo,
  onClose,
  onDismiss,
}: {
  visible: boolean;
  animation: "none" | "slide";
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onShowOnboarding: () => void;
  demoMode: boolean;
  notice: string | null;
  onDismissNotice: () => void;
  onDemoMode: (enabled: boolean) => void;
  onResetDemo: () => void;
  onClose: () => void;
  onDismiss: () => void;
}) {
  const spanish = settings.language === "es";
  const update = (key: keyof Omit<AppSettings, "language">, value: boolean) =>
    onChange({ ...settings, [key]: value });
  return (
    <Modal
      visible={visible}
      animationType={animation}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <SafeAreaView style={[styles.modalScreen, settings.colorBlindMode && styles.monochromeRoot]}>
        <View style={styles.modalHeader}>
          <View>
            <AccentLabel>CLEARCUE</AccentLabel>
            <Text style={styles.modalTitle}>{spanish ? "Accesibilidad" : "Accessibility"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Cerrar ajustes de accesibilidad" : "Close accessibility settings"}
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={[styles.settingsIntro, settings.colorBlindMode && styles.monochromeText]}>
            {spanish ? "Haz que ClearCue sea más fácil de ver, leer y usar. Estos ajustes se guardan solo en este dispositivo." : "Make ClearCue easier to see, read, and use. These settings are stored only on this device."}
          </Text>
          <SettingRow
            title={spanish ? "Texto grande" : "Large text"}
            detail={spanish ? "Aumenta el texto principal y las áreas táctiles." : "Increase key text and touch targets."}
            value={settings.largeText}
            onChange={(value) => update("largeText", value)}
          />
          <SettingRow
            title={spanish ? "Alto contraste" : "High contrast"}
            detail={spanish ? "Usa un contraste más fuerte entre texto, botones y fondos." : "Use stronger contrast between text, buttons, and backgrounds."}
            value={settings.highContrast}
            onChange={(value) => update("highContrast", value)}
          />
          <SettingRow
            title={spanish ? "Modo blanco y negro" : "Black-and-white mode"}
            detail={spanish ? "Elimina el color de las superficies principales y usa negro, blanco y gris. Las etiquetas de medicamentos permanecen en palabras." : "Remove color from key surfaces and use black, white, and gray. Medication labels remain in words."}
            value={settings.colorBlindMode}
            onChange={(value) => update("colorBlindMode", value)}
          />
          <SettingRow
            title={spanish ? "Reducir movimiento" : "Reduce motion"}
            detail={spanish ? "Desactiva las animaciones de deslizamiento en ClearCue." : "Turn off slide animations in ClearCue."}
            value={settings.reduceMotion}
            onChange={(value) => update("reduceMotion", value)}
          />
          <SettingRow
            title={spanish ? "Modo demo" : "Demo Mode"}
            detail={spanish ? "Carga medicamentos, historial, informes y estimaciones de muestra. Las notificaciones reales permanecen desactivadas." : "Load sample medications, history, reports, and refill estimates. Real notifications stay off."}
            value={demoMode}
            onChange={onDemoMode}
          />
          {notice && (
            <View style={extraStyles.deleteConfirm}>
              <Text style={extraStyles.eraseTitle}>{spanish ? "El modo demo no cambió" : "Demo Mode did not change"}</Text>
              <Text style={extraStyles.eraseText}>{notice}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={spanish ? "Descartar mensaje del modo demo" : "Dismiss Demo Mode message"}
                onPress={onDismissNotice}
                style={styles.choice}
              >
                <Text style={styles.choiceText}>OK</Text>
              </Pressable>
            </View>
          )}
          {demoMode && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={spanish ? "Restablecer datos de demo" : "Reset demo data"}
              onPress={onResetDemo}
              style={extraStyles.welcomeGuideButton}
            >
              <Text style={extraStyles.cardLink}>{spanish ? "Restablecer datos de demo" : "Reset demo data"}</Text>
            </Pressable>
          )}
          <View>
            <Text style={styles.fieldLabel}>{spanish ? "Idioma de la aplicación" : "Home screen language / Idioma de inicio"}</Text>
            <View style={styles.choiceRow}>
              {(["en", "es"] as const).map((language) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: settings.language === language,
                  }}
                  accessibilityLabel={language === "en" ? "English" : "Español"}
                  key={language}
                  onPress={() => onChange({ ...settings, language })}
                  style={[
                    styles.choice,
                    settings.language === language && styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      settings.language === language &&
                        styles.choiceTextSelected,
                    ]}
                  >
                    {language === "en" ? "English" : "Español"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={extraStyles.languageSupportNote}>
              {spanish ? "ClearCue muestra los controles principales en español. Los nombres de medicamentos y fuentes oficiales se mantienen en su forma original para mayor precisión." : "Spanish covers the main controls. Medication names and official sources keep their original form for accuracy."}
            </Text>
          </View>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>{spanish ? "Etiquetas accesibles por color" : "Color-safe labels"}</Text>
            <Text style={styles.noteText}>
              {spanish ? "Las tarjetas de medicamentos siempre nombran el color de la etiqueta con palabras; el color nunca es la única indicación." : "Medication cards always name the label color in words, so color is never the only instruction."}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Ver guía de bienvenida de ClearCue" : "View ClearCue welcome guide"}
            onPress={onShowOnboarding}
            style={extraStyles.welcomeGuideButton}
          >
            <Text style={extraStyles.cardLink}>{spanish ? "Ver guía de bienvenida" : "View welcome guide"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Terminar de ajustar accesibilidad" : "Done adjusting accessibility settings"}
            onPress={onClose}
            style={[styles.saveButton, settings.colorBlindMode && styles.monochromeButton]}
          >
            <Text style={styles.saveText}>{spanish ? "Listo" : "Done"}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function DropGuideModal({
  visible,
  animation,
  language,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  language: "en" | "es";
  onClose: () => void;
}) {
  const spanish = language === "es";
  const steps = spanish ? [
    ["Revisa primero", "Lee la etiqueta de la receta. Usa el medicamento exacto, el ojo y la cantidad de gotas que indicó tu profesional. No cambies el plan en ClearCue."],
    ["Lávate las manos", "Lávate las manos con agua y jabón antes de tocar el frasco o el área de los ojos."],
    ["Mantén limpia la punta", "Revisa que la punta del frasco esté intacta. No dejes que toque tus manos, ojo, párpado, pestañas ni ninguna superficie."],
    ["Haz un bolsillo", "Inclina la cabeza hacia atrás y mira arriba. Baja suavemente el párpado inferior para formar un pequeño bolsillo."],
    ["Coloca la gota", "Sostén la punta del frasco justo sobre el bolsillo sin tocarlo. Coloca la cantidad de gotas recetada."],
    ["Cierra y espera", "Cierra el ojo. Presiona suavemente la esquina interna cerca de la nariz durante al menos 1 minuto si tu profesional no indicó otra cosa. Para diferentes gotas, espera al menos 5 minutos entre ellas. Vuelve a colocar la tapa sin limpiar la punta."],
  ] : [
    [
      "Check first",
      "Read the prescription label. Use the exact medication, eye, and number of drops your clinician instructed. Do not change the plan in ClearCue.",
    ],
    [
      "Wash hands",
      "Wash your hands with soap and water before touching the bottle or your eye area.",
    ],
    [
      "Keep the tip clean",
      "Check that the bottle tip is intact. Do not let it touch your hands, eye, eyelid, eyelashes, or any surface.",
    ],
    [
      "Make a pocket",
      "Tilt your head back and look up. Gently pull down the lower eyelid to make a small pocket.",
    ],
    [
      "Place the drop",
      "Hold the bottle tip just above the pocket without touching it. Put in the prescribed number of drops.",
    ],
    [
      "Close and wait",
      "Close your eye. Gently press the inner corner near the nose for at least 1 minute if your clinician has not told you otherwise. For different eye drops, wait at least 5 minutes between them. Replace the cap without wiping the tip.",
    ],
  ];
  return (
    <Modal
      visible={visible}
      animationType={animation}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <AccentLabel>{spanish ? "GUÍA DE ACCESIBILIDAD" : "ACCESSIBILITY GUIDE"}</AccentLabel>
            <Text style={styles.modalTitle}>{spanish ? "Cómo usar gotas" : "How to use drops"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Cerrar guía sobre cómo usar gotas" : "Close how to use drops guide"}
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>
              {spanish ? "Sigue primero el plan de tu profesional" : "Follow your clinician’s plan first"}
            </Text>
            <Text style={styles.noteText}>
              {spanish ? "Estos pasos generales se basan en la guía para pacientes del National Eye Institute. La etiqueta de tu frasco o tu profesional puede indicar algo diferente, por ejemplo, agitar, lentes de contacto, almacenamiento o desechar el frasco. Para síntomas urgentes, sigue las instrucciones de emergencia de tu profesional o la orientación local de emergencia." : "These general steps are based on National Eye Institute patient guidance. Your bottle label or clinician may give different instructions—for example about shaking, contact lenses, storage, or discarding the bottle. For urgent symptoms, follow your clinician’s emergency instructions or local emergency guidance."}
            </Text>
          </View>
          {steps.map(([title, detail], index) => (
            <View
              key={title}
              accessible
              accessibilityLabel={spanish ? `Paso ${index + 1} de ${steps.length}: ${title}. ${detail}` : `Step ${index + 1} of ${steps.length}: ${title}. ${detail}`}
              style={extraStyles.guideStep}
            >
              <View style={extraStyles.guideNumber}>
                <Text style={extraStyles.guideNumberText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={extraStyles.guideTitle}>{title}</Text>
                <Text style={extraStyles.guideDetail}>{detail}</Text>
              </View>
            </View>
          ))}
          <Text style={extraStyles.guideSource}>
            {spanish ? "Fuente: National Eye Institute, “How to Put in Eye Drops”, revisado en septiembre de 2026." : "Source: National Eye Institute, “How to Put in Eye Drops,” reviewed September 2026."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Terminar de leer la guía sobre cómo usar gotas" : "Done reading how to use drops guide"}
            onPress={onClose}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>{spanish ? "Listo" : "Done"}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function OnboardingModal({
  visible,
  animation,
  language,
  step,
  onNext,
  onComplete,
}: {
  visible: boolean;
  animation: "none" | "slide";
  language: "en" | "es";
  step: number;
  onNext: () => void;
  onComplete: () => void;
}) {
  const spanish = language === "es";
  const { largeText, monochrome } = useContext(AccessibilityPresentationContext);
  const screens = spanish ? [
    { eyebrow: "BIENVENIDO A CLEARCUE", title: "Rutinas más claras, una gota a la vez.", body: "Mantén recordatorios de gotas, progreso diario y un resumen simple del paciente juntos en tu teléfono." },
    { eyebrow: "TU ATENCIÓN ES LO PRIMERO", title: "ClearCue apoya el plan de tu profesional.", body: "No diagnostica, receta, cambia tu dosis ni reemplaza las instrucciones de tu profesional o la etiqueta de la receta." },
    { eyebrow: "PRIVADO POR DEFECTO", title: "Tú mantienes el control.", body: "Tu rutina se guarda en este dispositivo. Tú eliges si usar recordatorios y cuándo compartir un informe generado por el paciente." },
  ] : [
    {
      eyebrow: "WELCOME TO CLEARCUE",
      title: "Clearer routines, one drop at a time.",
      body: "Keep eye-drop reminders, daily progress, and a simple patient summary together on your phone.",
    },
    {
      eyebrow: "YOUR CARE COMES FIRST",
      title: "ClearCue supports your clinician’s plan.",
      body: "It does not diagnose, prescribe, change your dose, or replace your clinician’s instructions or prescription label.",
    },
    {
      eyebrow: "PRIVATE BY DEFAULT",
      title: "You stay in control.",
      body: "Your routine is stored on this device. You choose whether to use reminders and when to share a patient-generated report.",
    },
  ];
  const current = screens[step] ?? screens[0];
  return (
    <Modal
      visible={visible}
      animationType={animation}
      presentationStyle="fullScreen"
      onRequestClose={onComplete}
    >
      <SafeAreaView style={extraStyles.onboardingScreen}>
        <View style={extraStyles.onboardingContent}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>◒</Text>
          </View>
          <AccentLabel>{current.eyebrow}</AccentLabel>
          <Text style={extraStyles.onboardingTitle}>{current.title}</Text>
          <Text style={extraStyles.onboardingBody}>{current.body}</Text>
          <View style={extraStyles.onboardingDots}>
            {screens.map((_, index) => (
              <View
                key={index}
                style={[
                  extraStyles.onboardingDot,
                  index === step && extraStyles.onboardingDotActive,
                ]}
              />
            ))}
          </View>
        </View>
        <View style={extraStyles.onboardingFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              step === screens.length - 1
                ? spanish ? "Comenzar con ClearCue" : "Get started with ClearCue"
                : spanish ? "Continuar bienvenida" : "Continue onboarding"
            }
            onPress={step === screens.length - 1 ? onComplete : onNext}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>
              {step === screens.length - 1 ? (spanish ? "Comenzar" : "Get started") : (spanish ? "Continuar" : "Continue")}
            </Text>
          </Pressable>
          {step < screens.length - 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={spanish ? "Omitir bienvenida" : "Skip onboarding"}
              onPress={onComplete}
              style={extraStyles.onboardingSkip}
            >
              <Text style={[styles.history, largeText && styles.largeAccentLabel, monochrome && styles.monochromeText]}>{spanish ? "Omitir por ahora" : "Skip for now"}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
function SettingRow({
  title,
  detail,
  value,
  onChange,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { largeText, monochrome } = useContext(AccessibilityPresentationContext);
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, largeText && styles.largeSettingTitle, monochrome && styles.monochromeText]}>{title}</Text>
        <Text style={[styles.settingDetail, largeText && styles.largeSettingDetail, monochrome && styles.monochromeText]}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: monochrome ? "#737373" : "#D6C4B8", true: monochrome ? "#000000" : "#B85C4A" }}
      />
    </View>
  );
}
type ModalProps = {
  visible: boolean;
  animation: "none" | "slide";
  isEditing: boolean;
  name: string;
  time: string;
  additionalTimes: string[];
  eye: Eye;
  color: string;
  clinicianInstructions: string;
  prescriber: string;
  prescriberPhone: string;
  pharmacy: string;
  pharmacyPhone: string;
  rxNumber: string;
  personalNotes: string;
  bottleMl: string;
  dropsPerApplication: string;
  applicationsPerDay: string;
  openedOn: string;
  warningDays: string;
  language: "en" | "es";
  largeText: boolean;
  deleteConfirming: boolean;
  formNotice: { title: string; message: string; allowReview?: boolean } | null;
  selectedMedication: CatalogMedication | null;
  onName: (v: string) => void;
  onSelectMedication: (medication: CatalogMedication) => void;
  onTime: (v: string) => void;
  onAdditionalTimes: (v: string[]) => void;
  onClinicianInstructions: (v: string) => void;
  onPrescriber: (v: string) => void;
  onPrescriberPhone: (v: string) => void;
  onPharmacy: (v: string) => void;
  onPharmacyPhone: (v: string) => void;
  onRxNumber: (v: string) => void;
  onPersonalNotes: (v: string) => void;
  onBottleMl: (v: string) => void;
  onDropsPerApplication: (v: string) => void;
  onApplicationsPerDay: (v: string) => void;
  onOpenedOn: (v: string) => void;
  onWarningDays: (v: string) => void;
  onEye: (v: Eye) => void;
  onColor: (v: string) => void;
  onClose: () => void;
  onDismissNotice: () => void;
  onReviewNotice: () => void;
  onDismiss: () => void;
  onSave: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};
function RoutineReviewModal({ visible, animation, name, eye, times, clinicianInstructions, bottleMl, dropsPerApplication, applicationsPerDay, openedOn, warningDays, language, confirmed, onConfirmed, onBack, onDismiss, onSave }: { visible: boolean; animation: "none" | "slide"; name: string; eye: Eye; times: string[]; clinicianInstructions: string; bottleMl: string; dropsPerApplication: string; applicationsPerDay: string; openedOn: string; warningDays: string; language: "en" | "es"; confirmed: boolean; onConfirmed: (value: boolean) => void; onBack: () => void; onDismiss: () => void; onSave: () => void }) {
  const spanish = language === "es";
  const warnings: string[] = [];
  if (bottleMl && Number(applicationsPerDay) !== times.length)
    warnings.push(
      spanish
        ? `Esta rutina tiene ${times.length} recordatorio${times.length === 1 ? "" : "s"}, mientras que la estimación de suministro indica ${applicationsPerDay} uso${Number(applicationsPerDay) === 1 ? "" : "s"} al día. Confirma ambos con la etiqueta de la receta.`
        : `This routine has ${times.length} reminder${times.length === 1 ? "" : "s"}, while the supply estimate says ${applicationsPerDay} use${Number(applicationsPerDay) === 1 ? "" : "s"} per day. Confirm both against the prescription label.`,
    );
  if (bottleMl && isValidIsoDate(openedOn)) {
    const opened = new Date(`${openedOn}T00:00:00`);
    const ageInDays = Math.floor((Date.now() - opened.getTime()) / 86400000);
    if (opened.getTime() > Date.now())
      warnings.push(
        spanish
          ? "La fecha de apertura del frasco está en el futuro. Puede ser válida para una rutina planificada, pero confírmala antes de guardar."
          : "The bottle-opened date is in the future. This can be valid for a planned routine, but confirm it before saving.",
      );
    else if (ageInDays > 365)
      warnings.push(
        spanish
          ? "La fecha de apertura del frasco tiene más de un año. Confirma que todavía sea el frasco y la fecha correctos."
          : "The bottle-opened date is more than a year ago. Confirm that it is still the correct bottle and date.",
      );
  }
  return <Modal visible={visible} animationType={animation} presentationStyle="pageSheet" onRequestClose={onBack} onDismiss={onDismiss}><SafeAreaView style={styles.modalScreen}><View style={styles.modalHeader}><View><AccentLabel>{spanish ? "REVISAR RUTINA" : "REVIEW ROUTINE"}</AccentLabel><Text style={styles.modalTitle}>{spanish ? "Revisa antes de guardar" : "Check before saving"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={spanish ? "Volver a editar la rutina" : "Return to routine editing"} onPress={onBack} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView contentContainerStyle={styles.form}><View style={styles.note}><Text style={styles.noteTitle}>{spanish ? "ClearCue apoya tu plan" : "ClearCue supports your plan"}</Text><Text style={styles.noteText}>{spanish ? "ClearCue no diagnostica, receta, valida un plan de tratamiento clínico ni reemplaza las instrucciones de tu profesional o la etiqueta de la receta." : "ClearCue does not diagnose, prescribe, validate a clinical treatment plan, or replace your clinician’s instructions or prescription label."}</Text></View><View style={extraStyles.detailsSection}><Text style={styles.fieldLabel}>{name}</Text><Text style={extraStyles.supplyHelp}>{localizedEye(eye, language)} · {times.join(" · ")}</Text>{clinicianInstructions ? <Text style={extraStyles.supplyHelp}>{spanish ? "Instrucciones del profesional: " : "Clinician instructions: "}{clinicianInstructions}</Text> : null}{bottleMl ? <Text style={extraStyles.supplyHelp}>{spanish ? "Estimación de suministro: " : "Supply estimate: "}{bottleMl} mL · {dropsPerApplication} {spanish ? `gota${Number(dropsPerApplication) === 1 ? "" : "s"} por uso` : `drop${Number(dropsPerApplication) === 1 ? "" : "s"} each use`} · {applicationsPerDay} {spanish ? `uso${Number(applicationsPerDay) === 1 ? "" : "s"} al día` : `use${Number(applicationsPerDay) === 1 ? "" : "s"} daily`} · {spanish ? "abierto " : "opened "}{openedOn} · {spanish ? `aviso ${warningDays} días antes de la estimación` : `warning ${warningDays} days before estimate`}</Text> : <Text style={extraStyles.supplyHelp}>{spanish ? "No se agregó estimación de suministro." : "No supply estimate added."}</Text>}</View>{warnings.map((warning) => <View key={warning} style={extraStyles.eraseSection}><Text style={extraStyles.eraseTitle}>{spanish ? "Revisa este detalle" : "Review this detail"}</Text><Text style={extraStyles.eraseText}>{warning}</Text></View>)}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} accessibilityLabel={spanish ? "Confirmo que revisé estos valores con la receta de mi profesional" : "I checked these values against my clinician's prescription"} onPress={() => onConfirmed(!confirmed)} style={[styles.choice, confirmed && styles.choiceSelected]}><Text style={[styles.choiceText, confirmed && styles.choiceTextSelected]}>{confirmed ? "✓ " : ""}{spanish ? "Confirmo que revisé estos valores con la receta de mi profesional." : "I checked these values against my clinician’s prescription."}</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ disabled: !confirmed }} accessibilityLabel={spanish ? "Guardar rutina de gotas revisada" : "Save reviewed eye drop routine"} disabled={!confirmed} onPress={onSave} style={[styles.saveButton, !confirmed && { opacity: 0.45 }]}><Text style={styles.saveText}>{spanish ? "Guardar rutina" : "Save routine"}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={spanish ? "Volver a editar la rutina" : "Return to routine editing"} onPress={onBack} style={extraStyles.emptyGuide}><Text style={extraStyles.cardLink}>{spanish ? "Volver y editar" : "Go back and edit"}</Text></Pressable></ScrollView></SafeAreaView></Modal>;
}
function AddMedicationModal(props: ModalProps) {
  const spanish = props.language === "es";
  const [medicationFilter, setMedicationFilter] =
    useState<MedicationFilter>("All");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [showMedicationDetails, setShowMedicationDetails] = useState(true);
  useEffect(() => {
    if (props.visible) {
      setCatalogQuery("");
      setShowAllSuggestions(false);
      setShowMedicationDetails(true);
    }
  }, [props.visible]);
  const suggestions = searchMedications(catalogQuery, medicationFilter);
  const displayedSuggestions = showAllSuggestions
    ? suggestions
    : suggestions.slice(0, 5);
  return (
    <Modal
      visible={props.visible}
      animationType={props.animation}
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
      onDismiss={props.onDismiss}
    >
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <AccentLabel>
              {props.isEditing
                ? props.language === "es"
                  ? "EDITAR RUTINA"
                  : "EDIT ROUTINE"
                : props.language === "es"
                  ? "NUEVA RUTINA"
                  : "NEW ROUTINE"}
            </AccentLabel>
            <Text style={styles.modalTitle}>
              {props.isEditing
                ? props.language === "es"
                  ? "Editar gotas"
                  : "Edit eye drop"
                : props.language === "es"
                  ? "Añadir gotas"
                  : "Add eye drop"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Cerrar formulario de medicamento" : "Close add medication form"}
            style={styles.close}
            onPress={props.onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Field label={props.language === "es" ? "Buscar medicamentos oftálmicos" : "Search eye medications"}>
            <TextInput
              accessibilityLabel={props.language === "es" ? "Buscar medicamentos oftálmicos" : "Search eye medications"}
              value={props.name}
              onChangeText={(value) => {
                setShowAllSuggestions(false);
                setCatalogQuery(value);
                props.onName(value);
              }}
              placeholder={props.language === "es" ? "Nombre genérico, marca o nombre común" : "Generic, brand, or common name"}
              placeholderTextColor="#81969A"
              style={styles.input}
            />
          </Field>
          <View>
            <Text style={styles.fieldLabel}>{props.language === "es" ? "Explorar por uso" : "Browse by use"}</Text>
            <View style={extraStyles.filterRow}>
              {MEDICATION_FILTERS.map((filter) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: medicationFilter === filter }}
                  accessibilityLabel={spanish ? `Filtrar medicamentos: ${localizedMedicationFilter(filter, props.language)}` : `Filter medications: ${filter}`}
                  key={filter}
                  onPress={() => {
                    setShowAllSuggestions(false);
                    setMedicationFilter(filter);
                  }}
                  style={[
                    extraStyles.filterChip,
                    medicationFilter === filter &&
                      extraStyles.filterChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      extraStyles.filterChipText,
                      medicationFilter === filter &&
                        extraStyles.filterChipTextSelected,
                    ]}
                  >
                    {localizedMedicationFilter(filter, props.language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            {displayedSuggestions.map((medication) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={spanish ? `Elegir ${medication.genericName}` : `Choose ${medication.genericName}`}
                key={medication.id}
                onPress={() => {
                  props.onSelectMedication(medication);
                  setShowMedicationDetails(true);
                }}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor:
                    props.selectedMedication?.id === medication.id
                      ? "#B85C4A"
                      : "#E7DDD4",
                  backgroundColor:
                    props.selectedMedication?.id === medication.id
                      ? "#F5E5D8"
                      : "#FFFFFF",
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "800", color: "#3A302B" }}
                >
                  {medication.genericName}
                </Text>
                <Text style={{ fontSize: 11, color: "#6F625B", marginTop: 3 }}>
                  {[medication.brandNames.join(" · "), medication.category]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Pressable>
            ))}
            {suggestions.length > 5 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showAllSuggestions ? (spanish ? "Mostrar menos resultados de medicamentos" : "Show fewer medication results") : (spanish ? `Mostrar los ${suggestions.length} resultados de medicamentos` : `Show all ${suggestions.length} medication results`)}
                onPress={() => setShowAllSuggestions((current) => !current)}
                style={extraStyles.emptyGuide}
              >
                <Text style={extraStyles.cardLink}>
                  {showAllSuggestions
                    ? spanish
                      ? "Mostrar menos"
                      : "Show fewer"
                    : spanish
                      ? `Mostrar los ${suggestions.length} resultados`
                      : `Show all ${suggestions.length} results`}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {props.selectedMedication && showMedicationDetails && (
            <View
              style={{
                backgroundColor: "#F5E5D8",
                borderRadius: 14,
                padding: 14,
                marginTop: -12,
              }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "800", color: "#3A302B" }}
              >
                {props.selectedMedication.genericName}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#B85C4A",
                  marginTop: 3,
                }}
              >
                {props.selectedMedication.category} ·{" "}
                {props.selectedMedication.form}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6F625B",
                  lineHeight: 17,
                  marginTop: 5,
                }}
              >
                {props.selectedMedication.commonUse}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "#704D30",
                  lineHeight: 16,
                  marginTop: 8,
                }}
              >
                {spanish
                  ? "Sigue las instrucciones de la etiqueta y de tu profesional de salud. ClearCue no proporciona indicaciones de dosis."
                  : "Use the instructions on your prescription label and from your clinician. ClearCue does not provide dosing directions."}
              </Text>
              <Text style={{ fontSize: 10, color: "#6F625B", marginTop: 7 }}>
                {props.selectedMedication.prescriptionStatus ??
                  (props.selectedMedication.id === "artificial-tears"
                    ? spanish ? "Sin receta" : "Over-the-counter"
                    : spanish ? "Con receta" : "Prescription")}{" "}
                {spanish ? "referencia" : "reference"} · {props.selectedMedication.source} · {spanish ? "revisado" : "reviewed"}{" "}
                {props.selectedMedication.reviewedOn}
              </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={spanish ? `Abrir fuentes de DailyMed para ${props.selectedMedication.genericName}` : `Open DailyMed sources for ${props.selectedMedication.genericName}`}
                onPress={() => {
                  void Linking.openURL(
                    medicationDailyMedUrl(props.selectedMedication!),
                  );
                }}
                style={{ alignSelf: "flex-start", marginTop: 6 }}
              >
                <Text style={extraStyles.cardLink}>
                  {spanish ? "Ver fuentes de DailyMed (requiere internet)" : "View DailyMed sources (requires internet)"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={spanish ? "Ocultar detalles del medicamento" : "Hide medication details"}
                onPress={() => setShowMedicationDetails(false)}
                style={{ alignSelf: "flex-start", marginTop: 10 }}
              >
                <Text style={extraStyles.cardLink}>
                  {spanish ? "Ocultar detalles" : "Hide details"}
                </Text>
              </Pressable>
            </View>
          )}
          {props.selectedMedication && !showMedicationDetails && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={spanish ? "Mostrar detalles del medicamento" : "Show medication details"}
              onPress={() => setShowMedicationDetails(true)}
              style={extraStyles.emptyGuide}
            >
              <Text style={extraStyles.cardLink}>
                {spanish ? "Mostrar detalles de la selección" : "Show selected medication details"}
              </Text>
            </Pressable>
          )}
          <TimePicker
            label={spanish ? "Primer recordatorio diario" : "First daily reminder"}
            value={props.time}
            onChange={props.onTime}
            language={props.language}
            largeText={props.largeText}
          />
          <View style={extraStyles.extraTimes}>
            <Text style={styles.fieldLabel}>{spanish ? "Recordatorios diarios adicionales" : "Additional daily reminders"}</Text>
            <Text style={extraStyles.supplyHelp}>
              {spanish ? "Úsalo si tomas el mismo medicamento más de una vez al día." : "Use this when the same medication is taken more than once a day."}
            </Text>
            {props.additionalTimes.map((item, index) => (
              <View key={`${index}-${item}`} style={extraStyles.extraTimeRow}>
                <View style={{ flex: 1 }}>
                  <TimePicker
                    label={spanish ? `Recordatorio ${index + 2}` : `Reminder ${index + 2}`}
                    value={item}
                    onChange={(value) =>
                      props.onAdditionalTimes(
                        props.additionalTimes.map((current, currentIndex) =>
                          currentIndex === index ? value : current,
                        ),
                      )
                    }
                    language={props.language}
                    largeText={props.largeText}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={spanish ? `Eliminar recordatorio ${index + 2}` : `Remove reminder ${index + 2}`}
                  onPress={() =>
                    props.onAdditionalTimes(
                      props.additionalTimes.filter(
                        (_, currentIndex) => currentIndex !== index,
                      ),
                    )
                  }
                  style={extraStyles.removeTime}
                >
                  <Text style={extraStyles.removeTimeText}>×</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={spanish ? "Añadir otra hora de recordatorio diario" : "Add another daily reminder time"}
              onPress={() =>
                props.onAdditionalTimes([...props.additionalTimes, "1:00 PM"])
              }
              style={extraStyles.addTime}
            >
              <Text style={extraStyles.addTimeText}>
                {spanish ? "＋ Añadir otra hora diaria" : "＋ Add another daily time"}
              </Text>
            </Pressable>
          </View>
          <Field label={spanish ? "Instrucciones de aplicación del profesional (opcional)" : "Clinician application instructions (optional)"}>
            <TextInput
              accessibilityLabel={spanish ? "Instrucciones de aplicación del profesional" : "Clinician application instructions"}
              value={props.clinicianInstructions}
              onChangeText={props.onClinicianInstructions}
              placeholder={spanish ? "Copia las instrucciones de tu profesional o de la etiqueta" : "Copy the instructions from your clinician or prescription label"}
              placeholderTextColor="#81969A"
              multiline
              style={[
                styles.input,
                { height: 78, paddingTop: 12, textAlignVertical: "top" },
              ]}
            />
          </Field>
          <View style={extraStyles.detailsSection}>
            <Text style={styles.fieldLabel}>
              {spanish ? "Detalles privados de la receta (opcional)" : "Private prescription details (optional)"}
            </Text>
            <Text style={extraStyles.supplyHelp}>
              {spanish ? "Se guardan solo en este dispositivo. Estos datos nunca cambian el horario del medicamento." : "Stored only on this device. These details are never used to change a medication schedule."}
            </Text>
            <Field label={spanish ? "Profesional que receta" : "Prescriber"}>
              <TextInput
                accessibilityLabel={spanish ? "Nombre del profesional que receta" : "Prescriber name"}
                value={props.prescriber}
                onChangeText={props.onPrescriber}
                placeholder={spanish ? "p. ej., Dra. Rivera" : "e.g. Dr. Rivera"}
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label={spanish ? "Teléfono del profesional" : "Prescriber phone"}>
              <TextInput
                accessibilityLabel={spanish ? "Teléfono del profesional" : "Prescriber phone number"}
                value={props.prescriberPhone}
                onChangeText={props.onPrescriberPhone}
                placeholder={spanish ? "p. ej., (555) 123-4567" : "e.g. (555) 123-4567"}
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={20}
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label={spanish ? "Farmacia" : "Pharmacy"}>
              <TextInput
                accessibilityLabel={spanish ? "Nombre de la farmacia" : "Pharmacy name"}
                value={props.pharmacy}
                onChangeText={props.onPharmacy}
                placeholder={spanish ? "p. ej., Farmacia Central" : "e.g. Main Street Pharmacy"}
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label={spanish ? "Teléfono de la farmacia" : "Pharmacy phone"}>
              <TextInput
                accessibilityLabel={spanish ? "Teléfono de la farmacia" : "Pharmacy phone number"}
                value={props.pharmacyPhone}
                onChangeText={props.onPharmacyPhone}
                placeholder={spanish ? "p. ej., (555) 123-4567" : "e.g. (555) 123-4567"}
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={20}
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label={spanish ? "Número de receta" : "Prescription number"}>
              <TextInput
                accessibilityLabel={spanish ? "Número de receta" : "Prescription number"}
                value={props.rxNumber}
                onChangeText={props.onRxNumber}
                placeholder={spanish ? "Opcional" : "Optional"}
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label={spanish ? "Nota personal" : "Personal note"}>
              <TextInput
                accessibilityLabel={spanish ? "Nota personal del medicamento" : "Personal medication note"}
                value={props.personalNotes}
                onChangeText={props.onPersonalNotes}
                placeholder={spanish ? "Recordatorio opcional para ti" : "Optional reminder for yourself"}
                placeholderTextColor="#81969A"
                multiline
                style={[
                  styles.input,
                  { height: 70, paddingTop: 12, textAlignVertical: "top" },
                ]}
              />
            </Field>
          </View>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>{spanish ? "ClearCue apoya tu plan" : "ClearCue supports your plan"}</Text>
            <Text style={styles.noteText}>
              {spanish ? "ClearCue no diagnostica, receta, cambia una dosis ni reemplaza las instrucciones de tu profesional o la etiqueta de la receta." : "ClearCue does not diagnose, prescribe, change a dose, or replace your clinician’s instructions or prescription label."}
            </Text>
          </View>
          <View style={extraStyles.supplySection}>
            <Text style={styles.fieldLabel}>{spanish ? "Estimación de suministro opcional" : "Optional supply estimate"}</Text>
            <Text style={extraStyles.supplyHelp}>
              {spanish ? "Úsala solo para planificación. Confirma las reposiciones y las instrucciones del frasco con tu farmacia o profesional." : "Use this only as a planning estimate. Confirm refills and bottle instructions with your pharmacy or clinician."}
            </Text>
            <Field label={spanish ? "Tamaño del frasco (mL)" : "Bottle size (mL)"}>
              <TextInput
                accessibilityLabel={spanish ? "Tamaño del frasco en mililitros" : "Bottle size in milliliters"}
                value={props.bottleMl}
                onChangeText={props.onBottleMl}
                placeholder={spanish ? "p. ej., 5" : "e.g. 5"}
                keyboardType="decimal-pad"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <View style={extraStyles.supplyRow}>
              <View style={extraStyles.supplyHalf}>
                <Field label={spanish ? "Gotas en cada uso" : "Drops each use"}>
                  <TextInput
                    accessibilityLabel={spanish ? "Gotas por aplicación" : "Drops per application"}
                    value={props.dropsPerApplication}
                    onChangeText={props.onDropsPerApplication}
                    keyboardType="number-pad"
                    placeholderTextColor="#81969A"
                    style={styles.input}
                  />
                </Field>
              </View>
              <View style={extraStyles.supplyHalf}>
                <Field label={spanish ? "Usos por día" : "Uses per day"}>
                  <TextInput
                    accessibilityLabel={spanish ? "Aplicaciones por día" : "Applications per day"}
                    value={props.applicationsPerDay}
                    onChangeText={props.onApplicationsPerDay}
                    keyboardType="number-pad"
                    placeholderTextColor="#81969A"
                    style={styles.input}
                  />
                </Field>
              </View>
            </View>
            <DatePicker
              label={spanish ? "Frasco abierto" : "Bottle opened"}
              value={props.openedOn}
              onChange={props.onOpenedOn}
              language={props.language}
              largeText={props.largeText}
            />
            <Field label={spanish ? "Avisarme esta cantidad de días antes de la estimación" : "Warn me this many days before estimate"}>
              <TextInput
                accessibilityLabel={spanish ? "Días de aviso para reposición" : "Refill warning days"}
                value={props.warningDays}
                onChangeText={props.onWarningDays}
                keyboardType="number-pad"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Text style={extraStyles.supplyFootnote}>
              {spanish ? "ClearCue estima usando 20 gotas por mL. El volumen real del frasco y el tamaño de la gota pueden variar." : "ClearCue estimates using 20 drops per mL. Actual bottle volume and drop size can vary."}
            </Text>
          </View>
          <Field label={spanish ? "¿Qué ojo?" : "Which eye?"}>
            <View style={styles.choiceRow}>
              {(["Left eye", "Right eye", "Both eyes"] as Eye[]).map((item) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: props.eye === item }}
                  accessibilityLabel={localizedEye(item, props.language)}
                  key={item}
                  onPress={() => props.onEye(item)}
                  style={[
                    styles.choice,
                    props.eye === item && styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      props.eye === item && styles.choiceTextSelected,
                    ]}
                  >
                    {localizedEye(item, props.language).replace(spanish ? "Ojo " : " eye", "")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label={spanish ? "Color de la etiqueta del frasco (opcional)" : "Bottle label color (optional)"}>
            <View style={styles.colorRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: props.color === NO_COLOR }}
                accessibilityLabel={spanish ? "No especificar color de etiqueta" : "Do not specify a label color"}
                onPress={() => props.onColor(NO_COLOR)}
                style={[
                  styles.colorChoice,
                  styles.noColorChoice,
                  props.color === NO_COLOR && styles.colorSelected,
                ]}
              >
                <Text style={styles.noColorChoiceText}>—</Text>
              </Pressable>
              {COLORS.map((item) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: props.color === item }}
                  accessibilityLabel={`${COLOR_NAMES[item]?.[props.language] ?? (spanish ? "Personalizado" : "Custom")} ${spanish ? "etiqueta del frasco" : "bottle label"}`}
                  key={item}
                  onPress={() => props.onColor(item)}
                  style={[
                    styles.colorChoice,
                    { backgroundColor: item },
                    props.color === item && styles.colorSelected,
                  ]}
                />
              ))}
            </View>
          </Field>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>{spanish ? "Confirma tu frasco" : "Confirm your bottle"}</Text>
            <Text style={styles.noteText}>
              {spanish ? "El empaque de marca y genérico puede variar. Elige el color de la etiqueta que ves en tu frasco y sigue las instrucciones de tu profesional." : "Brand and generic packaging can differ. Choose the label color you see on your bottle and follow your clinician’s instructions."}
            </Text>
          </View>
          {props.formNotice && (
            <View style={extraStyles.deleteConfirm}>
              <Text style={extraStyles.eraseTitle}>{props.formNotice.title}</Text>
              <Text style={extraStyles.eraseText}>{props.formNotice.message}</Text>
              <View style={styles.choiceRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={spanish ? "Descartar mensaje del formulario" : "Dismiss routine form message"}
                  onPress={props.onDismissNotice}
                  style={styles.choice}
                >
                  <Text style={styles.choiceText}>{spanish ? "Seguir editando" : "Keep editing"}</Text>
                </Pressable>
                {props.formNotice.allowReview && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={spanish ? "Revisar rutina a pesar de horarios cercanos" : "Review routine despite close reminder times"}
                    onPress={props.onReviewNotice}
                    style={extraStyles.deleteConfirmButton}
                  >
                    <Text style={extraStyles.deleteConfirmButtonText}>{spanish ? "Revisar rutina" : "Review routine"}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={spanish ? "Guardar medicamento" : "Save medication"}
            onPress={props.onSave}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>
              {props.isEditing ? (spanish ? "Guardar cambios" : "Save changes") : (spanish ? "Añadir a mi rutina" : "Add to my routine")}
            </Text>
          </Pressable>
          {props.isEditing &&
            (props.deleteConfirming ? (
              <View style={extraStyles.deleteConfirm}>
                <Text style={extraStyles.eraseTitle}>{spanish ? "¿Eliminar estas gotas?" : "Remove this eye drop?"}</Text>
                <Text style={extraStyles.eraseText}>
                  {spanish ? "Esto elimina de la rutina todos los horarios diarios de este medicamento." : "This removes all of this medication’s daily reminder times from the routine."}
                </Text>
                <View style={styles.choiceRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={spanish ? "Conservar este medicamento" : "Keep this medication"}
                    onPress={props.onCancelDelete}
                    style={styles.choice}
                  >
                    <Text style={styles.choiceText}>{spanish ? "Conservar" : "Keep"}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={spanish ? "Confirmar eliminación de este medicamento" : "Confirm removal of this medication"}
                    onPress={props.onConfirmDelete}
                    style={extraStyles.deleteConfirmButton}
                  >
                    <Text style={extraStyles.deleteConfirmButtonText}>{spanish ? "Eliminar" : "Remove"}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={spanish ? "Eliminar este medicamento" : "Remove this medication"}
                onPress={props.onDelete}
                style={{ padding: 14, alignItems: "center" }}
              >
                <Text style={{ color: "#B3362D", fontWeight: "800" }}>
                  {spanish ? "Eliminar estas gotas" : "Remove this eye drop"}
                </Text>
              </Pressable>
            ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function TimePicker({
  label,
  value,
  onChange,
  language,
  largeText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  language: "en" | "es";
  largeText: boolean;
}) {
  const spanish = language === "es";
  const { monochrome } = useContext(AccessibilityPresentationContext);
  const [open, setOpen] = useState(false);
  return (
    <Field label={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}: ${value}. ${spanish ? "Abrir menú de hora" : "Open time menu"}`}
        accessibilityHint={spanish ? "Elige una hora común o ingresa una hora personalizada" : "Choose a common reminder time or enter a custom time"}
        onPress={() => setOpen((current) => !current)}
        style={extraStyles.timePickerButton}
      >
        <Text style={[extraStyles.timePickerValue, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>
          {value || (spanish ? "Selecciona una hora" : "Select a time")}
        </Text>
        <Text style={[extraStyles.timePickerArrow, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>{open ? "⌃" : "⌄"}</Text>
      </Pressable>
      {open && (
        <View style={extraStyles.timeMenu}>
          <Text style={[extraStyles.supplyHelp, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>{spanish ? "Elige una hora común" : "Choose a common time"}</Text>
          <View style={extraStyles.timeMenuGrid}>
            {TIME_OPTIONS.map((option) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: value === option }}
                accessibilityLabel={option}
                key={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={[
                  extraStyles.timeOption,
                  value === option && extraStyles.timeOptionSelected,
                ]}
              >
                <Text
                  style={[
                    extraStyles.timeOptionText,
                    largeText && styles.largeMenuText,
                    value === option && extraStyles.timeOptionTextSelected,
                    monochrome && styles.monochromeText,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.fieldLabel, largeText && styles.largeFieldLabel, monochrome && styles.monochromeText, { marginTop: 5 }]}>
            {spanish ? "O establece una hora personalizada" : "Or set a custom time"}
          </Text>
          <ClockDial value={value} onChange={onChange} language={language} largeText={largeText} />
          <TextInput
            accessibilityLabel={spanish ? `${label.toLowerCase()} personalizada` : `Custom ${label.toLowerCase()}`}
            value={value}
            onChangeText={onChange}
            placeholder={spanish ? "O escribe, por ejemplo, 8:30 AM" : "Or type e.g. 8:30 AM"}
            placeholderTextColor="#81969A"
            style={styles.input}
          />
          <Text style={[extraStyles.supplyHelp, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>
            {spanish ? "Elige una hora, minutos y AM/PM, o escribe una hora precisa. El recordatorio de tu iPhone usará esta hora exacta." : "Choose an hour, minutes, and AM/PM—or type a precise time. Your iPhone reminder will use this exact time."}
          </Text>
        </View>
      )}
    </Field>
  );
}
function ClockDial({
  value,
  onChange,
  language,
  largeText,
}: {
  value: string;
  onChange: (value: string) => void;
  language: "en" | "es";
  largeText: boolean;
}) {
  const { monochrome } = useContext(AccessibilityPresentationContext);
  const clock = parseReminderTime(value) ?? { hour: 9, minute: 0 };
  const displayHour = clock.hour % 12 || 12;
  const period = clock.hour >= 12 ? "PM" : "AM";
  const setTime = (hour: number, minute = clock.minute) =>
    onChange(formatReminderTime(hour, minute));
  return (
    <View style={extraStyles.clockPicker}>
      <Text style={[extraStyles.supplyHelp, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>{language === "es" ? "Toca el reloj para elegir una hora" : "Tap the clock to choose an hour"}</Text>
      <View style={extraStyles.clockDial}>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => {
          const angle = ((hour % 12) * Math.PI) / 6 - Math.PI / 2;
          const radius = 82;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: displayHour === hour }}
              accessibilityLabel={`${hour} ${period}`}
              key={hour}
              onPress={() =>
                setTime(
                  period === "PM" && hour !== 12
                    ? hour + 12
                    : period === "AM" && hour === 12
                      ? 0
                      : hour,
                )
              }
              style={[
                extraStyles.clockHour,
                {
                  left: 100 + Math.cos(angle) * radius - 18,
                  top: 100 + Math.sin(angle) * radius - 18,
                },
                displayHour === hour && extraStyles.clockHourSelected,
              ]}
            >
              <Text
                style={[
                extraStyles.clockHourText,
                largeText && styles.largeClockText,
                displayHour === hour && extraStyles.clockHourTextSelected,
                monochrome && ! (displayHour === hour) && styles.monochromeText,
                ]}
              >
                {hour}
              </Text>
            </Pressable>
          );
        })}
        <Text style={[extraStyles.clockCenterText, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>
          {formatReminderTime(clock.hour, clock.minute)}
        </Text>
      </View>
      <View style={extraStyles.clockMinuteRow}>
        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: clock.minute === minute }}
              accessibilityLabel={language === "es" ? `${String(minute).padStart(2, "0")} minutos` : `${String(minute).padStart(2, "0")} minutes`}
            key={minute}
            onPress={() => setTime(clock.hour, minute)}
            style={[
              extraStyles.clockMinute,
              clock.minute === minute && extraStyles.clockMinuteSelected,
            ]}
          >
            <Text
              style={[
                extraStyles.clockMinuteText,
                largeText && styles.largeClockText,
                clock.minute === minute && extraStyles.clockMinuteTextSelected,
                monochrome && !(clock.minute === minute) && styles.monochromeText,
              ]}
            >
              {String(minute).padStart(2, "0")}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={extraStyles.clockPeriodRow}>
        {(["AM", "PM"] as const).map((nextPeriod) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: period === nextPeriod }}
            accessibilityLabel={nextPeriod}
            key={nextPeriod}
            onPress={() =>
              setTime(
                nextPeriod === "PM"
                  ? displayHour === 12
                    ? 12
                    : displayHour + 12
                  : displayHour === 12
                    ? 0
                    : displayHour,
              )
            }
            style={[
              extraStyles.clockPeriod,
              period === nextPeriod && extraStyles.clockPeriodSelected,
            ]}
          >
            <Text
              style={[
                extraStyles.clockPeriodText,
                largeText && styles.largeClockText,
                period === nextPeriod && extraStyles.clockPeriodTextSelected,
                monochrome && !(period === nextPeriod) && styles.monochromeText,
              ]}
            >
              {nextPeriod}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function DatePicker({
  label,
  value,
  onChange,
  language,
  largeText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  language: "en" | "es";
  largeText: boolean;
}) {
  const spanish = language === "es";
  const { monochrome } = useContext(AccessibilityPresentationContext);
  const [open, setOpen] = useState(false);
  const selectedDate = isValidIsoDate(value)
    ? new Date(`${value}T00:00:00`)
    : new Date();
  const [visibleMonth, setVisibleMonth] = useState(() =>
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const monthLabel = visibleMonth.toLocaleDateString(spanish ? "es-US" : "en-US", {
    month: "long",
    year: "numeric",
  });
  const leadingDays = visibleMonth.getDay();
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const cells = Array.from({ length: leadingDays + daysInMonth }, (_, index) =>
    index < leadingDays ? null : index - leadingDays + 1,
  );
  const openCalendar = () => {
    if (!open) {
      setVisibleMonth(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
      );
    }
    setOpen((current) => !current);
  };
  return (
    <Field label={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}: ${value}. ${spanish ? "Abrir calendario" : "Open calendar"}`}
        accessibilityHint={spanish ? "Elige la fecha en que abriste el frasco desde un calendario" : "Choose the bottle-opened date from a calendar"}
        onPress={openCalendar}
        style={extraStyles.timePickerButton}
      >
        <Text style={[extraStyles.timePickerValue, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>{value}</Text>
        <Text style={[extraStyles.timePickerArrow, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>{open ? "⌃" : "⌄"}</Text>
      </Pressable>
      {open && (
        <View style={extraStyles.dateMenu}>
          <View style={extraStyles.dateMenuHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={spanish ? "Mes anterior" : "Previous month"}
              onPress={() =>
                setVisibleMonth(
                  (current) =>
                    new Date(current.getFullYear(), current.getMonth() - 1, 1),
                )
              }
              style={extraStyles.dateMonthButton}
            >
              <Text style={[extraStyles.dateMonthButtonText, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>‹</Text>
            </Pressable>
            <Text style={[extraStyles.dateMonthLabel, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>{monthLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={spanish ? "Mes siguiente" : "Next month"}
              onPress={() =>
                setVisibleMonth(
                  (current) =>
                    new Date(current.getFullYear(), current.getMonth() + 1, 1),
                )
              }
              style={extraStyles.dateMonthButton}
            >
              <Text style={[extraStyles.dateMonthButtonText, largeText && styles.largeMenuText, monochrome && styles.monochromeText]}>›</Text>
            </Pressable>
          </View>
          <View style={extraStyles.dateWeekRow}>
            {(spanish
              ? ["D", "L", "M", "X", "J", "V", "S"]
              : ["S", "M", "T", "W", "T", "F", "S"]
            ).map((day, index) => (
              <Text key={`${day}-${index}`} style={[extraStyles.dateWeekday, largeText && styles.largeClockText, monochrome && styles.monochromeText]}>
                {day}
              </Text>
            ))}
          </View>
          <View style={extraStyles.dateGrid}>
            {cells.map((day, index) =>
              day === null ? (
                <View key={`blank-${index}`} style={extraStyles.dateCell} />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${monthLabel} ${day}`}
                  key={day}
                  onPress={() => {
                    onChange(
                      dateKey(
                        new Date(
                          visibleMonth.getFullYear(),
                          visibleMonth.getMonth(),
                          day,
                        ),
                      ),
                    );
                    setOpen(false);
                  }}
                  style={[
                    extraStyles.dateCell,
                    selectedDate.getFullYear() === visibleMonth.getFullYear() &&
                      selectedDate.getMonth() === visibleMonth.getMonth() &&
                      selectedDate.getDate() === day &&
                      extraStyles.dateCellSelected,
                  ]}
                >
                  <Text
                    style={[
                      extraStyles.dateCellText,
                      largeText && styles.largeClockText,
                      selectedDate.getFullYear() === visibleMonth.getFullYear() &&
                        selectedDate.getMonth() === visibleMonth.getMonth() &&
                        selectedDate.getDate() === day &&
                      extraStyles.dateCellTextSelected,
                      monochrome && !(selectedDate.getFullYear() === visibleMonth.getFullYear() && selectedDate.getMonth() === visibleMonth.getMonth() && selectedDate.getDate() === day) && styles.monochromeText,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        </View>
      )}
    </Field>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { largeText, monochrome } = useContext(AccessibilityPresentationContext);
  return (
    <View>
      <Text style={[styles.fieldLabel, largeText && styles.largeFieldLabel, monochrome && styles.monochromeText]}>{label}</Text>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAF7F2" },
  content: { padding: 20, paddingBottom: 118 },
  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: { flexDirection: "row", gap: 8 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#B85C4A",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-28deg" }],
  },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  brand: { fontSize: 20, fontWeight: "800", color: "#B85C4A" },
  help: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  helpText: { color: "#B85C4A", fontSize: 17, fontWeight: "800" },
  date: {
    marginTop: 42,
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 1.15,
    color: "#B85C4A",
  },
  greeting: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: "#3A302B",
    marginTop: 5,
  },
  subheading: { fontSize: 18, lineHeight: 25, color: "#6F625B", marginTop: 5 },
  progressCard: {
    marginTop: 25,
    borderRadius: 21,
    backgroundColor: "#B85C4A",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1,
    fontWeight: "800",
    color: "#FBE3DA",
  },
  progressText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 20,
    lineHeight: 26,
    marginTop: 8,
  },
  progressCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#F9E7DE",
    padding: 6,
  },
  progressInner: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: "#A74C3F",
    alignItems: "center",
    justifyContent: "center",
  },
  progressNumber: { color: "#fff", fontSize: 13, fontWeight: "800" },
  sectionHeader: {
    marginTop: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: "#B85C4A",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: "#3A302B",
    marginTop: 4,
  },
  history: { fontSize: 14, fontWeight: "800", color: "#B85C4A" },
  list: { gap: 12, marginTop: 16 },
  doseCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E7DDD4",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completedCard: { opacity: 0.55 },
  colorDot: {
    width: 35,
    height: 35,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: "#ffffff80",
  },
  doseInfo: { flex: 1 },
  doseName: { fontSize: 17, lineHeight: 23, fontWeight: "800", color: "#3A302B" },
  doseDetails: { fontSize: 14, lineHeight: 20, color: "#6F625B", marginTop: 4 },
  doseAction: { alignItems: "flex-end", gap: 6 },
  time: { fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#B85C4A" },
  doneButton: {
    backgroundColor: "#B85C4A",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 45,
    alignItems: "center",
  },
  checkedButton: { backgroundColor: "#D8B8AD" },
  doneText: { color: "#fff", fontSize: 14, lineHeight: 19, fontWeight: "800" },
  insightsPanel: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E7DDD4",
  },
  insightsTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#3A302B",
    marginTop: 4,
  },
  metricRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  metric: {
    flex: 1,
    backgroundColor: "#F8EEE7",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  metricValue: { fontSize: 16, fontWeight: "800", color: "#B85C4A" },
  metricLabel: {
    alignSelf: "stretch",
    color: "#6F625B",
    fontSize: 10,
    lineHeight: 13,
    marginTop: 3,
    textAlign: "center",
  },
  chartLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3A302B",
    marginTop: 20,
    marginBottom: 10,
  },
  weekRow: {
    height: 73,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  dayColumn: {
    width: "12%",
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  dayDots: {
    height: 53,
    justifyContent: "flex-end",
    gap: 3,
    alignItems: "center",
  },
  statusDot: { width: 11, height: 11, borderRadius: 6 },
  takenDot: { backgroundColor: "#557A66" },
  lateDot: { backgroundColor: "#B9823E" },
  missedDot: { backgroundColor: "#B85C4A" },
  emptyDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#E7DDD4",
  },
  dayLabel: { fontSize: 11, color: "#6F625B", marginTop: 6 },
  legend: { flexDirection: "row", gap: 12, marginTop: 13 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: "#6F625B" },
  insightBox: {
    marginTop: 18,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#F5E5D8",
  },
  insightEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#9B6B3D",
  },
  insightText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#704D30",
    lineHeight: 18,
    marginTop: 4,
  },
  medicationRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  miniColor: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  medicationInfo: { flex: 1 },
  medicationLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  medicationName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3A302B",
    flex: 1,
  },
  medicationPercent: { fontSize: 12, fontWeight: "800", color: "#B85C4A" },
  barTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F2EBE4",
    overflow: "hidden",
    marginTop: 6,
  },
  barFill: { height: "100%", borderRadius: 4 },
  medicationDetail: { fontSize: 10, color: "#6F625B", marginTop: 4 },
  reportButton: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E7DDD4",
    paddingTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportButtonText: { color: "#B85C4A", fontWeight: "800", fontSize: 14 },
  reportButtonArrow: {
    color: "#B85C4A",
    fontWeight: "800",
    fontSize: 25,
    lineHeight: 20,
  },
  reminderCard: {
    marginTop: 22,
    backgroundColor: "#F5E5D8",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reminderCopy: { flex: 1 },
  reminderTitle: { color: "#3A302B", fontSize: 16, lineHeight: 22, fontWeight: "800" },
  reminderText: {
    color: "#6F625B",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  reminderButton: {
    backgroundColor: "#B85C4A",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
  },
  reminderButtonOn: { backgroundColor: "#8C6755" },
  reminderButtonText: { color: "#fff", fontSize: 14, lineHeight: 19, fontWeight: "800" },
  tip: {
    marginTop: 25,
    backgroundColor: "#F5E5D8",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  tipIcon: { fontSize: 20, color: "#9B6B3D" },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800", color: "#704D30" },
  tipText: { fontSize: 14, color: "#704D30", lineHeight: 20, marginTop: 4 },
  addButton: {
    position: "absolute",
    bottom: 23,
    alignSelf: "center",
    backgroundColor: "#B85C4A",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    shadowColor: "#983C30",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  addPlus: { color: "#fff", fontSize: 21, fontWeight: "700", lineHeight: 22 },
  addText: { color: "#fff", fontSize: 17, lineHeight: 22, fontWeight: "800" },
  modalScreen: { flex: 1, backgroundColor: "#FAF7F2" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 22,
    paddingBottom: 14,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: "#3A302B",
    marginTop: 4,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 25, color: "#B85C4A", lineHeight: 28 },
  form: { padding: 22, gap: 22 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3A302B",
    marginBottom: 8,
  },
  input: {
    height: 50,
    backgroundColor: "#fff",
    borderColor: "#E7DDD4",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 19,
    lineHeight: 25,
    color: "#3A302B",
  },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E7DDD4",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  choiceSelected: { backgroundColor: "#F5E5D8", borderColor: "#B85C4A" },
  choiceText: { fontSize: 14, fontWeight: "700", color: "#6F625B" },
  choiceTextSelected: { color: "#B85C4A" },
  colorRow: { flexDirection: "row", gap: 12 },
  colorChoice: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 4,
    borderColor: "#fff",
  },
  colorSelected: { borderColor: "#3A302B" },
  noColorChoice: { backgroundColor: "#F2EBE4", alignItems: "center", justifyContent: "center" },
  noColorChoiceText: { color: "#6F625B", fontSize: 18, fontWeight: "800", lineHeight: 20 },
  note: { backgroundColor: "#F5E5D8", borderRadius: 14, padding: 15 },
  noteTitle: { fontWeight: "800", color: "#704D30", fontSize: 14 },
  noteText: { color: "#704D30", fontSize: 13, lineHeight: 19, marginTop: 4 },
  saveButton: {
    backgroundColor: "#B85C4A",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  reportContent: { padding: 22, gap: 16 },
  periodPicker: {
    flexDirection: "row",
    backgroundColor: "#E7F0EE",
    borderRadius: 12,
    padding: 3,
  },
  periodOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  periodOptionSelected: { backgroundColor: "#fff" },
  periodText: { fontSize: 13, fontWeight: "700", color: "#6F625B" },
  periodTextSelected: { color: "#B85C4A" },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7DDD4",
  },
  reportBrand: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#B85C4A",
  },
  reportRange: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3A302B",
    marginTop: 5,
  },
  reportMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
    gap: 9,
  },
  reportMetric: {
    width: "47%",
    backgroundColor: "#F8EEE7",
    padding: 12,
    borderRadius: 12,
  },
  reportMetricValue: { fontSize: 20, fontWeight: "800", color: "#B85C4A" },
  reportMetricLabel: { fontSize: 11, color: "#6F625B", marginTop: 3 },
  reportHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3A302B",
    marginTop: 21,
    marginBottom: 7,
  },
  reportMedication: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F2EBE4",
  },
  reportMedicationName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3A302B",
    flex: 1,
  },
  reportMedicationValue: { fontSize: 12, color: "#6F625B" },
  reportPattern: {
    marginTop: 18,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "#F5E5D8",
  },
  reportDisclaimer: {
    fontSize: 10,
    color: "#6F625B",
    lineHeight: 15,
    marginTop: 18,
  },
  largeText: { fontSize: 22, lineHeight: 30 },
  largeAccentLabel: { fontSize: 18, lineHeight: 25, letterSpacing: 0.8 },
  largeCardLabel: { fontSize: 16, lineHeight: 22, letterSpacing: 0.8 },
  largeFieldLabel: { fontSize: 19, lineHeight: 26 },
  largeMenuText: { fontSize: 20, lineHeight: 27 },
  largeClockText: { fontSize: 16, lineHeight: 21 },
  largeSettingTitle: { fontSize: 20, lineHeight: 27 },
  largeSettingDetail: { fontSize: 16, lineHeight: 23 },
  largeHomeActionLabel: { fontSize: 20, lineHeight: 27 },
  largeHomeActionDetail: { fontSize: 16, lineHeight: 23 },
  largeCardLink: { fontSize: 16, lineHeight: 22 },
  largeContent: { paddingHorizontal: 24 },
  highContrastRoot: { backgroundColor: "#FFFFFF" },
  highContrastCard: {
    backgroundColor: "#5C2D26",
    borderWidth: 2,
    borderColor: "#000",
  },
  highContrastSoftCard: {
    borderWidth: 2,
    borderColor: "#3A302B",
    backgroundColor: "#FFFFFF",
  },
  monochromeRoot: { backgroundColor: "#FFFFFF" },
  monochromePrimaryCard: { backgroundColor: "#000000", borderWidth: 2, borderColor: "#000000" },
  monochromeSoftCard: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#000000" },
  monochromeButton: { backgroundColor: "#000000", borderWidth: 1, borderColor: "#000000", shadowOpacity: 0 },
  monochromeText: { color: "#000000" },
  monochromeLightText: { color: "#FFFFFF" },
  monochromeProgressCircle: { backgroundColor: "#FFFFFF" },
  monochromeProgressInner: { backgroundColor: "#000000" },
  settingsIntro: { fontSize: 14, color: "#6F625B", lineHeight: 20 },
  settingRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E7DDD4",
  },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: "800", color: "#3A302B" },
  settingDetail: {
    fontSize: 12,
    color: "#6F625B",
    lineHeight: 17,
    marginTop: 3,
  },
});
