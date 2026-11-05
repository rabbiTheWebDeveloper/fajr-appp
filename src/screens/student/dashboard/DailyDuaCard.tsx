import React, { useState } from "react";
import { View } from "react-native";

import { copyText } from "@/lib/device";
import { DAILY_DUAS } from "@/lib/islamic-data";
import { useArabicSpeech } from "@/lib/speech";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Card, Divider, IconButton, IconChip, Row, T } from "@/ui";

/** `dayIndex` changes every day, so the du'a shown first is the du'a of the day. */
export default function DailyDuaCard({ dayIndex = 0 }: { dayIndex?: number }) {
  const { c } = useTheme();
  const total = DAILY_DUAS.length;
  const [currentIndex, setCurrentIndex] = useState(() => ((Math.floor(dayIndex) % total) + total) % total);
  const dua = DAILY_DUAS[currentIndex];
  const { speaking, toggle: toggleSpeech, stop: stopSpeech } = useArabicSpeech();

  // As on the website, moving to another du'a stops the one being read aloud
  const move = (by: number) => {
    stopSpeech();
    setCurrentIndex((index) => (index + by + total) % total);
  };

  const copy = () => void copyText(`${dua.title}\n\n${dua.arabic}\n\nTransliteration: ${dua.transliteration}\n\nTranslation: ${dua.english}\n\nReference: ${dua.source}`, "Du'a copied");

  return (
    <Card padding={14} style={{ gap: 12 }}>
      <Row gap={10} justify="space-between">
        <Row gap={10} style={{ flex: 1, minWidth: 0 }}>
          <IconChip mIcon="creation" tone="warning" size={38} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="title" numberOfLines={1}>
              Daily Masnoon Du'a
            </T>
            <T variant="small" color="muted" numberOfLines={1}>
              {dua.category} · #{currentIndex + 1} of {total}
            </T>
          </View>
        </Row>
        <Row gap={6}>
          <IconButton icon="chevron-left" accessibilityLabel="Previous Du'a" background={c.surfaceAlt} color={c.text} size={40} onPress={() => move(-1)} />
          <IconButton icon="chevron-right" accessibilityLabel="Next Du'a" background={c.surfaceAlt} color={c.text} size={40} onPress={() => move(1)} />
        </Row>
      </Row>

      <Divider />

      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: `${c.warning}40`, backgroundColor: c.warningSoft, padding: 14, gap: 10 }}>
        <Row gap={8} justify="space-between" align="flex-start">
          <Badge tone="warning" label={dua.title} style={{ flexShrink: 1 }} />
          <Row gap={6}>
            <IconButton icon={speaking ? "volume-x" : "volume-2"} accessibilityLabel={speaking ? "Stop reading the Du'a" : "Listen to the Du'a"} background={c.surface} color={c.warningText} size={40} onPress={() => toggleSpeech(dua.arabic)} />
            <IconButton icon="share-2" accessibilityLabel="Copy Du'a" background={c.surface} color={c.warningText} size={40} onPress={copy} />
          </Row>
        </Row>

        <T weight="700" style={{ fontSize: 22, lineHeight: 42, textAlign: "right", writingDirection: "rtl" }}>{dua.arabic}</T>

        <View style={{ borderTopWidth: 1, borderTopColor: `${c.warning}33`, paddingTop: 8, gap: 2 }}>
          <T variant="label" color="warning">
            Transliteration
          </T>
          <T variant="small" weight="600" style={{ fontStyle: "italic", lineHeight: 19 }}>
            “{dua.transliteration}”
          </T>
        </View>

        <View style={{ gap: 2 }}>
          <T variant="label" color="warning">
            Meaning
          </T>
          <T variant="small" weight="500" style={{ lineHeight: 19 }}>
            {dua.english}
          </T>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: `${c.warning}33`, paddingTop: 8, gap: 3 }}>
          <T variant="caption" color="warning">
            💡{" "}
            <T variant="caption" color="warning" weight="800">
              Virtue:
            </T>{" "}
            {dua.benefit}
          </T>
          <T variant="caption" color="warning" weight="700">
            Ref: {dua.source}
          </T>
        </View>
      </View>
    </Card>
  );
}
