import { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CAREGIVER_API_URL, CAREGIVER_KEY, CaregiverRecord, CaregiverSchedule,
  caregiverPushToken, caregiverRequest, deletePatientConnection,
  getCaregiverSecret, getPatientSecret, queuePatientPause, queuePatientSync,
  saveCaregiverSecret, savePatientSecret,
} from "./caregiver";

type Props = {
  visible: boolean;
  language: "en" | "es";
  largeText: boolean;
  monochrome: boolean;
  demoMode: boolean;
  schedule: CaregiverSchedule[];
  records: CaregiverRecord[];
  onClose: () => void;
};

type Role = "patient" | "caregiver" | null;

export function CaregiverModal({ visible, language, largeText, monochrome, demoMode, schedule, records, onClose }: Props) {
  const es = language === "es";
  const [role, setRole] = useState<Role>(null);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [refresh, setRefresh] = useState(0);
  const connectionCheckVersion = useRef(0);
  const actionInProgress = useRef(false);
  const textSize = largeText ? styles.largeText : undefined;
  const titleSize = largeText ? styles.largeTitle : undefined;
  const colorStyle = monochrome ? styles.monochrome : undefined;

  useEffect(() => {
    if (!CAREGIVER_API_URL) return;
    let active = true;
    const checkVersion = ++connectionCheckVersion.current;
    void Promise.all([getPatientSecret(), getCaregiverSecret()]).then(([patient, caregiver]) => {
      if (!active) return;
      const currentRole = patient ? "patient" : caregiver ? "caregiver" : null;
      const currentSecret = patient || caregiver;
      setRole(currentRole);
      setSecret(currentSecret);
      setLoaded(true);
      setStorageError(false);
      if (currentSecret) {
        void caregiverRequest<{ connected: boolean }>(currentRole === "patient" ? "/plan/status" : "/caregiver/status", {}, currentSecret)
          .then((result) => {
            if (active && checkVersion === connectionCheckVersion.current) {
              setConnected(result.connected);
              setNotice("");
            }
          })
          .catch(() => {
            if (active && checkVersion === connectionCheckVersion.current) {
              setConnected(false);
              setNotice(es ? "No se pudo verificar la conexión. Revisa Internet." : "Could not check the connection. Check your internet access.");
            }
          });
      }
    }).catch(() => {
      if (active) {
        setLoaded(true);
        setStorageError(true);
        setNotice(es ? "No se pudo abrir la conexión guardada." : "Could not open the saved connection.");
      }
    });
    return () => { active = false; };
  }, [visible, refresh, es]);

  useEffect(() => {
    if (!secret || role !== "patient" || !demoMode) return;
    void queuePatientPause(secret).catch(() => {
      setNotice(es
        ? "No se pudo actualizar el modo demo en el servicio. Las alertas podrían seguir activas hasta que vuelva Internet."
        : "Could not update Demo Mode with the service. Alerts may remain active until internet access returns.");
    });
  }, [demoMode, role, secret, es]);

  useEffect(() => {
    if (!secret || role !== "patient" || demoMode) return;
    const timer = setTimeout(() => {
      void queuePatientSync(secret, schedule, records)
        .then(() => setLastSync(new Date()))
        .catch(() => setNotice(es
          ? "No se pudieron sincronizar los registros. Las alertas podrían no reflejar lo que marcaste."
          : "Could not sync dose records. Alerts may not reflect what you marked."));
    }, 1200);
    return () => clearTimeout(timer);
  }, [secret, role, demoMode, schedule, records, refresh, es]);

  useEffect(() => {
    if (!secret || role !== "caregiver") return;
    void caregiverPushToken(false)
      .then((pushToken) => caregiverRequest("/caregiver/token", { pushToken, language }, secret))
      .catch(() => setNotice(es
        ? "No se pudo actualizar el permiso de notificaciones. Revísalo en los ajustes del dispositivo."
        : "Could not refresh notification access. Check your device settings."));
  }, [secret, role, language, refresh, es]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setRefresh((value) => value + 1);
    });
    return () => listener.remove();
  }, []);

  async function perform(action: () => Promise<void>, errorNotice?: (error: unknown) => string) {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setBusy(true);
    setNotice("");
    try { await action(); }
    catch (error) {
      const denied = error instanceof Error && error.message === "permission-denied";
      setNotice(errorNotice?.(error) ?? (denied
        ? es ? "Permite las notificaciones para recibir alertas de cuidado." : "Allow notifications to receive caregiver alerts."
        : es ? "No se pudo completar. Comprueba Internet y vuelve a intentarlo." : "Could not complete this. Check your internet access and try again."));
    } finally {
      actionInProgress.current = false;
      setBusy(false);
    }
  }

  function startPatient() {
    void perform(async () => {
      const created = await caregiverRequest<{ secret: string }>("/plan/create");
      await savePatientSecret(created.secret);
      setSecret(created.secret);
      setRole("patient");
      setConnected(false);
      setRefresh((value) => value + 1);
    });
  }

  function makeInvite() {
    if (!secret) return;
    void perform(async () => {
      const result = await caregiverRequest<{ code: string }>("/plan/invite", {}, secret);
      setInvite(result.code);
      setNotice(es ? "Comparte este código de forma privada. Caduca en 10 minutos." : "Share this code privately. It expires in 10 minutes.");
    });
  }

  function pairCaregiver() {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-F0-9]{10}$/.test(normalized)) {
      setNotice(es ? "Introduce un código de 10 caracteres." : "Enter a 10-character code.");
      return;
    }
    void perform(async () => {
      const pushToken = await caregiverPushToken();
      const result = await caregiverRequest<{ secret: string }>("/pair", { code: normalized, pushToken, language });
      await saveCaregiverSecret(result.secret);
      setSecret(result.secret);
      setRole("caregiver");
      setConnected(true);
      setCode("");
    });
  }

  function refreshConnection() {
    if (!secret) return;
    void perform(async () => {
      if (role === "caregiver") {
        const pushToken = await caregiverPushToken();
        await caregiverRequest("/caregiver/token", { pushToken, language }, secret);
        setConnected(true);
      } else {
        const status = await caregiverRequest<{ connected: boolean }>("/plan/status", {}, secret);
        setConnected(status.connected);
      }
      setRefresh((value) => value + 1);
    });
  }

  function sendTestAlert() {
    if (!secret) return;
    void perform(async () => {
      const pushToken = await caregiverPushToken();
      await caregiverRequest("/caregiver/token", { pushToken, language }, secret);
      await caregiverRequest<{ sent: true }>("/caregiver/test", {}, secret);
      connectionCheckVersion.current += 1;
      setNotice(es
        ? "Se envió una alerta de prueba. Debería aparecer en unos momentos."
        : "A test alert was sent. It should appear in a moment.");
    }, (error) => {
      const code = error instanceof Error ? error.message : "";
      if (code === "permission-denied")
        return es ? "Permite las notificaciones para recibir la alerta de prueba." : "Allow notifications to receive the test alert.";
      if (code === "service-429")
        return es ? "Ya enviaste el máximo de 5 alertas de prueba esta hora. Inténtalo más tarde." : "You have already sent the maximum of five test alerts this hour. Try again later.";
      if (code === "service-401")
        return es ? "La conexión del cuidador ya no es válida. Vuelve a vincular los dispositivos." : "The caregiver connection is no longer valid. Link the devices again.";
      return es
        ? "No se confirmó el envío de la alerta de prueba. Comprueba Internet y vuelve a intentarlo."
        : "The test alert could not be confirmed. Check your internet access and try again.";
    });
  }

  function stopSharing() {
    void perform(async () => {
      await deletePatientConnection();
      setSecret(null);
      setRole(null);
      setConnected(false);
      setInvite("");
    });
  }

  function leaveCaregiver() {
    if (!secret) return;
    void perform(async () => {
      try {
        await caregiverRequest("/caregiver/leave", {}, secret);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "service-401") throw error;
      }
      await SecureStore.deleteItemAsync(CAREGIVER_KEY);
      setSecret(null);
      setRole(null);
      setConnected(false);
    });
  }

  const button = (label: string, onPress: () => void, secondary = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy}
      onPress={onPress} style={[styles.button, secondary && styles.secondaryButton, !secondary && colorStyle]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryText, textSize]}>{label}</Text>
    </Pressable>
  );

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={[styles.screen, monochrome && styles.monochromeScreen]}>
      <View style={styles.header}>
        <Text style={[styles.title, titleSize]}>{es ? "Alertas para cuidadores" : "Caregiver alerts"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={es ? "Cerrar" : "Close"} onPress={onClose}>
          <Text style={[styles.close, textSize]}>×</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!CAREGIVER_API_URL ? <Text style={[styles.body, textSize]}>
          {es ? "Esta función estará disponible después de configurar el servicio de alertas y crear una nueva versión de ClearCue." : "This feature will be available after the alert service is configured and a new ClearCue build is created."}
        </Text> : !loaded ? <Text style={[styles.body, textSize]}>
          {es ? "Abriendo la conexión…" : "Opening connection…"}
        </Text> : storageError ? <Text style={[styles.warning, monochrome && styles.monochromeWarning, textSize]}>
          {es ? "No se pudo leer la conexión segura. Cierra y vuelve a abrir ClearCue antes de intentar vincularlo." : "Could not read the secure connection. Close and reopen ClearCue before trying to pair."}
        </Text> : <>
          <Text style={[styles.body, textSize]}>
            {es
              ? "Es opcional y no requiere una cuenta. El servicio recibe horarios, identificadores de dosis y registros de tomada u omitida; no recibe nombres de medicamentos ni datos de receta. Una alerta significa que no se registró una dosis, no que se haya omitido con certeza. Necesita Internet y las notificaciones no están garantizadas."
              : "Optional, with no account. The service receives dose times, IDs, and taken or skipped records—not medication names or prescription details. An alert means a dose was not recorded, not proof it was missed. Internet is required and notification delivery is not guaranteed."}
          </Text>
          {demoMode && <Text style={[styles.warning, monochrome && styles.monochromeWarning, textSize]}>{es ? "El modo demo pausa el envío si el servicio está disponible." : "Demo Mode pauses sharing when the service is reachable."}</Text>}
          {!role ? <>
            {button(es ? "Compartir mi rutina con un cuidador" : "Share my routine with a caregiver", startPatient)}
            <Text style={[styles.label, textSize]}>{es ? "O introduce el código de la persona a quien ayudas" : "Or enter the code from someone you support"}</Text>
            <TextInput style={[styles.input, textSize]} value={code} onChangeText={setCode} maxLength={10}
              autoCapitalize="characters" autoCorrect={false} accessibilityLabel={es ? "Código de invitación" : "Invitation code"}
              placeholder={es ? "Código de 10 caracteres" : "10-character code"} />
            {button(es ? "Conectar como cuidador" : "Connect as caregiver", pairCaregiver, true)}
          </> : role === "patient" ? <>
            <Text style={[styles.label, textSize]}>{connected ? (es ? "Cuidador conectado" : "Caregiver connected") : (es ? "Aún no hay cuidador conectado" : "No caregiver connected yet")}</Text>
            {!connected && !demoMode && button(es ? "Crear código de invitación" : "Create invitation code", makeInvite)}
            {!!invite && <Text selectable style={[styles.invite, titleSize]}>{invite}</Text>}
            {lastSync && <Text style={[styles.body, textSize]}>{es ? "Última sincronización" : "Last synced"}: {lastSync.toLocaleString(es ? "es" : "en")}</Text>}
            {button(es ? "Comprobar conexión" : "Check connection", refreshConnection, true)}
            {button(es ? "Revocar acceso y borrar datos compartidos" : "Revoke access and delete shared data", stopSharing, true)}
          </> : <>
            <Text style={[styles.label, textSize]}>{connected ? (es ? "Conectado para recibir alertas" : "Connected to receive alerts") : (es ? "Conexión pendiente" : "Connection pending")}</Text>
            {button(es ? "Comprobar notificaciones" : "Check notifications", refreshConnection, true)}
            {connected && button(es ? "Enviar alerta de prueba" : "Send test alert", sendTestAlert)}
            {button(es ? "Dejar de recibir alertas" : "Stop receiving alerts", leaveCaregiver, true)}
          </>}
          {!!notice && <Text accessibilityLiveRegion="polite" style={[styles.warning, monochrome && styles.monochromeWarning, textSize]}>{notice}</Text>}
          {busy && <Text style={[styles.body, textSize]}>{es ? "Un momento…" : "One moment…"}</Text>}
        </>}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF7F2", paddingTop: 16 },
  monochromeScreen: { backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 12 },
  title: { color: "#302923", fontSize: 26, fontWeight: "800", flexShrink: 1 },
  largeTitle: { fontSize: 32, lineHeight: 40 },
  close: { color: "#302923", fontSize: 32, paddingHorizontal: 12 },
  content: { padding: 24, gap: 18, paddingBottom: 56 },
  body: { color: "#3A302B", fontSize: 17, lineHeight: 26 },
  label: { color: "#3A302B", fontSize: 19, fontWeight: "700" },
  largeText: { fontSize: 21, lineHeight: 30 },
  warning: { backgroundColor: "#FFF1E2", color: "#49352B", borderRadius: 12, padding: 14, fontSize: 17, lineHeight: 25 },
  monochromeWarning: { backgroundColor: "#EEEEEE", color: "#171717" },
  invite: { color: "#302923", fontSize: 30, fontWeight: "800", letterSpacing: 4, textAlign: "center" },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#786C64", borderRadius: 12, padding: 14, color: "#302923", fontSize: 18, minHeight: 56 },
  button: { backgroundColor: "#3B504B", borderRadius: 14, minHeight: 54, padding: 14, justifyContent: "center" },
  secondaryButton: { backgroundColor: "#EAE3DC", borderWidth: 1, borderColor: "#70645C" },
  monochrome: { backgroundColor: "#171717", borderColor: "#171717" },
  buttonText: { color: "white", fontSize: 18, fontWeight: "700", textAlign: "center" },
  secondaryText: { color: "#171717" },
});
