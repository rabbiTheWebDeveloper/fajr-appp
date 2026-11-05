import React, { useMemo, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";

import { errorMessage } from "@/api/client";
import { tapFeedback } from "@/lib/device";
import { printHtml, shareHtmlAsPdf } from "@/lib/files";
import { IdCardBack, IdCardFront } from "@/screens/student/settings/IdCard";
import { CARD_WIDTH, idCardFileName, idCardHtml, idCardModel, type CardSide } from "@/screens/student/settings/id-card";
import type { StudentRecord } from "@/screens/student/settings/types";
import { useTheme } from "@/theme/ThemeContext";
import { Button, Card, Divider, T, toast } from "@/ui";

type Job = "front" | "back" | "print";

/** "Official Student ID Card": the digital pass on screen, with flip, download (as a PDF to save or share) and print */
export function IdCardTab({ profile }: { profile: StudentRecord }) {
  const { c } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [side, setSide] = useState<CardSide>("front");
  const [busy, setBusy] = useState<Job | null>(null);

  const model = useMemo(() => idCardModel(profile), [profile]);
  // The design is 320 wide; on a narrower phone the whole card scales down with it (page padding 16, card padding 12 and border 1)
  const cardWidth = Math.min(CARD_WIDTH, windowWidth - 2 * 16 - 2 * 12 - 2);

  const flip = () => {
    tapFeedback();
    setSide((current) => (current === "front" ? "back" : "front"));
  };

  const run = async (job: Job) => {
    if (busy) return;
    setBusy(job);
    try {
      if (job === "print") await printHtml(idCardHtml(model, ["front", "back"]));
      else await shareHtmlAsPdf(idCardHtml(model, [job]), idCardFileName(model, job));
    } catch (e) {
      toast.error(errorMessage(e, job === "print" ? "Failed to print ID card. Please try again." : "Failed to download ID card. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={{ gap: 14 }} padding={12}>
      <View style={{ paddingHorizontal: 4, paddingTop: 4 }}>
        <T variant="title">Official Student Digital Pass</T>
        <T variant="small" color="muted">
          Official verified ID card for academy identification & records
        </T>
      </View>
      <Divider />

      {/* The presentation stage is dark in both themes so the card reads as an object */}
      <View style={{ alignItems: "center", paddingVertical: 20, borderRadius: 20, backgroundColor: c.navyDeep, gap: 14 }}>
        <Pressable onPress={flip} accessibilityRole="button" accessibilityHint="Flips the card over">
          {side === "front" ? <IdCardFront model={model} width={cardWidth} /> : <IdCardBack width={cardWidth} />}
        </Pressable>
        <T variant="small" color="onDarkMuted" center style={{ paddingHorizontal: 12 }}>
          Showing:{" "}
          <T variant="smallStrong" color="onDark">
            {side.toUpperCase()} SIDE
          </T>
          {" · Tap the card or \"Flip\" to toggle sides"}
        </T>
      </View>

      <View style={{ gap: 10 }}>
        <Button title={`Flip to ${side === "front" ? "Back" : "Front"}`} icon="refresh-cw" variant="secondary" block onPress={flip} />
        <Button title="Download Front (PDF)" icon="download" block loading={busy === "front"} disabled={busy !== null} onPress={() => void run("front")} />
        <Button title="Download Back (PDF)" icon="download" variant="navy" block loading={busy === "back"} disabled={busy !== null} onPress={() => void run("back")} />
        <Button title="Print ID Pass" icon="printer" variant="success" block loading={busy === "print"} disabled={busy !== null} onPress={() => void run("print")} />
        <T variant="caption" color="faint" center>
          Download opens the share sheet with a PDF of that side, to save on your phone or send.
        </T>
      </View>
    </Card>
  );
}
