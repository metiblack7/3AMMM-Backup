import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { api } from "./api";


// ── Notification display handler ─────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Web push (safe browser notifications) ─────────────────────
async function registerWebPushNotification(userName: string): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  let permission = Notification.permission;

  if (permission !== "granted") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return;
    }
  }

  if (permission !== "granted") return;

  try {
    new Notification("Welcome to 3AMMM 🎵", {
      body: `Hey ${userName}! Your account is ready.`,
      icon: "/icon.png",
    });
  } catch (err) {
    console.log("Web notification failed:", err);
  }
}

// ── Native push (Android/iOS) ─────────────────────────────────
async function registerNativePushNotification(userName: string): Promise<void> {
  if (!Device.isDevice) return;

  const welcomeSent = await AsyncStorage.getItem("welcome_notif_sent");
  if (welcomeSent === "true") return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("3ammm_default", {
      name: "3AMMM Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#fbb040",
      sound: "default",
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  const pushToken = token.data;

  await AsyncStorage.setItem("3ammm_push_token", pushToken);

  try {
    await api.users.savePushToken(pushToken);
  } catch {}

  await scheduleWelcomeNotification((await AsyncStorage.getItem("pref_lang")) ?? "en");
}

export async function scheduleWelcomeNotification(lang: string | null = null): Promise<void> {
  const alreadySent = await AsyncStorage.getItem("welcome_notif_sent");
  if (alreadySent === "true") return;

  const isAmharic = (lang ?? "en") === "am";
  const title = isAmharic
    ? "እንኳን ወደ ሳባ ወላይትኛ መዝሙሮች በደህና መጡ! 🎵"
    : "Welcome to Saba App 🎵";
  const body = isAmharic
    ? "መልካም የአምልኮ ጊዜ!"
    : "Enjoy your worship time!";

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data: { type: "welcome" },
    },
    trigger: null,
  });

  await AsyncStorage.setItem("welcome_notif_sent", "true");
}

// ── Main entry ────────────────────────────────────────────────
export async function registerForPushNotificationsOnSignUp(
  userName: string
): Promise<void> {
  const already = await AsyncStorage.getItem("3ammm_push_registered");
  const welcomeSent = await AsyncStorage.getItem("welcome_notif_sent");

  if (already === "true" && welcomeSent === "true") return;

  if (Platform.OS === "web") {
    await registerWebPushNotification(userName);
  } else {
    await registerNativePushNotification(userName);
  }

  if (already !== "true") {
    await AsyncStorage.setItem("3ammm_push_registered", "true");
  }
}

// ── LISTENERS (FIXED - NO MORE BROKEN API) ───────────────────
export function setupNotificationListeners(): () => void {
  if (Platform.OS === "web") {
    return () => {};
  }

  const sub1 = Notifications.addNotificationReceivedListener((n) => {
    console.log("[Push] received:", n.request.content.title);
  });

  const sub2 =
    Notifications.addNotificationResponseReceivedListener((r) => {
      console.log("[Push] tapped:", r.notification.request.content.data);
    });

  // ✅ FIX: use .remove() instead of removeNotificationSubscription
  return () => {
    sub1?.remove?.();
    sub2?.remove?.();
  };
}