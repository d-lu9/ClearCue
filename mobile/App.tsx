import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  CatalogMedication,
  MEDICATION_FILTERS,
  MedicationFilter,
  searchMedications,
} from "./data/medications";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  AppState,
  Image,
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
  pharmacy?: string;
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
type AdherenceStatus = "taken" | "late" | "missed";
type DoseLog = {
  doseId: string;
  date: string;
  status: AdherenceStatus;
  completedAt?: string;
};
type AppSettings = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  hideNotificationDetails: boolean;
  language: "en" | "es";
};
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
  reduceMotion: false,
  hideNotificationDetails: true,
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
  supplyHelp: { color: "#6F625B", fontSize: 12, lineHeight: 17, marginTop: -6 },
  supplyRow: { flexDirection: "row", gap: 10 },
  supplyHalf: { flex: 1 },
  supplyFootnote: {
    color: "#6F625B",
    fontSize: 11,
    lineHeight: 16,
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
  timePickerValue: { color: "#3A302B", fontSize: 16, fontWeight: "700" },
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
  timeOptionText: { color: "#6F625B", fontSize: 12, fontWeight: "800" },
  timeOptionTextSelected: { color: "#B85C4A" },
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
  addTimeText: { color: "#B85C4A", fontSize: 13, fontWeight: "800" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: -13 },
  filterChip: {
    borderWidth: 1,
    borderColor: "#E7DDD4",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterChipSelected: { borderColor: "#B85C4A", backgroundColor: "#F5E5D8" },
  filterChipText: { color: "#6F625B", fontSize: 11, fontWeight: "800" },
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

async function scheduleReminders(
  doses: Dose[],
  hideNotificationDetails: boolean,
) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const validDoses = doses
    .map((dose) => ({ dose, clock: parseReminderTime(dose.time) }))
    .filter(
      (item): item is { dose: Dose; clock: { hour: number; minute: number } } =>
        item.clock !== null,
    );
  await Promise.all(
    validDoses.map(({ dose, clock }) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: "ClearCue reminder",
          body: hideNotificationDetails
            ? "A scheduled eye-drop reminder is due."
            : `${dose.name} · ${dose.eye}`,
          sound: "default",
          categoryIdentifier: DOSE_REMINDER_CATEGORY,
          data: { doseId: dose.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: clock.hour,
          minute: clock.minute,
        },
      }),
    ),
  );
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
  await Promise.all(
    refillDates.map(({ dose, estimate }) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: "ClearCue refill estimate",
          body: hideNotificationDetails
            ? "A medication supply estimate needs your attention."
            : `${dose.name} may be running low. Confirm your refill with your pharmacy or clinician.`,
          sound: "default",
          data: { doseId: dose.id, kind: "refill-estimate" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: estimate.warningDate,
        },
      }),
    ),
  );
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
  const [color, setColor] = useState(COLORS[0]);
  const [taperPlan, setTaperPlan] = useState("");
  const [prescriber, setPrescriber] = useState("");
  const [pharmacy, setPharmacy] = useState("");
  const [rxNumber, setRxNumber] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [bottleMl, setBottleMl] = useState("");
  const [dropsPerApplication, setDropsPerApplication] = useState("1");
  const [applicationsPerDay, setApplicationsPerDay] = useState("1");
  const [openedOn, setOpenedOn] = useState(dateKey(new Date()));
  const [warningDays, setWarningDays] = useState("7");
  const [selectedMedication, setSelectedMedication] =
    useState<CatalogMedication | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const personalSnapshot = useRef<{
    doses: Dose[];
    history: DoseLog[];
    trackingStart: string;
  } | null>(null);
  const personalReminders = useRef(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [history, setHistory] = useState<DoseLog[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const homeScrollRef = useRef<ScrollView>(null);
  const insightsY = useRef(0);
  const [trackingStart, setTrackingStart] = useState(dateKey(new Date()));
  const [reportOpen, setReportOpen] = useState(false);
  const [routineReviewOpen, setRoutineReviewOpen] = useState(false);
  const [routineConfirmed, setRoutineConfirmed] = useState(false);
  const [careToolsOpen, setCareToolsOpen] = useState(false);
  const [historyDoseId, setHistoryDoseId] = useState<string | null>(null);
  const [reportDays, setReportDays] = useState<7 | 30>(7);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [launching, setLaunching] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const sawEmptyRoutine = useRef(false);
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
        if (savedSettings)
          setSettings({
            ...DEFAULT_SETTINGS,
            ...(JSON.parse(savedSettings) as AppSettings),
          });
        else if (await AccessibilityInfo.isReduceMotionEnabled())
          setSettings((current) => ({ ...current, reduceMotion: true }));
        await AsyncStorage.multiRemove([
          "clearcue-contact-lens-v1",
          "clearcue-glasses-v1",
        ]);
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
          "Could not restore saved routine",
          "ClearCue will continue with the current routine.",
        );
      } finally {
        setHydrated(true);
      }
    }
    restoreRoutine();
  }, []);
  useEffect(() => {
    if (hydrated && !demoMode)
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(doses));
  }, [doses, hydrated, demoMode]);
  useEffect(() => {
    if (!hydrated || demoMode) return;
    if (doses.length === 0 && !sawEmptyRoutine.current) {
      sawEmptyRoutine.current = true;
      setOnboardingStep(0);
      setOnboardingVisible(true);
    }
    if (doses.length > 0) sawEmptyRoutine.current = false;
  }, [doses.length, hydrated, demoMode]);
  useEffect(() => {
    if (hydrated && !demoMode)
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history, hydrated, demoMode]);
  useEffect(() => {
    if (hydrated && !demoMode)
      AsyncStorage.setItem(TRACKING_START_KEY, trackingStart);
  }, [trackingStart, hydrated, demoMode]);
  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);
  useEffect(() => {
    if (hydrated && remindersEnabled && !demoMode)
      void scheduleReminders(doses, settings.hideNotificationDetails);
  }, [
    doses,
    hydrated,
    remindersEnabled,
    settings.hideNotificationDetails,
    demoMode,
  ]);
  useEffect(() => {
    function refreshDailyCompletion() {
      const today = dateKey(new Date());
      setDoses((current) =>
        current.map((dose) => ({
          ...dose,
          completed: history.some(
            (log) => log.doseId === dose.id && log.date === today,
          ),
        })),
      );
    }
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refreshDailyCompletion();
      },
    );
    const timer = setInterval(refreshDailyCompletion, 60_000);
    return () => {
      appStateSubscription.remove();
      clearInterval(timer);
    };
  }, [history]);
  useEffect(() => {
    void Notifications.setNotificationCategoryAsync(DOSE_REMINDER_CATEGORY, [
      {
        identifier: "TAKEN",
        buttonTitle: "Taken",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "SNOOZE",
        buttonTitle: "Snooze 10 min",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "SKIP",
        buttonTitle: "Skip",
        options: { opensAppToForeground: false },
      },
    ]);
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const doseId = response.notification.request.content.data?.doseId;
        if (typeof doseId !== "string" || demoMode) return;
        if (response.actionIdentifier === "TAKEN") recordDose(doseId, "taken");
        if (response.actionIdentifier === "SKIP") recordDose(doseId, "missed");
        if (response.actionIdentifier === "SNOOZE")
          void Notifications.scheduleNotificationAsync({
            content: {
              title: "ClearCue reminder",
              body: settings.hideNotificationDetails
                ? "A scheduled eye-drop reminder is due."
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
      },
    );
    return () => subscription.remove();
  }, [demoMode, settings.hideNotificationDetails]);
  const complete = doses.filter((dose) => dose.completed).length;
  const percentage = doses.length
    ? Math.round((complete / doses.length) * 100)
    : 0;
  const progress = useMemo(
    () => `${complete} of ${doses.length} completed`,
    [complete, doses.length],
  );
  const adherence = useMemo(
    () => buildAdherence(doses, history, trackingStart),
    [doses, history, trackingStart],
  );
  const reportData = useMemo(
    () => buildAdherence(doses, history, trackingStart, reportDays),
    [doses, history, trackingStart, reportDays],
  );
  const historyDose = doses.find((dose) => dose.id === historyDoseId) ?? null;
  const copy = COPY[settings.language];
  const scaleText = settings.largeText ? styles.largeText : undefined;
  const scaleHeading = settings.largeText
    ? { fontSize: 40, lineHeight: 46 }
    : undefined;
  const scaleSectionTitle = settings.largeText
    ? { fontSize: 26, lineHeight: 32 }
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
        item.id === id ? { ...item, completed: status !== "missed" } : item,
      ),
    );
    setHistory((current) => [
      ...current.filter((log) => !(log.doseId === id && log.date === today)),
      {
        doseId: id,
        date: today,
        status,
        completedAt: status === "missed" ? undefined : new Date().toISOString(),
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
    if (!name.trim()) {
      Alert.alert(
        "Add a medication name",
        "For example, Artificial Tears or Prednisolone Acetate.",
      );
      return;
    }
    const allTimes = [time, ...additionalTimes];
    if (allTimes.some((item) => !parseReminderTime(item))) {
      Alert.alert(
        "Use a time like 8:00 AM",
        "ClearCue needs a valid time for every daily reminder.",
      );
      return;
    }
    if (
      new Set(allTimes.map((item) => item.trim().toUpperCase())).size !==
      allTimes.length
    ) {
      Alert.alert(
        "Choose different times",
        "Each daily reminder for this medication needs its own time.",
      );
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
      Alert.alert(
        "Check the supply estimate",
        "Enter a positive numeric bottle size and drops per use, whole-number uses and warning days, and a real date like 2026-09-05—or leave bottle size blank to skip the estimate.",
      );
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
      Alert.alert(
        "These drops are very close together",
        `${closeDose.name} is scheduled at ${closeDose.time}. Confirm the spacing in the clinician’s instructions before saving.`,
        [
          { text: "Go back", style: "cancel" },
          { text: "Review routine", onPress: openRoutineReview },
        ],
      );
      return;
    }
    openRoutineReview();
  }
  function openRoutineReview() {
    setRoutineConfirmed(false);
    setRoutineReviewOpen(true);
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
      pharmacy.trim() ||
      rxNumber.trim() ||
      personalNotes.trim()
        ? {
            prescriber: prescriber.trim() || undefined,
            pharmacy: pharmacy.trim() || undefined,
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
    setColor(COLORS[0]);
    setTaperPlan("");
    setPrescriber("");
    setPharmacy("");
    setRxNumber("");
    setPersonalNotes("");
    setBottleMl("");
    setDropsPerApplication("1");
    setApplicationsPerDay("1");
    setOpenedOn(dateKey(new Date()));
    setWarningDays("7");
    setSelectedMedication(null);
    setEditingDoseId(null);
    setModalOpen(false);
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
    setPharmacy(dose.prescription?.pharmacy ?? "");
    setRxNumber(dose.prescription?.rxNumber ?? "");
    setPersonalNotes(dose.prescription?.notes ?? "");
    setBottleMl(dose.supply ? String(dose.supply.bottleMl) : "");
    setDropsPerApplication(String(dose.supply?.dropsPerApplication ?? 1));
    setApplicationsPerDay(String(dose.supply?.applicationsPerDay ?? 1));
    setOpenedOn(dose.supply?.openedOn ?? dateKey(new Date()));
    setWarningDays(String(dose.supply?.warningDays ?? 7));
    setSelectedMedication(null);
    setModalOpen(true);
  }
  function startAddingDose() {
    setEditingDoseId(null);
    setName("");
    setTime("9:00 AM");
    setAdditionalTimes([]);
    setEye("Right eye");
    setColor(COLORS[0]);
    setTaperPlan("");
    setPrescriber("");
    setPharmacy("");
    setRxNumber("");
    setPersonalNotes("");
    setBottleMl("");
    setDropsPerApplication("1");
    setApplicationsPerDay("1");
    setOpenedOn(dateKey(new Date()));
    setWarningDays("7");
    setSelectedMedication(null);
    setModalOpen(true);
  }
  function deleteEditingDose() {
    if (!editingDoseId) return;
    const dose = doses.find((item) => item.id === editingDoseId);
    const groupId = dose?.scheduleGroupId ?? editingDoseId;
    Alert.alert(
      "Remove this eye drop?",
      `${dose?.name ?? "This medication"} and all of its daily reminder times will be removed from the routine.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const ids = doses
              .filter((item) => (item.scheduleGroupId ?? item.id) === groupId)
              .map((item) => item.id);
            setDoses((current) =>
              current.filter((item) => !ids.includes(item.id)),
            );
            setHistory((current) =>
              current.filter((log) => !ids.includes(log.doseId)),
            );
            setEditingDoseId(null);
            setSelectedMedication(null);
            setModalOpen(false);
          },
        },
      ],
    );
  }
  async function enableReminders() {
    if (demoMode) {
      Alert.alert(
        "Demo notifications stay off",
        "Demo Mode never schedules real notifications. Turn off Demo Mode to use reminders for your own routine.",
      );
      return;
    }
    let permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted)
      permissions = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      });
    if (!permissions.granted) {
      Alert.alert(
        "Notifications are off",
        "To receive reminders, allow notifications for Expo Go in your iPhone Settings.",
      );
      return;
    }
    const scheduled = await scheduleReminders(
      doses,
      settings.hideNotificationDetails,
    );
    setRemindersEnabled(true);
    Alert.alert(
      "Daily reminders are on",
      `${scheduled} reminder${scheduled === 1 ? "" : "s"} will appear at the scheduled times.`,
    );
  }
  async function toggleDemoMode(enabled: boolean) {
    if (enabled) {
      personalSnapshot.current = { doses, history, trackingStart };
      personalReminders.current = remindersEnabled;
      const demo = buildDemoRoutine();
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.setItem(DEMO_MODE_KEY, "active");
      setDoses(demo.doses);
      setHistory(demo.history);
      setTrackingStart(demo.trackingStart);
      setRemindersEnabled(false);
      setDemoMode(true);
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
    await AsyncStorage.removeItem(DEMO_MODE_KEY);
    setRemindersEnabled(personalReminders.current);
    personalSnapshot.current = null;
  }
  function resetDemoMode() {
    if (!demoMode) return;
    const demo = buildDemoRoutine();
    setDoses(demo.doses);
    setHistory(demo.history);
    setTrackingStart(demo.trackingStart);
  }
  function openInsights() {
    setShowInsights(true);
  }
  return (
    <>
      <SafeAreaView
        style={[
          styles.safeArea,
          settings.highContrast && styles.highContrastRoot,
        ]}
      >
        <StatusBar style={settings.highContrast ? "light" : "dark"} />
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
                accessibilityLabel="How to use eye drops guide"
                accessibilityHint="Opens a clinician-safe step-by-step guide"
                onPress={() => setGuideOpen(true)}
                style={styles.help}
              >
                <Text style={styles.helpText}>?</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.date, scaleText]}>{copy.today}</Text>
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
            ]}
          >
            <View>
              <Text style={styles.cardLabel}>{copy.routine}</Text>
              <Text style={[styles.progressText, scaleText]}>{progress}</Text>
            </View>
            <View style={styles.progressCircle}>
              <View style={styles.progressInner}>
                <Text style={styles.progressNumber}>{percentage}%</Text>
              </View>
            </View>
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
            />
          </View>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>{copy.next}</Text>
              <Text style={[styles.sectionTitle, scaleSectionTitle]}>
                {copy.schedule}
              </Text>
            </View>
          </View>
          <View style={styles.list}>
            {doses.length ? (
              doses.map((dose) => (
                <DoseCard
                  key={dose.id}
                  dose={dose}
                  language={settings.language}
                  largeText={settings.largeText}
                  onToggle={() => toggleDose(dose.id)}
                  onEdit={() => editDose(dose)}
                  onHistory={() => setHistoryDoseId(dose.id)}
                />
              ))
            ) : (
              <EmptyRoutine
                onAdd={startAddingDose}
                onGuide={() => setGuideOpen(true)}
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
              />
            </View>
          )}
          <View
            style={[
              styles.reminderCard,
              settings.highContrast && styles.highContrastSoftCard,
            ]}
          >
            <View style={styles.reminderCopy}>
              <Text style={[styles.reminderTitle, scaleText]}>
                {copy.reminders}
              </Text>
              <Text style={[styles.reminderText, scaleText]}>
                {remindersEnabled
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
              accessibilityLabel={remindersEnabled ? copy.synced : copy.enable}
              onPress={() => void enableReminders()}
              style={[
                styles.reminderButton,
                remindersEnabled && styles.reminderButtonOn,
              ]}
            >
              <Text style={styles.reminderButtonText}>
                {remindersEnabled ? copy.synced : copy.enable}
              </Text>
            </Pressable>
          </View>
          <View
            style={[
              styles.tip,
              settings.highContrast && styles.highContrastSoftCard,
            ]}
          >
            <Text style={styles.tipIcon}>i</Text>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, scaleText]}>{copy.spacing}</Text>
              <Text style={[styles.tipText, scaleText]}>
                {copy.spacingDetail}
              </Text>
            </View>
          </View>
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          style={styles.addButton}
          onPress={startAddingDose}
          accessibilityLabel={copy.add}
          accessibilityHint="Opens a form to add an eye-drop reminder"
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
          pharmacy={pharmacy}
          rxNumber={rxNumber}
          personalNotes={personalNotes}
          bottleMl={bottleMl}
          dropsPerApplication={dropsPerApplication}
          applicationsPerDay={applicationsPerDay}
          openedOn={openedOn}
          warningDays={warningDays}
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
          onPharmacy={setPharmacy}
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
          onSave={saveDose}
          onDelete={deleteEditingDose}
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
        confirmed={routineConfirmed}
        onConfirmed={setRoutineConfirmed}
        onBack={() => setRoutineReviewOpen(false)}
        onSave={() => {
          setRoutineReviewOpen(false);
          persistDose();
        }}
      />
      <CareToolsModal
        visible={careToolsOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        language={settings.language}
        onInsights={() => {
          setCareToolsOpen(false);
          openInsights();
        }}
        onPrivacy={() => {
          setCareToolsOpen(false);
          setPrivacyOpen(true);
        }}
        onSettings={() => {
          setCareToolsOpen(false);
          setSettingsOpen(true);
        }}
        onClose={() => setCareToolsOpen(false)}
      />
      {launching && (
        <Animated.View
          pointerEvents="none"
          accessible
          accessibilityLabel="ClearCue is loading"
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
        days={reportDays}
        data={reportData}
        onDays={setReportDays}
        onClose={() => setReportOpen(false)}
      />
      <DoseHistoryModal
        visible={historyDose !== null}
        animation={settings.reduceMotion ? "none" : "slide"}
        dose={historyDose}
        history={history}
        trackingStart={trackingStart}
        onClose={() => setHistoryDoseId(null)}
      />
      <PrivacyModal
        visible={privacyOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        hideNotificationDetails={settings.hideNotificationDetails}
        onHideNotificationDetails={(value) =>
          setSettings((current) => ({
            ...current,
            hideNotificationDetails: value,
          }))
        }
        onErase={() => {
          Alert.alert(
            "Erase routine data?",
            "This permanently removes medications, private prescription details, and adherence history from this device. Accessibility settings will stay.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Erase data",
                style: "destructive",
                onPress: () => {
                  void AsyncStorage.multiRemove([
                    STORAGE_KEY,
                    HISTORY_KEY,
                    TRACKING_START_KEY,
                  ]);
                  void Notifications.cancelAllScheduledNotificationsAsync();
                  setDoses([]);
                  setHistory([]);
                  setTrackingStart(dateKey(new Date()));
                  setRemindersEnabled(false);
                  setPrivacyOpen(false);
                },
              },
            ],
          );
        }}
        onClose={() => setPrivacyOpen(false)}
      />
      <SettingsModal
        visible={settingsOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        settings={settings}
        onChange={setSettings}
        onShowOnboarding={() => {
          setSettingsOpen(false);
          setOnboardingStep(0);
          setOnboardingVisible(true);
        }}
        demoMode={demoMode}
        onDemoMode={(enabled) => void toggleDemoMode(enabled)}
        onResetDemo={resetDemoMode}
        onClose={() => setSettingsOpen(false)}
      />
      <DropGuideModal
        visible={guideOpen}
        animation={settings.reduceMotion ? "none" : "slide"}
        onClose={() => setGuideOpen(false)}
      />
      <OnboardingModal
        visible={onboardingVisible}
        animation={settings.reduceMotion ? "none" : "slide"}
        step={onboardingStep}
        onNext={() => setOnboardingStep((current) => Math.min(current + 1, 2))}
        onComplete={() => {
          setOnboardingVisible(false);
          setOnboardingStep(0);
          void AsyncStorage.setItem(ONBOARDING_KEY, "complete");
        }}
      />
    </>
  );
}
function EmptyRoutine({
  onAdd,
  onGuide,
}: {
  onAdd: () => void;
  onGuide: () => void;
}) {
  return (
    <View
      accessible
      accessibilityLabel="Your routine is empty. Add your first eye drop to begin."
      style={extraStyles.emptyRoutine}
    >
      <View style={extraStyles.emptyIcon}>
        <Text style={extraStyles.emptyIconText}>◒</Text>
      </View>
      <Text style={extraStyles.emptyTitle}>Start your routine</Text>
      <Text style={extraStyles.emptyText}>
        Add an eye drop to create reminders, track progress, and build a
        shareable report.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add your first eye drop"
        onPress={onAdd}
        style={styles.saveButton}
      >
        <Text style={styles.saveText}>Add first eye drop</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open how to use eye drops guide"
        onPress={onGuide}
        style={extraStyles.emptyGuide}
      >
        <Text style={extraStyles.cardLink}>How to use eye drops</Text>
      </Pressable>
    </View>
  );
}
function CareToolsModal({
  visible,
  animation,
  language,
  onInsights,
  onPrivacy,
  onSettings,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  language: "en" | "es";
  onInsights: () => void;
  onPrivacy: () => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  const spanish = language === "es";
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
            <Text style={styles.sectionLabel}>
              {spanish ? "HERRAMIENTAS ADICIONALES" : "ADDITIONAL TOOLS"}
            </Text>
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
          <View style={styles.note}>
            <Text style={styles.noteTitle}>
              {spanish ? "Tu rutina es lo primero" : "Your routine comes first"}
            </Text>
            <Text style={styles.noteText}>
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
            />
            <HomeAction
              label={spanish ? "Privacidad y datos" : "Privacy & data"}
              detail={
                spanish
                  ? "Controla tus datos locales y notificaciones."
                  : "Control local data and notifications."
              }
              onPress={onPrivacy}
            />
            <HomeAction
              label={spanish ? "Accesibilidad" : "Accessibility"}
              detail={
                spanish
                  ? "Ajusta texto, contraste, idioma y demostración."
                  : "Adjust text, contrast, language, and demo mode."
              }
              onPress={onSettings}
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
}: {
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={detail}
      onPress={onPress}
      style={extraStyles.homeAction}
    >
      <View style={{ flex: 1 }}>
        <Text style={extraStyles.homeActionLabel}>{label}</Text>
        <Text style={extraStyles.homeActionDetail}>{detail}</Text>
      </View>
      <Text style={extraStyles.homeActionArrow}>›</Text>
    </Pressable>
  );
}
function DoseCard({
  dose,
  language,
  largeText,
  onToggle,
  onEdit,
  onHistory,
}: {
  dose: Dose;
  language: "en" | "es";
  largeText: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const colorName =
    COLOR_NAMES[dose.color]?.[language] ??
    (language === "es" ? "Personalizado" : "Custom");
  const status = dose.completed
    ? language === "es"
      ? "Completado"
      : "Completed"
    : language === "es"
      ? "Pendiente"
      : "Due today";
  const estimate = supplyEstimate(dose.supply);
  const estimateText = estimate
    ? estimate.isWarning
      ? `Refill estimate: about ${estimate.days} day${estimate.days === 1 ? "" : "s"} left`
      : `Supply estimate: about ${estimate.days} day${estimate.days === 1 ? "" : "s"} left`
    : null;
  return (
    <View
      accessible
      accessibilityLabel={`${dose.name}, ${dose.eye}, ${colorName} label, scheduled ${dose.time}, ${status}${estimateText ? `, ${estimateText}` : ""}`}
      style={[
        extraStyles.medicationCard,
        dose.completed && extraStyles.completedMedicationCard,
      ]}
    >
      <View
        style={[extraStyles.medicationStripe, { backgroundColor: dose.color }]}
      />
      <View style={extraStyles.medicationBody}>
        <View style={extraStyles.medicationTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.doseName, largeText && styles.largeText]}>
              {dose.name}
            </Text>
            <Text style={[styles.doseDetails, largeText && styles.largeText]}>
              {dose.eye} · {colorName} label
            </Text>
          </View>
          <View style={extraStyles.timeBlock}>
            <Text style={[styles.time, largeText && styles.largeText]}>
              {dose.time}
            </Text>
            <Text
              style={[
                extraStyles.statusBadge,
                dose.completed
                  ? extraStyles.statusComplete
                  : extraStyles.statusDue,
              ]}
            >
              {status}
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
        <View style={extraStyles.medicationFooter}>
          <View style={extraStyles.cardLinks}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${dose.name} dose history`}
              onPress={onHistory}
            >
              <Text style={extraStyles.cardLink}>History</Text>
            </Pressable>
            <Text style={extraStyles.cardLinkDivider}>·</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${dose.name}`}
              onPress={onEdit}
            >
              <Text style={extraStyles.cardLink}>Edit</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${dose.completed ? "Mark incomplete" : "Mark as taken"}: ${dose.name}`}
            accessibilityHint="Records this dose in adherence history"
            onPress={onToggle}
            style={[styles.doneButton, dose.completed && styles.checkedButton]}
          >
            <Text style={styles.doneText}>
              {dose.completed ? "✓ Taken" : "Mark taken"}
            </Text>
          </Pressable>
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
      label: current.toLocaleDateString("en-US", { weekday: "narrow" }),
      statuses,
    });
  }
  const statuses = days.flatMap((day) => day.statuses);
  const taken = statuses.filter((status) => status === "taken").length;
  const late = statuses.filter((status) => status === "late").length;
  const missed = statuses.filter((status) => status === "missed").length;
  const expected = statuses.length;
  let streak = 0;
  for (const day of [...days].reverse()) {
    if (
      day.statuses.length === doses.length &&
      day.statuses.every((status) => status !== "missed")
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
      (status) => status !== "missed",
    ).length;
    return {
      name: dose.name,
      color: dose.color,
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
  const insight = !expected
    ? "Complete a few doses to unlock your first adherence insight."
    : !missed
      ? "Excellent consistency—no missed doses in the tracked period."
      : highest && otherRate > 0
        ? `You miss ${highest.period} doses ${(highest.rate / otherRate).toFixed(1)}× more often than other times.`
        : `Most missed doses are in the ${highest?.period ?? "tracked"} period.`;
  return { days, expected, taken, late, missed, streak, byMedication, insight };
}
function AdherencePanel({
  data,
  onGenerateReport,
}: {
  data: AdherenceData;
  onGenerateReport: () => void;
}) {
  const overall = data.expected
    ? Math.round(((data.taken + data.late) / data.expected) * 100)
    : 0;
  const onTime = data.expected
    ? Math.round((data.taken / data.expected) * 100)
    : 0;
  return (
    <View style={styles.insightsPanel}>
      <Text style={styles.sectionLabel}>LAST 7 DAYS</Text>
      <Text style={styles.insightsTitle}>Self-reported routine record</Text>
      <Text style={styles.settingsIntro}>Based only on doses you mark in ClearCue. It does not verify administration or treatment effectiveness.</Text>
      <View style={styles.metricRow}>
        <Metric value={`${overall}%`} label="Recorded" />
        <Metric value={`${onTime}%`} label="Marked on time" />
        <Metric value={String(data.streak)} label="Recorded-day streak" />
      </View>
      <Text style={styles.chartLabel}>Self-reported dose record</Text>
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
        <Legend color="#557A66" label="Marked on time" />
        <Legend color="#B9823E" label="Late" />
        <Legend color="#B85C4A" label="Missed" />
      </View>
      <View style={styles.insightBox}>
        <Text style={styles.insightEyebrow}>PATTERN DETECTED</Text>
        <Text style={styles.insightText}>{data.insight}</Text>
      </View>
      <Text style={styles.chartLabel}>By medication</Text>
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
              {medication.taken} of {medication.expected} doses taken
            </Text>
          </View>
        </View>
      ))}
      <Pressable onPress={onGenerateReport} style={styles.reportButton}>
        <Text style={styles.reportButtonText}>Generate self-reported summary</Text>
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
  days,
  data,
  onDays,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  days: 7 | 30;
  data: AdherenceData;
  onDays: (days: 7 | 30) => void;
  onClose: () => void;
}) {
  const overall = data.expected
    ? Math.round(((data.taken + data.late) / data.expected) * 100)
    : 0;
  const onTime = data.expected
    ? Math.round((data.taken / data.expected) * 100)
    : 0;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const range = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  async function shareReport() {
    await Share.share({
      message: `ClearCue self-reported routine summary\nPeriod: ${range}\nRecorded doses: ${overall}%\nMarked on time: ${onTime}%\nMissed doses: ${data.missed}\nLate doses: ${data.late}\nPattern: ${data.insight}\n\nThis summary reflects doses the user marked in ClearCue. It does not verify administration, treatment effectiveness, or clinical adherence.`,
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
            <Text style={styles.sectionLabel}>PATIENT SUMMARY</Text>
            <Text style={styles.modalTitle}>Shareable report</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close shareable report"
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
                accessibilityLabel={`Show last ${period} days`}
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
                  Last {period} days
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.reportCard}>
            <Text style={styles.reportBrand}>CLEARCUE SELF-REPORTED SUMMARY</Text>
            <Text style={styles.reportRange}>{range}</Text>
            <View style={styles.reportMetricGrid}>
              <ReportMetric value={`${overall}%`} label="Recorded doses" />
              <ReportMetric value={`${onTime}%`} label="Marked on time" />
              <ReportMetric value={String(data.missed)} label="Missed doses" />
              <ReportMetric value={String(data.late)} label="Late doses" />
            </View>
            <Text style={styles.reportHeading}>Recorded medication activity</Text>
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
              <Text style={styles.insightEyebrow}>MOST MISSED PATTERN</Text>
              <Text style={styles.insightText}>{data.insight}</Text>
            </View>
            <Text style={styles.reportDisclaimer}>
              This reflects doses the user marked in ClearCue. It does not prove
              administration, treatment effectiveness, or clinical adherence.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share read-only report"
            onPress={() => void shareReport()}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>Share read-only report</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function DoseHistoryModal({
  visible,
  animation,
  dose,
  history,
  trackingStart,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  dose: Dose | null;
  history: DoseLog[];
  trackingStart: string;
  onClose: () => void;
}) {
  if (!dose) return null;
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
      label: day.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      status,
      recordedAt: log?.completedAt
        ? new Date(log.completedAt).toLocaleTimeString("en-US", {
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
      ? "On time"
      : status === "late"
        ? "Late"
        : status === "missed"
          ? "Missed"
          : status === "upcoming"
            ? "Upcoming"
            : "Not tracked";
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
            <Text style={styles.sectionLabel}>LAST 14 DAYS</Text>
            <Text style={styles.modalTitle}>{dose.name} history</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close dose history"
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Recorded activity</Text>
            <Text style={styles.noteText}>
              This history reflects doses marked in ClearCue. A “missed” entry
              can also mean the dose was not recorded.
            </Text>
          </View>
          {entries.map((entry) => (
            <View
              key={entry.date}
              accessible
              accessibilityLabel={`${entry.label}: ${statusLabel(entry.status)}${entry.recordedAt ? `, recorded ${entry.recordedAt}` : ""}`}
              style={extraStyles.historyRow}
            >
              <View>
                <Text style={extraStyles.historyDate}>{entry.label}</Text>
                <Text style={extraStyles.historyTime}>
                  {entry.recordedAt
                    ? `Recorded ${entry.recordedAt}`
                    : entry.status === "upcoming"
                      ? `Scheduled ${dose.time}`
                      : "No recorded dose"}
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
/* Contact-lens and glasses prescription records were intentionally removed to keep ClearCue focused on eye-drop routines.
function ContactLensModal({
  visible,
  animation,
  prescription,
  onSave,
  onClear,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  prescription: ContactLensPrescription | null;
  onSave: (prescription: ContactLensPrescription) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ContactLensPrescription>({
    ...EMPTY_CONTACT_LENS,
  });
  useEffect(() => {
    if (visible) setForm({ ...EMPTY_CONTACT_LENS, ...(prescription ?? {}) });
  }, [visible, prescription]);
  const update = (key: keyof ContactLensPrescription, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const EyeFields = ({ eye }: { eye: "right" | "left" }) => {
    const label = eye === "right" ? "Right eye (OD)" : "Left eye (OS)";
    const field = (name: "Sphere" | "Cylinder" | "Axis" | "Add") =>
      `${eye}${name}` as keyof ContactLensPrescription;
    return (
      <View style={extraStyles.lensEye}>
        <Text style={extraStyles.lensEyeTitle}>{label}</Text>
        <View style={extraStyles.supplyRow}>
          <View style={extraStyles.supplyHalf}>
            <Field label="Sphere">
              <TextInput
                accessibilityLabel={`${label} sphere`}
                value={form[field("Sphere")]}
                onChangeText={(value) => update(field("Sphere"), value)}
                placeholder="e.g. -2.50"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
          </View>
          <View style={extraStyles.supplyHalf}>
            <Field label="Cylinder">
              <TextInput
                accessibilityLabel={`${label} cylinder`}
                value={form[field("Cylinder")]}
                onChangeText={(value) => update(field("Cylinder"), value)}
                placeholder="Optional"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
          </View>
        </View>
        <View style={extraStyles.supplyRow}>
          <View style={extraStyles.supplyHalf}>
            <Field label="Axis">
              <TextInput
                accessibilityLabel={`${label} axis`}
                value={form[field("Axis")]}
                onChangeText={(value) => update(field("Axis"), value)}
                placeholder="Optional"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
          </View>
          <View style={extraStyles.supplyHalf}>
            <Field label="Add">
              <TextInput
                accessibilityLabel={`${label} add power`}
                value={form[field("Add")]}
                onChangeText={(value) => update(field("Add"), value)}
                placeholder="Optional"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
          </View>
        </View>
      </View>
    );
  };
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
            <Text style={styles.sectionLabel}>PERSONAL REFERENCE</Text>
            <Text style={styles.modalTitle}>Contact lenses</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close contact lens prescription"
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.note}>
            <Text style={styles.noteTitle}>
              Use your current clinician prescription
            </Text>
            <Text style={styles.noteText}>
              This private record is for reference only. Only your eye-care
              clinician can prescribe or change contact lenses.
            </Text>
          </View>
          <Field label="Lens brand or type">
            <TextInput
              accessibilityLabel="Lens brand or type"
              value={form.brand}
              onChangeText={(value) => update("brand", value)}
              placeholder="e.g. Acuvue Oasys 1-Day"
              placeholderTextColor="#81969A"
              style={styles.input}
            />
          </Field>
          <View style={extraStyles.supplyRow}>
            <View style={extraStyles.supplyHalf}>
              <Field label="Replacement">
                <View style={styles.choiceRow}>
                  {(["Daily", "Biweekly", "Monthly"] as const).map((item) => (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{
                        selected: form.replacement === item,
                      }}
                      accessibilityLabel={`${item} replacement`}
                      key={item}
                      onPress={() => update("replacement", item)}
                      style={[
                        styles.choice,
                        form.replacement === item && styles.choiceSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          form.replacement === item &&
                            styles.choiceTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
            </View>
          </View>
          <EyeFields eye="right" />
          <EyeFields eye="left" />
          <View style={extraStyles.supplyRow}>
            <View style={extraStyles.supplyHalf}>
              <Field label="Base curve (BC)">
                <TextInput
                  accessibilityLabel="Base curve"
                  value={form.baseCurve}
                  onChangeText={(value) => update("baseCurve", value)}
                  placeholder="Optional"
                  placeholderTextColor="#81969A"
                  style={styles.input}
                />
              </Field>
            </View>
            <View style={extraStyles.supplyHalf}>
              <Field label="Diameter (DIA)">
                <TextInput
                  accessibilityLabel="Diameter"
                  value={form.diameter}
                  onChangeText={(value) => update("diameter", value)}
                  placeholder="Optional"
                  placeholderTextColor="#81969A"
                  style={styles.input}
                />
              </Field>
            </View>
          </View>
          <Field label="Eye-care clinician">
            <TextInput
              accessibilityLabel="Eye-care clinician"
              value={form.prescriber}
              onChangeText={(value) => update("prescriber", value)}
              placeholder="Optional"
              placeholderTextColor="#81969A"
              style={styles.input}
            />
          </Field>
          <Field label="Prescription expiration (YYYY-MM-DD)">
            <TextInput
              accessibilityLabel="Contact lens prescription expiration date"
              value={form.expiration}
              onChangeText={(value) => update("expiration", value)}
              placeholder="Optional"
              placeholderTextColor="#81969A"
              style={styles.input}
            />
          </Field>
          <View style={extraStyles.detailsSection}>
            <Text style={styles.fieldLabel}>
              Replacement planning (optional)
            </Text>
            <Text style={extraStyles.supplyHelp}>
              A simple personal reminder—not an order, inventory count, or
              clinical recommendation.
            </Text>
            <View style={extraStyles.supplyRow}>
              <View style={extraStyles.supplyHalf}>
                <Field label="Pairs remaining">
                  <TextInput
                    accessibilityLabel="Contact lens pairs remaining"
                    value={form.pairsRemaining}
                    onChangeText={(value) => update("pairsRemaining", value)}
                    keyboardType="number-pad"
                    placeholder="Optional"
                    placeholderTextColor="#81969A"
                    style={styles.input}
                  />
                </Field>
              </View>
              <View style={extraStyles.supplyHalf}>
                <Field label="Remind me at">
                  <TextInput
                    accessibilityLabel="Contact lens reorder reminder quantity"
                    value={form.reorderAt}
                    onChangeText={(value) => update("reorderAt", value)}
                    keyboardType="number-pad"
                    placeholder="e.g. 3"
                    placeholderTextColor="#81969A"
                    style={styles.input}
                  />
                </Field>
              </View>
            </View>
            <Field label="Personal note">
              <TextInput
                accessibilityLabel="Contact lens personal note"
                value={form.notes}
                onChangeText={(value) => update("notes", value)}
                placeholder="Optional"
                placeholderTextColor="#81969A"
                multiline
                style={[
                  styles.input,
                  { height: 76, paddingTop: 12, textAlignVertical: "top" },
                ]}
              />
            </Field>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save contact lens prescription"
            onPress={() => onSave(form)}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>Save contact lens details</Text>
          </Pressable>
          {prescription && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear saved contact lens prescription"
              onPress={() =>
                Alert.alert(
                  "Clear contact lens details?",
                  "This removes the saved contact lens information from this device.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear details",
                      style: "destructive",
                      onPress: onClear,
                    },
                  ],
                )
              }
              style={extraStyles.lensClear}
            >
              <Text style={extraStyles.lensClearText}>Clear saved details</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function GlassesModal({
  visible,
  animation,
  prescription,
  onSave,
  onClear,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  prescription: GlassesPrescription | null;
  onSave: (prescription: GlassesPrescription) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<GlassesPrescription>({ ...EMPTY_GLASSES });
  useEffect(() => {
    if (visible) setForm({ ...EMPTY_GLASSES, ...(prescription ?? {}) });
  }, [visible, prescription]);
  const update = (key: keyof GlassesPrescription, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const EyeFields = ({ eye }: { eye: "right" | "left" }) => {
    const label = eye === "right" ? "Right eye (OD)" : "Left eye (OS)";
    const field = (name: "Sphere" | "Cylinder" | "Axis" | "Add") =>
      `${eye}${name}` as keyof GlassesPrescription;
    return (
      <View style={extraStyles.lensEye}>
        <Text style={extraStyles.lensEyeTitle}>{label}</Text>
        <View style={extraStyles.supplyRow}>
          <View style={extraStyles.supplyHalf}>
            <Field label="Sphere">
              <TextInput
                accessibilityLabel={`${label} sphere`}
                value={form[field("Sphere")]}
                onChangeText={(value) => update(field("Sphere"), value)}
                placeholder="e.g. -2.50"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
          </View>
          <View style={extraStyles.supplyHalf}>
            <Field label="Cylinder">
              <TextInput
                accessibilityLabel={`${label} cylinder`}
                value={form[field("Cylinder")]}
                onChangeText={(value) => update(field("Cylinder"), value)}
                placeholder="Optional"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
          </View>
        </View>
        <View style={extraStyles.supplyRow}>
          <View style={extraStyles.supplyHalf}>
            <Field label="Axis">
              <TextInput
                accessibilityLabel={`${label} axis`}
                value={form[field("Axis")]}
                onChangeText={(value) => update(field("Axis"), value)}
                placeholder="Optional"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
          </View>
          <View style={extraStyles.supplyHalf}>
            <Field label="Add">
              <TextInput
                accessibilityLabel={`${label} add power`}
                value={form[field("Add")]}
                onChangeText={(value) => update(field("Add"), value)}
                placeholder="Optional"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
          </View>
        </View>
      </View>
    );
  };
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
            <Text style={styles.sectionLabel}>PERSONAL REFERENCE</Text>
            <Text style={styles.modalTitle}>Glasses prescription</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close glasses prescription"
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.note}>
            <Text style={styles.noteTitle}>
              Use your current clinician prescription
            </Text>
            <Text style={styles.noteText}>
              This private record is for reference only. Only your eye-care
              clinician can prescribe or change a glasses prescription.
            </Text>
          </View>
          <EyeFields eye="right" />
          <EyeFields eye="left" />
          <View style={extraStyles.supplyRow}>
            <View style={extraStyles.supplyHalf}>
              <Field label="Pupillary distance (PD)">
                <TextInput
                  accessibilityLabel="Pupillary distance"
                  value={form.pd}
                  onChangeText={(value) => update("pd", value)}
                  placeholder="Optional, e.g. 63"
                  placeholderTextColor="#81969A"
                  style={styles.input}
                />
              </Field>
            </View>
            <View style={extraStyles.supplyHalf}>
              <Field label="Prism">
                <TextInput
                  accessibilityLabel="Glasses prism"
                  value={form.prism}
                  onChangeText={(value) => update("prism", value)}
                  placeholder="Optional"
                  placeholderTextColor="#81969A"
                  style={styles.input}
                />
              </Field>
            </View>
          </View>
          <Field label="Eye-care clinician">
            <TextInput
              accessibilityLabel="Eye-care clinician"
              value={form.prescriber}
              onChangeText={(value) => update("prescriber", value)}
              placeholder="Optional"
              placeholderTextColor="#81969A"
              style={styles.input}
            />
          </Field>
          <Field label="Prescription expiration (YYYY-MM-DD)">
            <TextInput
              accessibilityLabel="Glasses prescription expiration date"
              value={form.expiration}
              onChangeText={(value) => update("expiration", value)}
              placeholder="Optional"
              placeholderTextColor="#81969A"
              style={styles.input}
            />
          </Field>
          <Field label="Frame or lens notes">
            <TextInput
              accessibilityLabel="Glasses frame or lens notes"
              value={form.frameNotes}
              onChangeText={(value) => update("frameNotes", value)}
              placeholder="Optional, e.g. progressive lenses"
              placeholderTextColor="#81969A"
              style={styles.input}
            />
          </Field>
          <Field label="Personal note">
            <TextInput
              accessibilityLabel="Glasses personal note"
              value={form.notes}
              onChangeText={(value) => update("notes", value)}
              placeholder="Optional"
              placeholderTextColor="#81969A"
              multiline
              style={[
                styles.input,
                { height: 76, paddingTop: 12, textAlignVertical: "top" },
              ]}
            />
          </Field>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save glasses prescription"
            onPress={() => onSave(form)}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>Save glasses details</Text>
          </Pressable>
          {prescription && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear saved glasses prescription"
              onPress={() =>
                Alert.alert(
                  "Clear glasses details?",
                  "This removes the saved glasses information from this device.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear details",
                      style: "destructive",
                      onPress: onClear,
                    },
                  ],
                )
              }
              style={extraStyles.lensClear}
            >
              <Text style={extraStyles.lensClearText}>Clear saved details</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
*/
function PrivacyModal({
  visible,
  animation,
  hideNotificationDetails,
  onHideNotificationDetails,
  onErase,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  hideNotificationDetails: boolean;
  onHideNotificationDetails: (value: boolean) => void;
  onErase: () => void;
  onClose: () => void;
}) {
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
            <Text style={styles.sectionLabel}>YOUR DATA</Text>
            <Text style={styles.modalTitle}>Privacy & data</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close privacy and data controls"
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Local by default</Text>
            <Text style={styles.noteText}>
              ClearCue stores your routine, medication details, and adherence
              history on this device. It has no ClearCue account, cloud sync, or
              caregiver monitoring.
            </Text>
          </View>
          <SettingRow
            title="Hide medication details in notifications"
            detail="Use general wording on lock-screen reminders and refill-estimate alerts."
            value={hideNotificationDetails}
            onChange={onHideNotificationDetails}
          />
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Sharing stays in your control</Text>
            <Text style={styles.noteText}>
              A shareable report is created only when you choose Share read-only
              report. Review the destination before sending it.
            </Text>
          </View>
          <View style={extraStyles.eraseSection}>
            <Text style={extraStyles.eraseTitle}>Erase local routine data</Text>
            <Text style={extraStyles.eraseText}>
              This removes your medications, private prescription details,
              dose history, and scheduled ClearCue notifications from this
              device. It cannot be undone.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Erase local ClearCue routine data"
              onPress={onErase}
              style={extraStyles.eraseButton}
            >
              <Text style={extraStyles.eraseButtonText}>
                Erase my routine data
              </Text>
            </Pressable>
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
  onDemoMode,
  onResetDemo,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onShowOnboarding: () => void;
  demoMode: boolean;
  onDemoMode: (enabled: boolean) => void;
  onResetDemo: () => void;
  onClose: () => void;
}) {
  const update = (key: keyof Omit<AppSettings, "language">, value: boolean) =>
    onChange({ ...settings, [key]: value });
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
            <Text style={styles.sectionLabel}>CLEARCUE</Text>
            <Text style={styles.modalTitle}>Accessibility</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close accessibility settings"
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.settingsIntro}>
            Make ClearCue easier to see, read, and use. These settings are
            stored only on this device.
          </Text>
          <SettingRow
            title="Large text"
            detail="Increase key text and touch targets."
            value={settings.largeText}
            onChange={(value) => update("largeText", value)}
          />
          <SettingRow
            title="High contrast"
            detail="Use stronger contrast between text, buttons, and backgrounds."
            value={settings.highContrast}
            onChange={(value) => update("highContrast", value)}
          />
          <SettingRow
            title="Reduce motion"
            detail="Turn off slide animations in ClearCue."
            value={settings.reduceMotion}
            onChange={(value) => update("reduceMotion", value)}
          />
          <SettingRow
            title="Demo Mode"
            detail="Load sample medications, history, reports, and refill estimates. Real notifications stay off."
            value={demoMode}
            onChange={onDemoMode}
          />
          {demoMode && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset demo data"
              onPress={onResetDemo}
              style={extraStyles.welcomeGuideButton}
            >
              <Text style={extraStyles.cardLink}>Reset demo data</Text>
            </Pressable>
          )}
          <View>
            <Text style={styles.fieldLabel}>Home screen language / Idioma de inicio</Text>
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
            <Text style={extraStyles.supplyHelp}>Spanish currently covers the home screen and core routine status. Full-app Spanish is in progress.</Text>
          </View>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>Color-safe labels</Text>
            <Text style={styles.noteText}>
              Medication cards always name the label color in words, so color is
              never the only instruction.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View ClearCue welcome guide"
            onPress={onShowOnboarding}
            style={extraStyles.welcomeGuideButton}
          >
            <Text style={extraStyles.cardLink}>View welcome guide</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done adjusting accessibility settings"
            onPress={onClose}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>Done</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function DropGuideModal({
  visible,
  animation,
  onClose,
}: {
  visible: boolean;
  animation: "none" | "slide";
  onClose: () => void;
}) {
  const steps = [
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
            <Text style={styles.sectionLabel}>ACCESSIBILITY GUIDE</Text>
            <Text style={styles.modalTitle}>How to use drops</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close how to use drops guide"
            style={styles.close}
            onPress={onClose}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.note}>
            <Text style={styles.noteTitle}>
              Follow your clinician’s plan first
            </Text>
            <Text style={styles.noteText}>
              These general steps are based on National Eye Institute patient
              guidance. Your bottle label or clinician may give different
              instructions—for example about shaking, contact lenses, storage,
              or discarding the bottle. For urgent symptoms, follow your
              clinician’s emergency instructions or local emergency guidance.
            </Text>
          </View>
          {steps.map(([title, detail], index) => (
            <View
              key={title}
              accessible
              accessibilityLabel={`Step ${index + 1} of ${steps.length}: ${title}. ${detail}`}
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
            Source: National Eye Institute, “How to Put in Eye Drops,” reviewed
            September 2026.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Done reading how to use drops guide"
            onPress={onClose}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>Done</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function OnboardingModal({
  visible,
  animation,
  step,
  onNext,
  onComplete,
}: {
  visible: boolean;
  animation: "none" | "slide";
  step: number;
  onNext: () => void;
  onComplete: () => void;
}) {
  const screens = [
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
          <Text style={styles.sectionLabel}>{current.eyebrow}</Text>
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
                ? "Get started with ClearCue"
                : "Continue onboarding"
            }
            onPress={step === screens.length - 1 ? onComplete : onNext}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>
              {step === screens.length - 1 ? "Get started" : "Continue"}
            </Text>
          </Pressable>
          {step < screens.length - 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              onPress={onComplete}
              style={extraStyles.onboardingSkip}
            >
              <Text style={styles.history}>Skip for now</Text>
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
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#D6C4B8", true: "#B85C4A" }}
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
  pharmacy: string;
  rxNumber: string;
  personalNotes: string;
  bottleMl: string;
  dropsPerApplication: string;
  applicationsPerDay: string;
  openedOn: string;
  warningDays: string;
  selectedMedication: CatalogMedication | null;
  onName: (v: string) => void;
  onSelectMedication: (medication: CatalogMedication) => void;
  onTime: (v: string) => void;
  onAdditionalTimes: (v: string[]) => void;
  onClinicianInstructions: (v: string) => void;
  onPrescriber: (v: string) => void;
  onPharmacy: (v: string) => void;
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
  onSave: () => void;
  onDelete: () => void;
};
function RoutineReviewModal({ visible, animation, name, eye, times, clinicianInstructions, bottleMl, dropsPerApplication, applicationsPerDay, openedOn, warningDays, confirmed, onConfirmed, onBack, onSave }: { visible: boolean; animation: "none" | "slide"; name: string; eye: Eye; times: string[]; clinicianInstructions: string; bottleMl: string; dropsPerApplication: string; applicationsPerDay: string; openedOn: string; warningDays: string; confirmed: boolean; onConfirmed: (value: boolean) => void; onBack: () => void; onSave: () => void }) {
  const warnings: string[] = [];
  if (bottleMl && Number(applicationsPerDay) !== times.length) warnings.push(`This routine has ${times.length} reminder${times.length === 1 ? "" : "s"}, while the supply estimate says ${applicationsPerDay} use${Number(applicationsPerDay) === 1 ? "" : "s"} per day. Confirm both against the prescription label.`);
  if (bottleMl && isValidIsoDate(openedOn)) {
    const opened = new Date(`${openedOn}T00:00:00`);
    const ageInDays = Math.floor((Date.now() - opened.getTime()) / 86400000);
    if (opened.getTime() > Date.now()) warnings.push("The bottle-opened date is in the future. This can be valid for a planned routine, but confirm it before saving.");
    else if (ageInDays > 365) warnings.push("The bottle-opened date is more than a year ago. Confirm that it is still the correct bottle and date.");
  }
  return <Modal visible={visible} animationType={animation} presentationStyle="pageSheet" onRequestClose={onBack}><SafeAreaView style={styles.modalScreen}><View style={styles.modalHeader}><View><Text style={styles.sectionLabel}>REVIEW ROUTINE</Text><Text style={styles.modalTitle}>Check before saving</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Return to routine editing" onPress={onBack} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView contentContainerStyle={styles.form}><View style={styles.note}><Text style={styles.noteTitle}>ClearCue supports your plan</Text><Text style={styles.noteText}>ClearCue does not diagnose, prescribe, validate a clinical treatment plan, or replace your clinician’s instructions or prescription label.</Text></View><View style={extraStyles.detailsSection}><Text style={styles.fieldLabel}>{name}</Text><Text style={extraStyles.supplyHelp}>{eye} · {times.join(" · ")}</Text>{clinicianInstructions ? <Text style={extraStyles.supplyHelp}>Clinician instructions: {clinicianInstructions}</Text> : null}{bottleMl ? <Text style={extraStyles.supplyHelp}>Supply estimate: {bottleMl} mL · {dropsPerApplication} drop{Number(dropsPerApplication) === 1 ? "" : "s"} each use · {applicationsPerDay} use{Number(applicationsPerDay) === 1 ? "" : "s"} daily · opened {openedOn} · warning {warningDays} days before estimate</Text> : <Text style={extraStyles.supplyHelp}>No supply estimate added.</Text>}</View>{warnings.map((warning) => <View key={warning} style={extraStyles.eraseSection}><Text style={extraStyles.eraseTitle}>Review this detail</Text><Text style={extraStyles.eraseText}>{warning}</Text></View>)}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} accessibilityLabel="I checked these values against my clinician's prescription" onPress={() => onConfirmed(!confirmed)} style={[styles.choice, confirmed && styles.choiceSelected]}><Text style={[styles.choiceText, confirmed && styles.choiceTextSelected]}>{confirmed ? "✓ " : ""}I checked these values against my clinician’s prescription.</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ disabled: !confirmed }} accessibilityLabel="Save reviewed eye drop routine" disabled={!confirmed} onPress={onSave} style={[styles.saveButton, !confirmed && { opacity: 0.45 }]}><Text style={styles.saveText}>Save routine</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Return to routine editing" onPress={onBack} style={extraStyles.emptyGuide}><Text style={extraStyles.cardLink}>Go back and edit</Text></Pressable></ScrollView></SafeAreaView></Modal>;
}
function AddMedicationModal(props: ModalProps) {
  const [medicationFilter, setMedicationFilter] =
    useState<MedicationFilter>("All");
  const suggestions = searchMedications(props.name, medicationFilter);
  return (
    <Modal
      visible={props.visible}
      animationType={props.animation}
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      <SafeAreaView style={styles.modalScreen}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.sectionLabel}>
              {props.isEditing ? "EDIT PRESCRIPTION" : "NEW PRESCRIPTION"}
            </Text>
            <Text style={styles.modalTitle}>
              {props.isEditing ? "Edit eye drop" : "Add eye drop"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close add medication form"
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
          <Field label="Search eye medications">
            <TextInput
              accessibilityLabel="Search eye medications"
              value={props.name}
              onChangeText={props.onName}
              placeholder="Generic, brand, or common name"
              placeholderTextColor="#81969A"
              style={styles.input}
            />
          </Field>
          <View style={extraStyles.filterRow}>
            {MEDICATION_FILTERS.map((filter) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: medicationFilter === filter }}
                accessibilityLabel={`Filter medications: ${filter}`}
                key={filter}
                onPress={() => setMedicationFilter(filter)}
                style={[
                  extraStyles.filterChip,
                  medicationFilter === filter && extraStyles.filterChipSelected,
                ]}
              >
                <Text
                  style={[
                    extraStyles.filterChipText,
                    medicationFilter === filter &&
                      extraStyles.filterChipTextSelected,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ gap: 8, marginTop: -12 }}>
            {suggestions.map((medication) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Choose ${medication.genericName}`}
                key={medication.id}
                onPress={() => props.onSelectMedication(medication)}
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
                  {medication.brandNames.join(" · ")} · {medication.category}
                </Text>
              </Pressable>
            ))}
          </View>
          {props.selectedMedication && (
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
                Use the instructions on your prescription label and from your
                clinician. ClearCue does not provide dosing directions.
              </Text>
              <Text style={{ fontSize: 10, color: "#6F625B", marginTop: 7 }}>
                {props.selectedMedication.prescriptionStatus ??
                  (props.selectedMedication.id === "artificial-tears"
                    ? "Over-the-counter"
                    : "Prescription")}{" "}
                reference · {props.selectedMedication.source} · reviewed{" "}
                {props.selectedMedication.reviewedOn}
              </Text>
            </View>
          )}
          <TimePicker
            label="First daily reminder"
            value={props.time}
            onChange={props.onTime}
          />
          <View style={extraStyles.extraTimes}>
            <Text style={styles.fieldLabel}>Additional daily reminders</Text>
            <Text style={extraStyles.supplyHelp}>
              Use this when the same medication is taken more than once a day.
            </Text>
            {props.additionalTimes.map((item, index) => (
              <View key={`${index}-${item}`} style={extraStyles.extraTimeRow}>
                <View style={{ flex: 1 }}>
                  <TimePicker
                    label={`Reminder ${index + 2}`}
                    value={item}
                    onChange={(value) =>
                      props.onAdditionalTimes(
                        props.additionalTimes.map((current, currentIndex) =>
                          currentIndex === index ? value : current,
                        ),
                      )
                    }
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove reminder ${index + 2}`}
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
              accessibilityLabel="Add another daily reminder time"
              onPress={() =>
                props.onAdditionalTimes([...props.additionalTimes, "1:00 PM"])
              }
              style={extraStyles.addTime}
            >
              <Text style={extraStyles.addTimeText}>
                ＋ Add another daily time
              </Text>
            </Pressable>
          </View>
          <Field label="Clinician application instructions (optional)">
            <TextInput
              accessibilityLabel="Clinician application instructions"
              value={props.clinicianInstructions}
              onChangeText={props.onClinicianInstructions}
              placeholder="Copy the instructions from your clinician or prescription label"
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
              Private prescription details (optional)
            </Text>
            <Text style={extraStyles.supplyHelp}>
              Stored only on this device. These details are never used to change
              a medication schedule.
            </Text>
            <Field label="Prescriber">
              <TextInput
                accessibilityLabel="Prescriber name"
                value={props.prescriber}
                onChangeText={props.onPrescriber}
                placeholder="e.g. Dr. Rivera"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label="Pharmacy">
              <TextInput
                accessibilityLabel="Pharmacy name"
                value={props.pharmacy}
                onChangeText={props.onPharmacy}
                placeholder="e.g. Main Street Pharmacy"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label="Prescription number">
              <TextInput
                accessibilityLabel="Prescription number"
                value={props.rxNumber}
                onChangeText={props.onRxNumber}
                placeholder="Optional"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label="Personal note">
              <TextInput
                accessibilityLabel="Personal medication note"
                value={props.personalNotes}
                onChangeText={props.onPersonalNotes}
                placeholder="Optional reminder for yourself"
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
            <Text style={styles.noteTitle}>ClearCue supports your plan</Text>
            <Text style={styles.noteText}>
              ClearCue does not diagnose, prescribe, change a dose, or replace
              your clinician’s instructions or prescription label.
            </Text>
          </View>
          <View style={extraStyles.supplySection}>
            <Text style={styles.fieldLabel}>Optional supply estimate</Text>
            <Text style={extraStyles.supplyHelp}>
              Use this only as a planning estimate. Confirm refills and bottle
              instructions with your pharmacy or clinician.
            </Text>
            <Field label="Bottle size (mL)">
              <TextInput
                accessibilityLabel="Bottle size in milliliters"
                value={props.bottleMl}
                onChangeText={props.onBottleMl}
                placeholder="e.g. 5"
                keyboardType="decimal-pad"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <View style={extraStyles.supplyRow}>
              <View style={extraStyles.supplyHalf}>
                <Field label="Drops each use">
                  <TextInput
                    accessibilityLabel="Drops per application"
                    value={props.dropsPerApplication}
                    onChangeText={props.onDropsPerApplication}
                    keyboardType="number-pad"
                    placeholderTextColor="#81969A"
                    style={styles.input}
                  />
                </Field>
              </View>
              <View style={extraStyles.supplyHalf}>
                <Field label="Uses per day">
                  <TextInput
                    accessibilityLabel="Applications per day"
                    value={props.applicationsPerDay}
                    onChangeText={props.onApplicationsPerDay}
                    keyboardType="number-pad"
                    placeholderTextColor="#81969A"
                    style={styles.input}
                  />
                </Field>
              </View>
            </View>
            <Field label="Bottle opened (YYYY-MM-DD)">
              <TextInput
                accessibilityLabel="Bottle opened date"
                value={props.openedOn}
                onChangeText={props.onOpenedOn}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Field label="Warn me this many days before estimate">
              <TextInput
                accessibilityLabel="Refill warning days"
                value={props.warningDays}
                onChangeText={props.onWarningDays}
                keyboardType="number-pad"
                placeholderTextColor="#81969A"
                style={styles.input}
              />
            </Field>
            <Text style={extraStyles.supplyFootnote}>
              ClearCue estimates using 20 drops per mL. Actual bottle volume and
              drop size can vary.
            </Text>
          </View>
          <Field label="Which eye?">
            <View style={styles.choiceRow}>
              {(["Left eye", "Right eye", "Both eyes"] as Eye[]).map((item) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: props.eye === item }}
                  accessibilityLabel={item}
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
                    {item.replace(" eye", "")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="Bottle label color">
            <View style={styles.colorRow}>
              {COLORS.map((item) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: props.color === item }}
                  accessibilityLabel={`${COLOR_NAMES[item]?.en ?? "Custom"} bottle label`}
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
            <Text style={styles.noteTitle}>Confirm your bottle</Text>
            <Text style={styles.noteText}>
              Brand and generic packaging can differ. Choose the label color you
              see on your bottle and follow your clinician’s instructions.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save medication"
            onPress={props.onSave}
            style={styles.saveButton}
          >
            <Text style={styles.saveText}>
              {props.isEditing ? "Save changes" : "Add to my routine"}
            </Text>
          </Pressable>
          {props.isEditing && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove this medication"
              onPress={props.onDelete}
              style={{ padding: 14, alignItems: "center" }}
            >
              <Text style={{ color: "#B3362D", fontWeight: "800" }}>
                Remove this eye drop
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label}: ${value}. Open time menu`}
        accessibilityHint="Choose a common reminder time or enter a custom time"
        onPress={() => setOpen((current) => !current)}
        style={extraStyles.timePickerButton}
      >
        <Text style={extraStyles.timePickerValue}>
          {value || "Select a time"}
        </Text>
        <Text style={extraStyles.timePickerArrow}>{open ? "⌃" : "⌄"}</Text>
      </Pressable>
      {open && (
        <View style={extraStyles.timeMenu}>
          <Text style={extraStyles.supplyHelp}>Choose a common time</Text>
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
                    value === option && extraStyles.timeOptionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 5 }]}>
            Or enter a custom time
          </Text>
          <TextInput
            accessibilityLabel={`Custom ${label.toLowerCase()}`}
            value={value}
            onChangeText={onChange}
            placeholder="e.g. 8:30 AM"
            placeholderTextColor="#81969A"
            style={styles.input}
          />
          <Text style={extraStyles.supplyHelp}>
            Use a time like 8:30 AM. Your iPhone reminder will use this exact
            time.
          </Text>
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
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
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
    fontSize: 11,
    letterSpacing: 1.6,
    color: "#B85C4A",
  },
  greeting: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: "#3A302B",
    marginTop: 5,
  },
  subheading: { fontSize: 16, color: "#6F625B", marginTop: 5 },
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
    fontSize: 10,
    letterSpacing: 1.25,
    fontWeight: "800",
    color: "#FBE3DA",
  },
  progressText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
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
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: "#B85C4A",
  },
  sectionTitle: {
    fontSize: 22,
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
  doseName: { fontSize: 15, fontWeight: "800", color: "#3A302B" },
  doseDetails: { fontSize: 12, color: "#6F625B", marginTop: 4 },
  doseAction: { alignItems: "flex-end", gap: 6 },
  time: { fontSize: 12, fontWeight: "800", color: "#B85C4A" },
  doneButton: {
    backgroundColor: "#B85C4A",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 45,
    alignItems: "center",
  },
  checkedButton: { backgroundColor: "#D8B8AD" },
  doneText: { color: "#fff", fontSize: 12, fontWeight: "800" },
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
  metricLabel: { fontSize: 10, color: "#6F625B", marginTop: 3 },
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
  reminderTitle: { color: "#3A302B", fontSize: 14, fontWeight: "800" },
  reminderText: {
    color: "#6F625B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  reminderButton: {
    backgroundColor: "#B85C4A",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 11,
  },
  reminderButtonOn: { backgroundColor: "#8C6755" },
  reminderButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
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
  tipTitle: { fontSize: 14, fontWeight: "800", color: "#704D30" },
  tipText: { fontSize: 12, color: "#704D30", lineHeight: 18, marginTop: 4 },
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
  addText: { color: "#fff", fontSize: 15, fontWeight: "800" },
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
    fontSize: 13,
    fontWeight: "800",
    color: "#3A302B",
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: "#fff",
    borderColor: "#E7DDD4",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 16,
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
  choiceText: { fontSize: 13, fontWeight: "700", color: "#6F625B" },
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
  note: { backgroundColor: "#F5E5D8", borderRadius: 14, padding: 15 },
  noteTitle: { fontWeight: "800", color: "#704D30", fontSize: 13 },
  noteText: { color: "#704D30", fontSize: 12, lineHeight: 17, marginTop: 4 },
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
  largeText: { fontSize: 18, lineHeight: 25 },
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
