import React, { useState } from "react";
import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";

import { openWhatsApp, tapFeedback } from "@/lib/device";
import { shareHtmlAsPdf } from "@/lib/files";
import { darkPalette } from "@/theme/palette";
import { useTheme } from "@/theme/ThemeContext";
import { Button, GradientCard, Icon, Row, Segmented, Sheet, T, toast } from "@/ui";

import { CARD_BACKGROUND, CARD_BACK_URL, CARD_HEIGHT, CARD_TEMPLATE_URL, CARD_WIDTH, idCardFields, idCardFileName, idCardHtml, type CardSide } from "@/screens/teacher/settings/id-card";
import { OnDarkPill } from "@/screens/teacher/settings/parts";
import type { TeacherProfileData } from "@/screens/teacher/settings/types";

const SIDE_OPTIONS: { value: CardSide; label: string }[] = [
  { value: "front", label: "Front Side" },
  { value: "back", label: "Back Side" },
];

/** The portrait takes the top 250 of the card's 520 */
const PORTRAIT_HEIGHT = 250;
/** The locked card of a rejected request: deep red into slate, as on the website */
const REJECTED_GRADIENT = ["#4c0519", "#0f172a"] as const;

const SUPPORT_WHATSAPP = "8801410764581";
const APPROVAL_REQUEST = "Hello Fajr Academy Support, I would like to request Teacher ID Card approval.";

/** Tab: the official teacher ID card once an admin approved it, and the locked notice until then */
export function IdCardTab({ profile }: { profile: TeacherProfileData | null }) {
  const { width: windowWidth } = useWindowDimensions();
  const [side, setSide] = useState<CardSide>("front");
  const [showFull, setShowFull] = useState(false);
  const [exporting, setExporting] = useState<CardSide | null>(null);

  const status = profile?.idCardStatus;
  const rejected = status === "rejected";

  /** The website saves a PNG of the card; the app shares the same card as a PDF */
  const share = async (which: CardSide) => {
    setExporting(which);
    try {
      await shareHtmlAsPdf(idCardHtml(profile, which), idCardFileName(profile, which));
    } catch {
      toast.error("Could not prepare the ID card. Please try again.");
    } finally {
      setExporting(null);
    }
  };

  const flip = () => {
    tapFeedback();
    setSide((current) => (current === "front" ? "back" : "front"));
  };

  if (status !== "approved") {
    return (
      <GradientCard gradient={rejected ? REJECTED_GRADIENT : "navy"} style={{ gap: 14 }}>
        <OnDarkPill
          label={rejected ? "ID CARD VERIFICATION REJECTED" : "ID CARD VERIFICATION PENDING ADMIN REVIEW"}
          tone={rejected ? "danger" : "warning"}
          icon={rejected ? "alert-circle" : "lock"}
        />
        <T variant="h1" color="onDark">
          {rejected ? "Digital ID Card Approval Required" : "Digital ID Card is Locked"}
        </T>
        <T color="onDarkMuted">
          {rejected
            ? "Your ID card approval request was not approved. Please ensure your photo, designation, and verification documents are up to date, or reach out to administration."
            : "Your official Digital Teacher ID Card is currently under verification. Once approved by an administrator, your full card preview and download will be unlocked automatically."}
        </T>
        <Button title="Request Approval via WhatsApp Support" variant="success" block onPress={() => void openWhatsApp(SUPPORT_WHATSAPP, APPROVAL_REQUEST)} />

        <View style={{ alignItems: "center", gap: 6, padding: 20, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 4 }}>
            <Icon name="lock" size={30} color={rejected ? darkPalette.dangerText : darkPalette.warningText} />
          </View>
          <T variant="label" color="onDark" center>
            {rejected ? "Approval Rejected" : "Approval Required"}
          </T>
          <T variant="caption" color="onDarkMuted" center>
            Admin must verify your profile credentials before download.
          </T>
        </View>
      </GradientCard>
    );
  }

  // The card keeps the website's 320 x 520 shape and shrinks only when the phone is narrower than that
  const cardWidth = Math.min(CARD_WIDTH, windowWidth - 64);
  const fullWidth = Math.min(CARD_WIDTH, windowWidth - 48);

  return (
    <>
      <GradientCard gradient="navy" style={{ gap: 14 }}>
        <OnDarkPill label="VERIFIED OFFICIAL DIGITAL ID CARD" tone="success" icon="check-circle" />
        <T variant="h1" color="onDark">
          Your Official Fajr Academy ID Card
        </T>
        <T color="onDarkMuted">
          Formatted dynamically with your portrait, full name, designation, teacher ID, and blood group. You can preview both Front & Back sides or download print-ready files.
        </T>

        <Segmented value={side} onChange={setSide} options={SIDE_OPTIONS} />

        <Pressable onPress={flip} accessibilityRole="button" accessibilityLabel={`ID card, ${side} side. Tap to flip`} style={{ alignSelf: "center" }}>
          <IdCardView profile={profile} side={side} width={cardWidth} />
        </Pressable>
        <T variant="caption" color="onDarkMuted" center>
          Tap the card to flip side
        </T>

        <Row gap={10}>
          <Button title="Fullscreen View" icon="eye" variant="gold" style={{ flex: 1 }} block onPress={() => setShowFull(true)} />
          <Button
            title={exporting === side ? "Exporting..." : `Download ${side === "front" ? "Front" : "Back"}`}
            icon="download"
            style={{ flex: 1 }}
            block
            loading={exporting === side}
            disabled={exporting !== null}
            onPress={() => void share(side)}
          />
        </Row>
      </GradientCard>

      <Sheet
        visible={showFull}
        onClose={() => setShowFull(false)}
        title="Official Teacher ID Card"
        subtitle="Fajr Academy Verified Identity Card"
        full
        footer={
          <>
            <Row gap={10}>
              <Button title="Download Front" icon="download" style={{ flex: 1 }} block loading={exporting === "front"} disabled={exporting !== null} onPress={() => void share("front")} />
              <Button title="Download Back" icon="download" variant="navy" style={{ flex: 1 }} block loading={exporting === "back"} disabled={exporting !== null} onPress={() => void share("back")} />
            </Row>
            <Button title="Done" variant="secondary" block onPress={() => setShowFull(false)} />
          </>
        }
      >
        <Segmented value={side} onChange={setSide} options={SIDE_OPTIONS} />
        <Pressable onPress={flip} accessibilityRole="button" accessibilityLabel={`ID card, ${side} side. Tap to flip`} style={{ alignSelf: "center" }}>
          <IdCardView profile={profile} side={side} width={fullWidth} />
        </Pressable>
      </Sheet>
    </>
  );
}

