import React, { useState } from "react";
import { Image, Text, View, type DimensionValue, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { absoluteUrl } from "@/api/client";
import { CEO_NAME, DEFAULT_COURSE_NAME, duaText, enrollmentDate, longDate, parentPhrase, type Certificate } from "@/screens/student/certificate/helpers";
import { useTheme } from "@/theme/ThemeContext";
import { GradientCard, Icon, T } from "@/ui";

/**
 * The certificate is a printed document, so its paper keeps the same white, navy and gold in light and dark mode
 * (as it does on the website).
 */
const PAPER = {
  white: "#ffffff",
  navy: "#0B1A45",
  gold: "#b49650",
  dua: "#a0823c",
  text: "#374151",
  soft: "#4b5563",
  faint: "#6b7280",
  line: "#9ca3af",
  hairline: "#e5e7eb",
  sealTint: "#fffbeb",
};

const SERIF = "serif";

/** A site image that simply disappears when it cannot be loaded (as the website's signature images do) */
function SiteImage({ path, style }: { path: string; style: StyleProp<ImageStyle> }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <Image source={{ uri: absoluteUrl(path) }} resizeMode="contain" onError={() => setFailed(true)} style={style} />;
}

/** "──── ◆ ────" */
function Ornament({ lineWidth, diamonds = 1, style }: { lineWidth: number; diamonds?: 1 | 3; style?: StyleProp<ViewStyle> }) {
  const diamond = (size: number, key: string) => <View key={key} style={{ width: size, height: size, backgroundColor: PAPER.gold, transform: [{ rotate: "45deg" }] }} />;
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, style]}>
      <View style={{ width: lineWidth, height: 1, backgroundColor: PAPER.gold }} />
      {diamonds === 3 ? [diamond(6, "a"), diamond(4, "b"), diamond(6, "c")] : diamond(6, "a")}
      <View style={{ width: lineWidth, height: 1, backgroundColor: PAPER.gold }} />
    </View>
  );
}

function Corner({ top, bottom, left, right }: { top?: number; bottom?: number; left?: number; right?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        bottom,
        left,
        right,
        width: 18,
        height: 18,
        borderColor: PAPER.gold,
        borderTopWidth: top !== undefined ? 2 : 0,
        borderBottomWidth: bottom !== undefined ? 2 : 0,
        borderLeftWidth: left !== undefined ? 2 : 0,
        borderRightWidth: right !== undefined ? 2 : 0,
      }}
    />
  );
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 2 }}>
      <T variant="label" color={PAPER.navy} center style={{ fontSize: 8.5, letterSpacing: 0.6, lineHeight: 12 }}>
        {label}
      </T>
      <T variant="caption" color={PAPER.soft} center style={{ marginTop: 2, fontFamily: mono ? "monospace" : undefined }}>
        {value}
      </T>
    </View>
  );
}

function SignatureBlock({ image, imageStyle, lineWidth, children }: { image: string; imageStyle: StyleProp<ImageStyle>; lineWidth: DimensionValue; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ height: 40, justifyContent: "flex-end", alignItems: "center", marginBottom: 3 }}>
        <SiteImage path={image} style={imageStyle} />
      </View>
      <View style={{ width: lineWidth, height: 1, backgroundColor: PAPER.line, marginBottom: 5 }} />
      {children}
    </View>
  );
}

