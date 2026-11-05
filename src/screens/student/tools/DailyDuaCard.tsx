import React, { useState } from "react";
import { Share, Text, View } from "react-native";

import { copyText, tapFeedback } from "@/lib/device";
import { DAILY_DUAS, type DuaItem } from "@/lib/islamic-data";
import { useArabicSpeech } from "@/lib/speech";
import { arabicText } from "@/screens/student/tools/arabic";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Button, Card, Divider, IconButton, IconChip, Row, T, toast } from "@/ui";

/** The text the website copies to the clipboard, also used for sharing */
function duaAsText(dua: DuaItem): string {
  return `${dua.title}\n\n${dua.arabic}\n\nTransliteration: ${dua.transliteration}\n\nTranslation: ${dua.english}\n\nReference: ${dua.source}`;
}

/** `dayIndex` changes every day, so the du'a shown first is the du'a of the day (the first one when it is not given). */
export default function DailyDuaCard({ dayIndex = 0 }: { dayIndex?: number }) {
  const { c } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(() => ((Math.floor(dayIndex) % DAILY_DUAS.length) + DAILY_DUAS.length) % DAILY_DUAS.length);

  const currentDua: DuaItem = DAILY_DUAS[currentIndex];

  const { speaking, toggle: toggleSpeech, stop: stopSpeech } = useArabicSpeech();

  const step = (by: number) => {
    tapFeedback();
    // As on the website, moving to another du'a stops the one being read aloud
    stopSpeech();
    setCurrentIndex((prev) => (prev + by + DAILY_DUAS.length) % DAILY_DUAS.length);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: duaAsText(currentDua) });
    } catch {
      toast.error("Could not open sharing on this phone.");
    }
  };

  return (
    <Card>
      <View style={{ gap: 14 }}>
        <Row gap={10}>
          <IconChip icon="star" tone="warning" />
          <View style={{ flex: 1 }}>
            <T variant="title">Daily Masnoon Du'a</T>
            <T variant="small" color="muted" numberOfLines={1}>
              {currentDua.category} · #{currentIndex + 1} of {DAILY_DUAS.length}
            </T>
          </View>
          <IconButton icon="chevron-left" onPress={() => step(-1)} size={40} color={c.text} background={c.surfaceAlt} accessibilityLabel="Previous Du'a" />
          <IconButton icon="chevron-right" onPress={() => step(1)} size={40} color={c.text} background={c.surfaceAlt} accessibilityLabel="Next Du'a" />
        </Row>

        <Divider />

        {/* Main du'a body */}
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: c.warningSoft, borderWidth: 1, borderColor: `${c.warning}55`, gap: 12 }}>
          <Badge label={currentDua.title} tone="warning" style={{ maxWidth: "100%", backgroundColor: `${c.warning}26` }} />

          <Text selectable style={[arabicText, { color: c.text }]}>
            {currentDua.arabic}
          </Text>

          <View style={{ gap: 2, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${c.warning}40` }}>
            <T variant="label" color="warning">
              Transliteration
            </T>
            <T variant="bodyStrong" color="muted" style={{ fontStyle: "italic" }} selectable>
              “{currentDua.transliteration}”
            </T>
          </View>

          <View style={{ gap: 2 }}>
            <T variant="label" color="warning">
              Meaning
            </T>
            <T selectable>{currentDua.english}</T>
          </View>

          <View style={{ gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${c.warning}40` }}>
            <T variant="small" color="warning">
              💡 <T variant="smallStrong" color="warning">Virtue:</T> {currentDua.benefit}
            </T>
            <T variant="smallStrong" color="warning">
              Ref: {currentDua.source}
            </T>
          </View>
        </View>

        <Row gap={10}>
          <Button title={speaking ? "Stop" : "Listen"} icon={speaking ? "volume-x" : "volume-2"} variant="secondary" onPress={() => toggleSpeech(currentDua.arabic)} accessibilityLabel={speaking ? "Stop reading the Du'a" : "Listen to the Du'a"} style={{ flex: 1 }} />
          <Button title="Copy" icon="copy" variant="secondary" onPress={() => void copyText(duaAsText(currentDua), "Du'a copied")} accessibilityLabel="Copy Du'a" style={{ flex: 1 }} />
          <Button title="Share" icon="share-2" variant="secondary" onPress={() => void handleShare()} accessibilityLabel="Share Du'a" style={{ flex: 1 }} />
        </Row>
      </View>
    </Card>
  );
}
