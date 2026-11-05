import React, { useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Session } from "@/api/session";
import { useAuth } from "@/auth/AuthContext";
import { callPhone, openInApp, openWhatsApp } from "@/lib/device";
import PasswordResetFlow from "@/screens/auth/PasswordResetFlow";
import { Button, Sheet } from "@/ui";

const NAVY = "#0B1A45";
const SUPPORT_WHATSAPP = "8801641028312";
const SUPPORT_PHONE = "01857381244";

/**
 * Sign-in for students and teachers. The page is always the brand's navy (it does not follow the light/dark setting),
 * like the website's login page.
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, endedNotice, clearEndedNotice } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ title: string; message: string } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Pre-fill the ID used last time
  useEffect(() => {
    Session.lastIdentifier()
      .then((saved) => {
        if (saved) setIdentifier((current) => current || saved);
      })
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (busy) return;
    if (!identifier.trim() || !password) {
      setError("Enter your email or ID and your password.");
      return;
    }
    setError("");
    setSuccess(null);
    clearEndedNotice();
    setBusy(true);
    try {
      await signIn(identifier, password);
      // On success the app switches to the portal; this screen goes away
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Login failed. Please try again.");
      setBusy(false);
    }
  };

  const handleResetDone = (resetEmail: string) => {
    setResetOpen(false);
    if (resetEmail) setIdentifier(resetEmail);
    setPassword("");
    setError("");
    setSuccess({ title: "Password Updated", message: "Your password has been reset. Enter your new password to sign in." });
  };

  const inputBox = { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, height: 50, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#ffffff" };

  return (
    <LinearGradient colors={["#060d20", NAVY, "#162C65"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "web" ? undefined : "padding"} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
          {/* Brand */}
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Image source={require("../../../assets/icon-192.png")} style={{ width: 76, height: 76, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }} />
            <Text style={{ marginTop: 12, color: "#ffffff", fontSize: 22, fontWeight: "900", letterSpacing: 0.4 }}>
              FAJR <Text style={{ color: "#DFB76C" }}>ACADEMY</Text>
            </Text>
            <Text style={{ marginTop: 2, color: "rgba(191,219,254,0.75)", fontSize: 12.5, fontWeight: "500" }}>Student &amp; Teacher App</Text>
          </View>

          {/* Card */}
          <View style={{ backgroundColor: "#ffffff", borderRadius: 22, padding: 20, gap: 14, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
            <View style={{ alignItems: "center", marginBottom: 2 }}>
              <Text accessibilityRole="header" style={{ color: "#0f172a", fontSize: 24, fontWeight: "800", letterSpacing: -0.4 }}>
                Welcome back
              </Text>
              <Text style={{ color: "#475569", fontSize: 13.5, marginTop: 4 }}>Sign in to Fajr Academy</Text>
            </View>

            {success || endedNotice ? (
              <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: success ? "#ecfdf5" : "#fffbeb", borderWidth: 1, borderColor: success ? "#a7f3d0" : "#fde68a" }}>
                <Feather name={success ? "check-circle" : "info"} size={18} color={success ? "#059669" : "#b45309"} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  {success ? <Text style={{ color: "#064e3b", fontWeight: "700", fontSize: 13.5 }}>{success.title}</Text> : null}
                  <Text style={{ color: success ? "#065f46" : "#92400e", fontSize: 13, lineHeight: 18 }}>{success ? success.message : endedNotice}</Text>
                </View>
              </View>
            ) : null}

            {error ? (
              <View accessibilityRole="alert" style={{ padding: 12, borderRadius: 12, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", gap: 10 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Feather name="alert-circle" size={18} color="#dc2626" style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, color: "#7f1d1d", fontSize: 13, fontWeight: "500", lineHeight: 18 }}>{error}</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#fecaca" }}>
                  <Pressable
                    onPress={() => void openWhatsApp(SUPPORT_WHATSAPP, "Hello Fajr Academy Support, I need assistance with my account login.")}
                    accessibilityRole="button"
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 9, backgroundColor: "#059669" }}
                  >
                    <MaterialCommunityIcons name="whatsapp" size={16} color="#ffffff" />
                    <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>WhatsApp Support</Text>
                  </Pressable>
                  <Pressable onPress={() => void callPhone(SUPPORT_PHONE)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 9, backgroundColor: "#f1f5f9" }}>
                    <Feather name="phone-call" size={13} color="#1e293b" />
                    <Text style={{ color: "#1e293b", fontSize: 12, fontWeight: "700" }}>01857-381244</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={{ color: "#334155", fontSize: 13, fontWeight: "600" }}>Email or Student ID</Text>
              <View style={inputBox}>
                <Feather name="mail" size={18} color="#64748b" />
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Email, Student ID, or Student Number"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  keyboardType="email-address"
                  returnKeyType="next"
                  editable={!busy}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityLabel="Email or Student ID"
                  style={{ flex: 1, color: "#0f172a", fontSize: 14.5, paddingVertical: 10 }}
                />
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#334155", fontSize: 13, fontWeight: "600" }}>Password</Text>
                <Pressable onPress={() => setResetOpen(true)} hitSlop={8} accessibilityRole="button">
                  <Text style={{ color: NAVY, fontSize: 13, fontWeight: "700" }}>Forgot password?</Text>
                </Pressable>
              </View>
              <View style={inputBox}>
                <Feather name="lock" size={18} color="#64748b" />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  returnKeyType="go"
                  editable={!busy}
                  onSubmitEditing={() => void submit()}
                  accessibilityLabel="Password"
                  style={{ flex: 1, color: "#0f172a", fontSize: 14.5, paddingVertical: 10 }}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#64748b" />
                </Pressable>
              </View>
            </View>

            <Button title={busy ? "Verifying…" : "Sign In"} icon="log-in" variant="navy" size="lg" block loading={busy} onPress={() => void submit()} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e2e8f0" }}>
              <Text style={{ color: "#475569", fontSize: 12 }}>Verify Student or Teacher ID?</Text>
              <Pressable
                onPress={() => void openInApp("/verify")}
                accessibilityRole="button"
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 11, backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0" }}
              >
                <Feather name="shield" size={15} color="#059669" />
                <Text style={{ color: "#047857", fontSize: 12, fontWeight: "800" }}>Verify Member</Text>
              </Pressable>
            </View>
          </View>

          <Text style={{ marginTop: 18, color: "rgba(191,219,254,0.6)", fontSize: 11.5, textAlign: "center" }}>Your account is created by the academy. Staff and admins sign in on the website.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet visible={resetOpen} onClose={() => setResetOpen(false)} title="Forgot Password" subtitle="Verify your email to choose a new password">
        <PasswordResetFlow initialEmail={identifier.includes("@") ? identifier.trim() : ""} onDone={handleResetDone} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.3)" }}>
          <Text style={{ color: "#64748b", fontSize: 12 }}>Need direct assistance?</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Button title="WhatsApp" variant="ghost" size="sm" onPress={() => void openWhatsApp(SUPPORT_WHATSAPP, "Hello Fajr Academy Support, I need help resetting my password.")} />
            <Button title="Call" icon="phone" variant="ghost" size="sm" onPress={() => void callPhone(SUPPORT_PHONE)} />
          </View>
        </View>
      </Sheet>
    </LinearGradient>
  );
}
