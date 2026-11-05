import { Linking, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { absoluteUrl } from "@/api/client";
import { toast } from "@/ui/toast";

/**
 * Opens a link in the app that owns it: a Zoom / Google Meet / WhatsApp link opens that app,
 * tel: starts a call, anything else opens the browser. Shows a message instead of failing silently.
 */
export async function openExternal(url: string | null | undefined): Promise<boolean> {
  if (!url || !String(url).trim()) {
    toast.error("There is no link to open.");
    return false;
  }
  let target = String(url).trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(target)) target = target.startsWith("/") ? absoluteUrl(target) : `https://${target}`;
  try {
    await Linking.openURL(target);
    return true;
  } catch {
    toast.error("Could not open this link on your phone.");
    return false;
  }
}

/**
 * Opens a web page inside the app (a browser tab over the app, with a close button):
 * for payment pages, verification pages and other pages of the academy's site.
 * On Android the promise resolves as soon as the tab opens, not when it is closed: to act when the person
 * comes back, listen for the app returning to the foreground (useAppForeground).
 */
export async function openInApp(pathOrUrl: string): Promise<void> {
  const url = absoluteUrl(pathOrUrl);
  try {
    await WebBrowser.openBrowserAsync(url, { toolbarColor: "#0B1A45", controlsColor: "#DFB76C", showTitle: true });
  } catch {
    await openExternal(url);
  }
}

export function callPhone(number: string): Promise<boolean> {
  return openExternal(`tel:${number.replace(/[^\d+]/g, "")}`);
}

/** Opens a WhatsApp chat. `number` is the full international number without "+", e.g. 8801641028312. */
export function openWhatsApp(number: string, message = ""): Promise<boolean> {
  return openExternal(`https://wa.me/${number.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`);
}

export async function copyText(text: string, doneMessage = "Copied"): Promise<void> {
  try {
    await Clipboard.setStringAsync(text);
    toast.info(doneMessage);
  } catch {
    toast.error("Could not copy.");
  }
}

/** A light tick under the finger: tab changes, toggles, successful saves */
export function tapFeedback(): void {
  if (Platform.OS === "web") return;
  Haptics.selectionAsync().catch(() => {});
}

export function successFeedback(): void {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warningFeedback(): void {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
