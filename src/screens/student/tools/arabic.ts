import type { TextStyle } from "react-native";

/** Arabic reads right to left, and its vowel marks need tall lines or they get clipped */
export const arabicText: TextStyle = {
  writingDirection: "rtl",
  textAlign: "right",
  fontSize: 24,
  lineHeight: 46,
  fontWeight: "700",
};
