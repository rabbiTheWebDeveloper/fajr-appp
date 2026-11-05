import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { ApiError, absoluteUrl, request } from "@/api/client";
import { Session } from "@/api/session";

/** A file the person picked on the phone, ready to upload */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  /** Bytes, when the phone reports it */
  size?: number;
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("gif")) return "gif";
  return "jpg";
}

/** A file name safe for the phone's storage: "Lesson summary: Nov/2026" -> "Lesson-summary-Nov-2026" */
export function safeFileName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "file"
  );
}

/**
 * Opens the phone's photo picker. Resolves null when the person backs out.
 * `square` offers a 1:1 crop (profile pictures).
 */
export async function pickImage(options: { square?: boolean; quality?: number } = {}): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: !!options.square,
    aspect: options.square ? [1, 1] : undefined,
    quality: options.quality ?? 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType || "image/jpeg";
  return { uri: asset.uri, name: asset.fileName || `photo-${Date.now()}.${extensionFor(mimeType)}`, mimeType, size: asset.fileSize ?? undefined };
}

/**
 * Opens the phone's file picker. `types` are MIME types ("image/*", "application/pdf").
 * Resolves null when the person backs out.
 */
export async function pickDocument(types: string[] = ["image/*", "application/pdf"]): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, name: asset.name || `file-${Date.now()}`, mimeType: asset.mimeType || "application/octet-stream", size: asset.size ?? undefined };
}

/** Appends a picked file to FormData the way React Native expects it */
export function appendFile(form: FormData, field: string, file: PickedFile): void {
  form.append(field, { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
}

/**
 * Uploads a picked image/file through POST /api/upload (the same route the website's avatar and
 * attachment uploads use) and resolves with its public URL.
 */
export async function uploadFile(file: PickedFile): Promise<string> {
  const form = new FormData();
  appendFile(form, "file", file);
  const reply = await request<{ success?: boolean; secure_url?: string; url?: string; message?: string }>("/api/upload", { method: "POST", body: form });
  const url = reply.secure_url || reply.url;
  if (!url) throw new ApiError(reply.message || "The upload did not return a file address.", 200, reply);
  return url;
}

async function share(uri: string, mimeType: string, title: string): Promise<void> {
  if (Platform.OS === "web") return;
  if (!(await Sharing.isAvailableAsync())) throw new Error("This phone cannot share or save files from the app.");
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: title, UTI: mimeType === "application/pdf" ? "com.adobe.pdf" : undefined });
}

/**
 * Turns an HTML document into a PDF and opens the phone's share sheet (save to Files, send on WhatsApp, print…).
 * This is the app's version of the website's "Download PDF" buttons.
 *
 * Build the HTML with inline CSS; remote images must be absolute https URLs. Use escapeHtml() from
 * "@/lib/format" on every value that comes from data.
 */
export async function shareHtmlAsPdf(html: string, fileName: string, options: { landscape?: boolean } = {}): Promise<void> {
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, ...(options.landscape ? { width: 842, height: 595 } : { width: 595, height: 842 }) });
  const name = `${safeFileName(fileName.replace(/\.pdf$/i, ""))}.pdf`;
  let target = uri;
  try {
    const destination = new File(Paths.cache, name);
    if (destination.exists) destination.delete();
    new File(uri).move(destination);
    target = destination.uri;
  } catch {
    // Keep the generated name if the rename fails
  }
  await share(target, "application/pdf", fileName);
}

/** Opens the phone's print dialog for an HTML document */
export async function printHtml(html: string): Promise<void> {
  await Print.printAsync({ html });
}

/**
 * Downloads a file from the site (or any https URL) into the app's cache and opens the share sheet,
 * so the person can save or send it. The login cookie is sent to the academy's own server only.
 */
export async function downloadAndShare(pathOrUrl: string, fileName: string, mimeType = "application/octet-stream"): Promise<void> {
  const url = absoluteUrl(pathOrUrl);
  const destination = new File(Paths.cache, safeFileName(fileName));
  if (destination.exists) destination.delete();
  const token = Session.token();
  const sameSite = url.startsWith(absoluteUrl("/"));
  const file = await File.downloadFileAsync(url, destination, sameSite && token ? { headers: { Cookie: `auth_token=${token}` } } : undefined);
  await share(file.uri, mimeType, fileName);
}
