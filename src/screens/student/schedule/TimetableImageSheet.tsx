import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import Svg, { Circle, G, Rect, TSpan, Text as SvgText } from "react-native-svg";

import { errorMessage } from "@/api/client";
import { DAYS, DAY_SHORT, hasClassOn, timeText, timesOn, type ScheduleDoc } from "@/screens/student/schedule/schedule-utils";
import { Banner, Button, Sheet, T } from "@/ui";

// The picture is a document, like the PDF: it keeps the website's timetable colours in light and dark mode
const INK = { navy: "#0d1b3e", navyHead: "#142258", blue: "#2563eb", blueDeep: "#1e3a8a", sky: "#93c5fd", line: "#bfdbfe", tint: "#eff6ff", muted: "#8a93a8", faint: "#b6bcc9", paper: "#ffffff" } as const;

// Drawing units: the website snapshots its timetable at 1024 wide
const WIDTH = 1024;
const PAD = 24;
const GRID_TOP = 86;
const HEAD_HEIGHT = 40;
const CELL_HEIGHT = 176;
const HEIGHT = GRID_TOP + HEAD_HEIGHT + CELL_HEIGHT + PAD;
const COLUMN = (WIDTH - PAD * 2) / DAYS.length;

const PREVIEW_WIDTH = 760;
const EXPORT_WIDTH = 2048;

/** Keeps a long name inside its box (the drawing cannot measure text, so the limit is by length) */
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

interface TimetableImageSheetProps {
  visible: boolean;
  onClose: () => void;
  schedule: ScheduleDoc;
}

/**
 * "Save Image": the weekly timetable drawn as a picture (the same seven-column grid as the PDF), previewed here
 * and then handed to the phone's share sheet as a PNG to save to the gallery or send.
 */
export default function TimetableImageSheet({ visible, onClose, schedule }: TimetableImageSheetProps) {
  const svgRef = useRef<Svg>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (giveUp.current) clearTimeout(giveUp.current);
    },
    []
  );

  const course = clip(schedule.course?.title || "Class", 40);
  const teacher = clip(schedule.teacher?.fullName || "Teacher", 30);

  const saveImage = () => {
    const svg = svgRef.current;
    if (!svg || saving) return;
    setSaving(true);
    setProblem("");

    let settled = false;
    // The drawing layer answers through a callback; if it never does, say so instead of spinning for ever
    giveUp.current = setTimeout(() => {
      if (settled) return;
      settled = true;
      setSaving(false);
      setProblem("The picture could not be created on this phone. Please use Export PDF instead.");
    }, 10_000);

    svg.toDataURL(
      (base64) => {
        if (settled) return;
        settled = true;
        if (giveUp.current) clearTimeout(giveUp.current);
        void (async () => {
          try {
            const file = new File(Paths.cache, "my-schedule.png");
            file.create({ overwrite: true });
            await file.write(base64.replace(/\s+/g, ""), { encoding: "base64" });
            if (!(await Sharing.isAvailableAsync())) throw new Error("This phone cannot share or save files from the app.");
            await Sharing.shareAsync(file.uri, { mimeType: "image/png", dialogTitle: "My schedule" });
          } catch (e) {
            setProblem(errorMessage(e, "Could not save the picture. Please try again."));
          } finally {
            setSaving(false);
          }
        })();
      },
      { width: EXPORT_WIDTH, height: Math.round((EXPORT_WIDTH * HEIGHT) / WIDTH) }
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Save Image"
      subtitle="Your weekly timetable as a picture"
      footer={<Button title={saving ? "Preparing…" : "Save or share image"} icon="image" block loading={saving} onPress={saveImage} />}
    >
      {problem ? <Banner tone="danger" message={problem} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderRadius: 12, borderWidth: 1, borderColor: INK.line, backgroundColor: INK.paper }}>
        <View collapsable={false}>
          <Svg ref={svgRef} width={PREVIEW_WIDTH} height={(PREVIEW_WIDTH * HEIGHT) / WIDTH} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            <Rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={INK.paper} />
            <SvgText x={PAD} y={46} fontSize={22} fontWeight="bold" fill={INK.navy}>
              Weekly Class Timetable
            </SvgText>
            <SvgText x={PAD} y={66} fontSize={12} fill={INK.muted}>
              Fajr Academy Student Portal
            </SvgText>

            {DAYS.map((day, index) => {
              const x = PAD + index * COLUMN;
              const top = GRID_TOP + HEAD_HEIGHT;
              const hasClass = hasClassOn(schedule, day);
              return (
                <G key={day}>
                  <Rect x={x} y={GRID_TOP} width={COLUMN} height={HEAD_HEIGHT} fill={index % 2 === 0 ? INK.navy : INK.navyHead} />
                  <SvgText x={x + COLUMN / 2} y={GRID_TOP + 25} fontSize={12} fontWeight="bold" fill={INK.sky} textAnchor="middle">
                    {DAY_SHORT[day].toUpperCase()}
                  </SvgText>

                  <Rect x={x} y={top} width={COLUMN} height={CELL_HEIGHT} fill={hasClass ? INK.tint : INK.paper} stroke={INK.line} strokeWidth={1} />
                  {hasClass ? (
                    <G>
                      <Rect x={x + 9} y={top + 9} width={COLUMN - 18} height={CELL_HEIGHT - 18} rx={10} fill={INK.paper} stroke={INK.line} strokeWidth={1} />
                      <Rect x={x + 20} y={top + 21} width={COLUMN - 40} height={4} rx={2} fill={INK.blue} />
                      {/* inlineSize wraps the text and lets the phone shape Bengali and Arabic names properly */}
                      <SvgText fontSize={12.5} fontWeight="bold" fill={INK.navy}>
                        <TSpan x={x + 20} y={top + 46} inlineSize={COLUMN - 40}>
                          {course}
                        </TSpan>
                      </SvgText>
                      <Circle cx={x + 23} cy={top + 104} r={3} fill={INK.blue} />
                      <SvgText x={x + 32} y={top + 108} fontSize={10.5} fontWeight="bold" fill={INK.blueDeep}>
                        {timeText(timesOn(schedule, day).start)}
                      </SvgText>
                      <Circle cx={x + 23} cy={top + 122} r={3} fill={INK.blue} />
                      <SvgText fontSize={10.5} fontWeight="bold" fill={INK.blueDeep}>
                        <TSpan x={x + 32} y={top + 126} inlineSize={COLUMN - 52}>
                          {teacher}
                        </TSpan>
                      </SvgText>
                      <Circle cx={x + 23} cy={top + 154} r={3} fill={INK.blue} />
                      <SvgText x={x + 32} y={top + 158} fontSize={10.5} fill={INK.blueDeep}>
                        Online
                      </SvgText>
                    </G>
                  ) : (
                    <SvgText x={x + COLUMN / 2} y={top + CELL_HEIGHT / 2 + 4} fontSize={11} fill={INK.faint} textAnchor="middle">
                      Free
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
        </View>
      </ScrollView>

      <T variant="small" color="muted">
        Swipe sideways to see the whole week. The saved picture is sharper than this preview.
      </T>
    </Sheet>
  );
}
