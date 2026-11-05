import React, { useState } from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { darkPalette, radius, toneColors, type Tone } from "@/theme/palette";
import { Button, Card, GradientCard, Icon, MIcon, Row, T } from "@/ui";
import { TIMEFRAME_COPY, type Timeframe } from "@/screens/teacher/leaderboard/types";

/* The Bangla wording below is the website's own, kept as is. */

const GUIDE_TITLES: Record<Timeframe, string> = {
  today: "আজকের শিক্ষক লিডারবোর্ড পয়েন্ট নিয়ম (Today)",
  "7days": "বিগত ৭ দিনের শিক্ষক লিডারবোর্ড পয়েন্ট নিয়ম (Last 7 Days)",
  previousMonth: "পূর্ববর্তী মাসের সেরা শিক্ষক নির্ধারণের নিয়ম (Previous Month Best)",
};

const GUIDE_DESC: Record<Timeframe, string> = {
  today: "আজকের নির্ধারিত ক্লাসের সম্পন্ন করার হার, সক্রিয় ছাত্র-ছাত্রী ও রেটিংয়ের ভিত্তিতে প্রতিদিনের টপ ১০ শিক্ষক নির্বাচিত হন।",
  "7days": "গত ৭ দিনের নিয়মিত ক্লাস পরিচালনা, ছাত্র উপস্থিতি ও পারফরম্যান্স স্কোরের মাধ্যমে সাপ্তাহিক শীর্ষ ১০ তালিকা গঠিত হয়।",
  previousMonth: "বিগত সম্পূর্ণ মাসের চূড়ান্ত ক্লাস কমপ্লিশন ও সামগ্রিক মূল্যায়নের উপর ভিত্তি করে সেরা শিক্ষক পুরস্কার ও র‍্যাংক চূড়ান্ত করা হয়েছে।",
};

const GUIDE_PERIOD: Record<Timeframe, string> = {
  today: "আজকের পারফরম্যান্স",
  "7days": "গত ৭ দিনের পারফরম্যান্স",
  previousMonth: "পূর্ববর্তী মাসের হিসাব",
};

/** The three parts of the 100-point score, as the guide explains them */
const GUIDE_PARTS: { share: string; title: string; body: string; color: string }[] = [
  { share: "60%", title: "ক্লাস সম্পন্ন করা (৬০%)", body: "এই নির্দিষ্ট সময়ে বরাদ্দকৃত ক্লাসের কত শতাংশ সম্পন্ন (Completed) করেছেন।", color: darkPalette.violetText },
  { share: "25%", title: "সক্রিয় শিক্ষার্থী (২৫%)", body: "ক্লাসের মোট ইউনিক ছাত্র/ছাত্রীর সংখ্যা। প্রতি শিক্ষার্থী = ৩ পয়েন্ট (সর্বোচ্চ ২৫)।", color: darkPalette.warningText },
  { share: "15%", title: "শিক্ষার্থী রেটিং (১৫%)", body: "শিক্ষার্থীদের প্রদত্ত ফিডব্যাক রেটিং (Rating × ৩, ৫ স্টার রেটিং = ১৫ পয়েন্ট)।", color: darkPalette.successText },
];

const SCORE_COLOURS: { text: string; color: string }[] = [
  { text: "🟢 ৮৫ - ১০০ (অসামান্য)", color: darkPalette.successText },
  { text: "🟠 ৭০ - ৮৪ (ভালো)", color: darkPalette.warningText },
  { text: "🔵 ৫০ - ৬৯ (মাঝারি)", color: darkPalette.primaryText },
  { text: "🔴 ৫০ এর নিচে (উন্নতি প্রয়োজন)", color: darkPalette.dangerText },
];

const WELL = { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: radius.md, padding: 12 } as const;