/** The approved certificate as it reads on a phone: same frame, wording, names, signatures and seal as the website's preview */
export function CertificatePreview({ cert }: { cert: Certificate }) {
  const name = cert.studentName || "Student Name";
  const parents = parentPhrase(cert);
  const courseName = cert.courseName || DEFAULT_COURSE_NAME;
  const strong = { fontWeight: "700", color: PAPER.navy } as const;

  return (
    <View style={{ backgroundColor: PAPER.white, borderRadius: 12, shadowColor: "#000000", shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
      {/* Navy frame with the gold line inside it */}
      <View style={{ margin: 7, borderWidth: 4, borderColor: PAPER.navy }}>
        <View style={{ borderWidth: 1.5, borderColor: PAPER.gold, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 20, alignItems: "center" }}>
          <Corner top={7} left={7} />
          <Corner top={7} right={7} />
          <Corner bottom={7} left={7} />
          <Corner bottom={7} right={7} />

          <SiteImage path="/fajr-horizontal-logo.png" style={{ width: 150, height: 52 }} />
          <Ornament lineWidth={56} style={{ marginVertical: 10 }} />

          <T variant="label" color={PAPER.gold} center style={{ letterSpacing: 2.2, fontSize: 9.5, fontFamily: SERIF }}>
            This Certificate is Presented To:
          </T>
          <T color={PAPER.navy} center style={{ fontFamily: SERIF, fontSize: 23, lineHeight: 30, fontWeight: "700", marginTop: 4 }}>
            Certificate of Completion
          </T>
          <Ornament lineWidth={70} diamonds={3} style={{ marginVertical: 8 }} />

          <T color={PAPER.navy} center style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 35, fontWeight: "700", fontStyle: "italic" }}>
            {name}
          </T>
          <LinearGradient colors={["rgba(180,150,80,0)", PAPER.gold, "rgba(180,150,80,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: 200, height: 2, marginTop: 6, marginBottom: 12 }} />

          <T color={PAPER.text} center style={{ fontFamily: SERIF, fontSize: 13.5, lineHeight: 21 }}>
            This certifies that <Text style={strong}>{name}</Text> (ID: <Text style={{ fontWeight: "700" }}>{cert.studentId || "N/A"}</Text>)
            {parents ? (
              <Text>
                , <Text style={{ fontStyle: "italic" }}>{parents}</Text>,
              </Text>
            ) : null}{" "}
            has successfully completed the course in <Text style={strong}>{`“${courseName}”`}</Text>.
          </T>

          <T color={PAPER.dua} center style={{ fontFamily: SERIF, fontSize: 12.5, lineHeight: 18, fontStyle: "italic", fontWeight: "600", marginTop: 10 }}>
            {duaText(cert)}
          </T>

          {/* Details bar */}
          <View style={{ flexDirection: "row", alignSelf: "stretch", marginTop: 16, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: PAPER.hairline }}>
            <MetaCell label="Student ID" value={cert.studentId || "N/A"} mono />
            <MetaCell label="Instructor" value={cert.teacherName || "Instructor"} />
            <MetaCell label="Date of Enrollment" value={enrollmentDate(cert)} />
          </View>

          {/* Signatures either side of the official seal */}
          <View style={{ flexDirection: "row", alignSelf: "stretch", alignItems: "flex-end", gap: 8, marginTop: 18 }}>
            <SignatureBlock image="/management-signature.png" imageStyle={{ width: 84, height: 20 }} lineWidth="92%">
              <T variant="label" color={PAPER.navy} center style={{ fontSize: 8.5, letterSpacing: 0.5, lineHeight: 12 }}>
                Academy Management
              </T>
              <T variant="caption" color={PAPER.faint} center style={{ fontSize: 9 }}>
                Fajr Academy
              </T>
            </SignatureBlock>

            <View style={{ width: 66, height: 66, borderRadius: 33, borderWidth: 2.5, borderColor: PAPER.gold, backgroundColor: PAPER.sealTint, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: PAPER.gold, alignItems: "center", justifyContent: "center" }}>
                <SiteImage path="/fajr-logo.png" style={{ width: 30, height: 11, opacity: 0.7 }} />
                <T color={PAPER.gold} center style={{ fontSize: 6, lineHeight: 8, fontWeight: "800", letterSpacing: 0.6 }}>
                  OFFICIAL SEAL
                </T>
              </View>
            </View>

            <SignatureBlock image="/ceo-signature-stroke.png" imageStyle={{ width: 86, height: 34 }} lineWidth="96%">
              <T color={PAPER.navy} center style={{ fontSize: 8.5, lineHeight: 11.5, fontWeight: "700" }}>
                {CEO_NAME}
              </T>
              <T variant="label" color={PAPER.gold} center style={{ fontSize: 8, letterSpacing: 0.5, lineHeight: 11, marginTop: 1 }}>
                CEO, Fajr Academy
              </T>
            </SignatureBlock>
          </View>

          {/* Issue date: the certificate is dated the day it is viewed or downloaded */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <View style={{ width: 36, height: 1, backgroundColor: PAPER.gold }} />
            <T color={PAPER.faint} style={{ fontSize: 9.5, lineHeight: 13 }}>
              Date of Issue: <Text style={{ fontWeight: "600", color: PAPER.navy }}>{longDate(new Date())}</Text>
            </T>
            <View style={{ width: 36, height: 1, backgroundColor: PAPER.gold }} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Shown in place of the certificate until an admin approves it. The website blurs the certificate behind this
 * notice; here only the empty frame is drawn, so nothing of the locked certificate can be read.
 */
export function LockedCertificate() {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: 14, borderWidth: 4, borderColor: c.navy, padding: 3, backgroundColor: c.surface }}>
      <View style={{ borderRadius: 8, borderWidth: 1.5, borderColor: c.gold, backgroundColor: c.surfaceAlt, padding: 14 }}>
        <View style={{ backgroundColor: c.navy, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 26, alignItems: "center", gap: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}>
          <GradientCard gradient="gold" padding={0} style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
            <Icon name="lock" size={30} color={c.navy} />
          </GradientCard>

          <View style={{ alignItems: "center", gap: 4 }}>
            <T variant="h2" color="onDark" center>
              Certificate Locked
            </T>
            <T variant="label" color="gold" center>
              Admin Approval Required
            </T>
          </View>

          <T variant="small" color="onDark" center style={{ opacity: 0.88, lineHeight: 19 }}>
            This completion certificate is currently locked under administrative review. Once approved by Academy Management, the full certificate preview and PDF download will be automatically unlocked.
          </T>

          <View style={{ alignSelf: "stretch", alignItems: "center", gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}>
              <Icon name="clock" size={14} color={c.gold} />
              <T variant="caption" color="gold">
                Status: Pending Verification
              </T>
            </View>
            <T variant="caption" color="onDarkMuted" center>
              Contact administration or your course instructor to request approval.
            </T>
          </View>
        </View>
      </View>
    </View>
  );
}