/** The card itself, drawn natively over the website's template artwork. `width` scales every measure. */
function IdCardView({ profile, side, width }: { profile: TeacherProfileData | null; side: CardSide; width: number }) {
  const k = width / CARD_WIDTH;
  const fields = idCardFields(profile);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoAspect, setPhotoAspect] = useState<number | null>(null);
  const frame = { width, height: CARD_HEIGHT * k, borderRadius: 24 * k, overflow: "hidden", backgroundColor: CARD_BACKGROUND } as const;
  const line = { color: "#ffffff", fontWeight: "700", textAlign: "center", textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 } as const;

  if (side === "back") {
    return (
      <View style={frame}>
        <Image source={{ uri: CARD_BACK_URL }} resizeMode="cover" accessibilityLabel="ID Card Back Part" style={{ width: "100%", height: "100%" }} />
      </View>
    );
  }

  return (
    <View style={frame}>
      <Image source={{ uri: CARD_TEMPLATE_URL }} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />

      {/* Portrait: fills the top of the card, cropped from the top like the website's */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: PORTRAIT_HEIGHT * k, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" }}>
        {fields.photoUrl && !photoFailed ? (
          <Image
            source={{ uri: fields.photoUrl }}
            onError={() => setPhotoFailed(true)}
            onLoad={(event) => {
              const { width: w, height: h } = event.nativeEvent.source;
              if (w > 0 && h > 0) setPhotoAspect(w / h);
            }}
            resizeMode="cover"
            accessibilityLabel={fields.fullName}
            // A photo taller than the frame is pinned to its top edge so the face is not cropped away
            style={photoAspect !== null && photoAspect < CARD_WIDTH / PORTRAIT_HEIGHT ? { position: "absolute", top: 0, left: 0, width: "100%", aspectRatio: photoAspect } : { width: "100%", height: "100%" }}
          />
        ) : (
          <Icon name="user" size={112 * k} color="#94a3b8" />
        )}
      </View>

      <View style={{ position: "absolute", top: 258 * k, left: 0, right: 0, bottom: 0, paddingHorizontal: 16 * k, alignItems: "center" }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={[line, { fontWeight: "900", fontSize: fields.nameSize * k, letterSpacing: 0.4 * k, alignSelf: "stretch" }]}>
          {fields.fullName}
        </Text>
        <Text numberOfLines={1} style={[line, { fontSize: 13 * k, letterSpacing: 1.3 * k, marginTop: 12 * k, alignSelf: "stretch" }]}>
          {fields.designation}
        </Text>
        <Text style={[line, { fontSize: 14.5 * k, letterSpacing: 0.7 * k, marginTop: 16 * k }]}>ID: {fields.idNumber}</Text>
        <Text style={[line, { fontSize: 14.5 * k, letterSpacing: 0.7 * k, marginTop: 4 * k }]}>Blood Group: {fields.bloodGroup}</Text>
      </View>
    </View>
  );
}