/** "How are the points and rank worked out?": a short answer, opening to the full scoring guide */
export function BanglaGuide({ timeframe }: { timeframe: Timeframe }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <GradientCard gradient="navyDeep">
      <Row gap={12} align="flex-start">
        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }}>
          <MIcon name="help-circle-outline" size={22} color={c.gold} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <T variant="bodyStrong" color="onDark" style={{ lineHeight: 22 }}>
            লিডারবোর্ড পয়েন্ট ও র‍্যাংক কিভাবে হিসাব করা হয়?
          </T>
          <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 1, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(223,183,108,0.4)", backgroundColor: "rgba(223,183,108,0.16)" }}>
            <Text style={{ color: c.gold, fontSize: 10.5, lineHeight: 16 }}>গাইড ও নির্দেশিকা</Text>
          </View>
          <T variant="small" color="onDarkMuted" style={{ lineHeight: 19 }}>
            {GUIDE_DESC[timeframe]}
          </T>
        </View>
      </Row>

      <Button title={open ? "বন্ধ করুন" : "হিসাব দেখুন"} iconRight={open ? "chevron-up" : "chevron-down"} size="sm" onPress={() => setOpen((v) => !v)} style={{ marginTop: 12 }} />

      {open ? (
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.14)", gap: 10 }}>
          <View style={{ gap: 2 }}>
            <T variant="bodyStrong" color={darkPalette.warningText} style={{ lineHeight: 22 }}>
              👨‍🏫 {GUIDE_TITLES[timeframe]} (মোট ১০০ পয়েন্ট)
            </T>
            <T variant="caption" color="onDarkMuted" style={{ lineHeight: 17 }}>
              {GUIDE_PERIOD[timeframe]}
            </T>
          </View>

          {GUIDE_PARTS.map((part, index) => (
            <View key={part.share} style={[WELL, { gap: 6 }]}>
              <Row gap={8}>
                <View style={{ paddingHorizontal: 6, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" }}>
                  <Text style={{ color: part.color, fontSize: 11, fontWeight: "900" }}>{part.share}</Text>
                </View>
                <T variant="smallStrong" color={part.color} style={{ flex: 1, lineHeight: 19 }}>
                  {part.title}
                </T>
              </Row>
              <T variant="small" color="onDarkMuted" style={{ lineHeight: 19 }}>
                {part.body}
              </T>
              {index === 0 ? (
                <T variant="caption" color={darkPalette.warningText} style={{ lineHeight: 17, paddingTop: 6, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
                  💡 ৯০%+ সম্পন্ন করলে অতিরিক্ত <T variant="caption" color={darkPalette.warningText} weight="800" style={{ lineHeight: 17 }}>+৫ পয়েন্ট বোনাস</T>!
                </T>
              ) : null}
            </View>
          ))}

          <View style={[WELL, { gap: 6 }]}>
            <T variant="smallStrong" color="onDarkMuted" style={{ lineHeight: 19 }}>
              স্কোর নির্দেশক কালার:
            </T>
            <Row gap={12} wrap>
              {SCORE_COLOURS.map((item) => (
                <T key={item.text} variant="caption" color={item.color} weight="700" style={{ lineHeight: 17 }}>
                  {item.text}
                </T>
              ))}
            </Row>
          </View>
        </View>
      ) : null}
    </GradientCard>
  );
}

const LEGEND_PARTS: { title: string; body: string; tone: Tone }[] = [
  { title: "৬০% — ক্লাস কমপ্লিশন (Completion Rate)", body: "বরাদ্দকৃত ক্লাসের মধ্যে সম্পন্নকৃত ক্লাসের শতাংশ। (৯০%+ সম্পন্ন করলে +৫ বোনাস পয়েন্ট)", tone: "violet" },
  { title: "২৫% — শিক্ষার্থী সংখ্যা (Student Count)", body: "ক্লাসের মোট ইউনিক শিক্ষার্থী সংখ্যা (প্রতি শিক্ষার্থী = ৩ পয়েন্ট, সর্বোচ্চ ২৫ পয়েন্ট)।", tone: "warning" },
  { title: "১৫% — শিক্ষার্থী রেটিং (Student Rating)", body: "শিক্ষার্থীদের প্রদত্ত গড় স্টার রেটিং (Rating × ৩, যেমন ৫ স্টার = ১৫ পয়েন্ট)।", tone: "success" },
];

/** The score formula under the rankings */
export function ScoreLegend({ timeframe }: { timeframe: Timeframe }) {
  const { c } = useTheme();
  return (
    <Card>
      <Row gap={8} align="flex-start" style={{ marginBottom: 12 }}>
        <Icon name="zap" size={16} color={c.primary} style={{ marginTop: 3 }} />
        <T variant="bodyStrong" style={{ flex: 1, lineHeight: 22 }}>
          শিক্ষক পয়েন্ট হিসাবের নিয়মাবলী ({TIMEFRAME_COPY[timeframe].formula})
        </T>
      </Row>
      <View style={{ gap: 10 }}>
        {LEGEND_PARTS.map((part) => {
          const tone = toneColors(c, part.tone);
          return (
            <View key={part.title} style={{ backgroundColor: tone.bg, borderRadius: radius.md, padding: 12, gap: 4 }}>
              <T variant="smallStrong" color={tone.fg} style={{ lineHeight: 19 }}>
                {part.title}
              </T>
              <T variant="small" color="muted" style={{ lineHeight: 19 }}>
                {part.body}
              </T>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
