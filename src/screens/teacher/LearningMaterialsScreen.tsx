import React from "react";
import { View } from "react-native";

import { openExternal } from "@/lib/device";
import { useTheme } from "@/theme/ThemeContext";
import { toneColors, type Tone } from "@/theme/palette";
import { Badge, Banner, Button, Card, Icon, Row, Screen, T, type IconName } from "@/ui";

// The academy's shared folder with every course resource
const DRIVE_LINK = "https://drive.google.com/drive/folders/15fPg2qct0QVO6LP4bE_SsTb6RzWMy3CJ?usp=sharing";

const HIGHLIGHTS: { icon: IconName; label: string; tone: Tone }[] = [
  { icon: "file-text", label: "Course PDFs", tone: "danger" },
  { icon: "play", label: "Video Lessons", tone: "violet" },
  { icon: "star", label: "Study Guides", tone: "warning" },
  { icon: "users", label: "Shared Resources", tone: "success" },
];

const TIPS = [
  "Make sure you are signed into your Fajr Academy Google account before opening.",
  "Use the Google Drive app on mobile for the best offline access experience.",
  "Contact your supervisor if you do not have permission to view a file.",
];

/** Learning materials: the way into the academy's shared Google Drive folder of PDFs, videos and study guides */
export default function TeacherLearningMaterialsScreen() {
  const { c } = useTheme();
  const openMaterials = () => void openExternal(DRIVE_LINK);

  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <T color="muted">Access all course resources, PDFs, and study materials shared by Fajr Academy.</T>
        <Badge label="Fajr Academy Resources" icon="bookmark" tone="primary" />
      </View>

      <View style={{ gap: 10 }}>
        {[HIGHLIGHTS.slice(0, 2), HIGHLIGHTS.slice(2)].map((pair, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap: 10 }}>
            {pair.map(({ icon, label, tone }) => {
              const t = toneColors(c, tone);
              return (
                <View key={label} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: t.bg }}>
                  <Icon name={icon} size={16} color={t.fg} />
                  <T variant="smallStrong" style={{ flex: 1 }}>
                    {label}
                  </T>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <Card padding={0} style={{ overflow: "hidden" }}>
        <View style={{ height: 4, backgroundColor: c.primary }} />

        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
            <Icon name="bookmark" size={30} color="#ffffff" />
          </View>
          <View style={{ gap: 6 }}>
            <T variant="h2" accessibilityRole="header">
              Fajr Academy — Learning Hub
            </T>
            <T color="muted" style={{ lineHeight: 21 }}>
              All your course materials, lecture notes, reference PDFs, and supplementary resources are stored in our shared Google Drive folder. Click the button below to access them.
            </T>
            <Row gap={6} style={{ marginTop: 2 }}>
              <Icon name="clock" size={13} color={c.textFaint} />
              <T variant="small" color="faint" style={{ flex: 1 }}>
                Updated regularly by Fajr Academy management
              </T>
            </Row>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 20 }} />

        <View style={{ padding: 20, gap: 14 }}>
          <T variant="mono" color="faint" selectable style={{ fontWeight: "400" }}>
            {DRIVE_LINK}
          </T>
          <Button title="Open Materials" iconRight="external-link" size="lg" block onPress={openMaterials} />
        </View>
      </Card>

      <Banner tone="warning" icon="info" title="💡 Tips for accessing materials">
        <View style={{ gap: 6 }}>
          {TIPS.map((tip) => (
            <Row key={tip} gap={8} align="flex-start">
              <T variant="small" color="warning">
                •
              </T>
              <T variant="small" color="warning" style={{ flex: 1, lineHeight: 18 }}>
                {tip}
              </T>
            </Row>
          ))}
        </View>
      </Banner>
    </Screen>
  );
}
