import React, { useEffect, useState } from "react";
import { Image, Text, View, type TextStyle } from "react-native";

import {
  CARD_BACKGROUND,
  CARD_BACK_IMAGE,
  CARD_DETAILS_TOP,
  CARD_FRONT_TEMPLATE,
  CARD_HEIGHT,
  CARD_PHOTO_BACKGROUND,
  CARD_PHOTO_HEIGHT,
  CARD_PHOTO_ICON,
  CARD_RADIUS,
  CARD_WIDTH,
  type IdCardModel,
} from "@/screens/student/settings/id-card";
import { Icon } from "@/ui";

/**
 * The portrait fills its box and keeps the top of the picture (the face) in view, like the website's
 * `object-cover object-top`. React Native can only centre a cropped image, so once the picture's real
 * size is known it is laid out by hand.
 */
function Portrait({ uri, width, height }: { uri: string; width: number; height: number }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setNatural(null);
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return (
      <View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
        <Icon name="user" size={Math.round(height * 0.42)} color={CARD_PHOTO_ICON} />
      </View>
    );
  }

  const scale = natural ? Math.max(width / natural.w, height / natural.h) : 0;
  return (
    <Image
      source={{ uri }}
      accessibilityLabel="Student photo"
      resizeMode="cover"
      onError={() => setFailed(true)}
      onLoad={(event) => {
        const { width: w, height: h } = event.nativeEvent.source;
        if (w > 0 && h > 0) setNatural((current) => (current && current.w === w && current.h === h ? current : { w, h }));
      }}
      style={natural ? { position: "absolute", top: 0, left: (width - natural.w * scale) / 2, width: natural.w * scale, height: natural.h * scale } : { width, height }}
    />
  );
}

/** Front of the official student ID card, drawn at any width (the design is 320 wide) */
export function IdCardFront({ model, width }: { model: IdCardModel; width: number }) {
  const k = width / CARD_WIDTH;
  const white: TextStyle = { color: "#ffffff", textAlign: "center", fontWeight: "700" };

  return (
    <View accessibilityLabel={`Student ID card, front. ${model.fullName}. ID ${model.studentId}.`} style={{ width, height: CARD_HEIGHT * k, borderRadius: CARD_RADIUS * k, overflow: "hidden", backgroundColor: CARD_BACKGROUND }}>
      <Image source={{ uri: CARD_FRONT_TEMPLATE }} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, width, height: CARD_HEIGHT * k }} />

      <View style={{ position: "absolute", top: 0, left: 0, width, height: CARD_PHOTO_HEIGHT * k, overflow: "hidden", backgroundColor: CARD_PHOTO_BACKGROUND }}>
        <Portrait uri={model.photoUrl} width={width} height={CARD_PHOTO_HEIGHT * k} />
      </View>

      <View style={{ position: "absolute", top: CARD_DETAILS_TOP * k, left: 0, right: 0, bottom: 0, paddingHorizontal: 24 * k, alignItems: "center" }}>
        <Text
          allowFontScaling={false}
          numberOfLines={2}
          style={[white, { fontSize: 21 * k, lineHeight: 26 * k, fontWeight: "900", letterSpacing: 0.5 * k, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.25)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }]}
        >
          {model.fullName}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} style={[white, { fontSize: 12 * k, lineHeight: 16 * k, letterSpacing: 1.2 * k, textTransform: "uppercase", marginTop: 12 * k }]}>
          {model.designation}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} style={[white, { fontSize: 14 * k, lineHeight: 20 * k, letterSpacing: 0.7 * k, marginTop: 16 * k }]}>
          ID: {model.studentId}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} style={[white, { fontSize: 14 * k, lineHeight: 20 * k, letterSpacing: 0.7 * k, marginTop: 4 * k }]}>
          {model.extraInfo}
        </Text>
      </View>
    </View>
  );
}

/** Back of the card: the academy's printed back (return address, contact, QR code and validity) as one image */
export function IdCardBack({ width }: { width: number }) {
  const k = width / CARD_WIDTH;
  return (
    <View style={{ width, height: CARD_HEIGHT * k, borderRadius: CARD_RADIUS * k, overflow: "hidden", backgroundColor: CARD_BACKGROUND }}>
      <Image
        source={{ uri: CARD_BACK_IMAGE }}
        resizeMode="cover"
        accessibilityLabel="Student ID card, back: the academy's address, emergency contact and validity date"
        style={{ width, height: CARD_HEIGHT * k }}
      />
    </View>
  );
}
