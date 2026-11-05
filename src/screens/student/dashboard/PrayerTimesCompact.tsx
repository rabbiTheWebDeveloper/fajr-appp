import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { formatTime12 } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { POPULAR_CITIES, calculatePrayerTimes, type CityPreset, type PrayerTimeSchedule } from "@/lib/islamic-data";
import { onGradient } from "@/screens/student/dashboard/parts";
import { useTheme } from "@/theme/ThemeContext";
import { GradientCard, Icon, Row, Sheet, T } from "@/ui";

interface Prayer {
  key: keyof PrayerTimeSchedule;
  label: string;
}

const PRAYER_ORDER: Prayer[] = [
  { key: "fajr", label: "Fajr" },
  { key: "sunrise", label: "Sunrise" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

/** The next prayer after `now` (Fajr tomorrow once Isha has passed) and the time left to it, e.g. "1h 5m 30s". */
function nextPrayerAfter(schedule: PrayerTimeSchedule, now: Date): { nextPrayer: Prayer; countdown: string } {
  const nowSecs = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
  const left = (diffSecs: number) => {
    const h = Math.floor(diffSecs / 3600);
    const m = Math.floor((diffSecs % 3600) / 60);
    return `${h > 0 ? `${h}h ` : ""}${m}m ${diffSecs % 60}s`;
  };

  for (const prayer of PRAYER_ORDER) {
    const [ph, pm] = schedule[prayer.key].split(":").map(Number);
    const prayerSecs = (ph * 60 + pm) * 60;
    if (prayerSecs > nowSecs) return { nextPrayer: prayer, countdown: left(prayerSecs - nowSecs) };
  }

  // Past Isha: the next prayer is Fajr tomorrow
  const [fh, fm] = schedule.fajr.split(":").map(Number);
  return { nextPrayer: PRAYER_ORDER[0], countdown: left((24 * 60 + fh * 60 + fm) * 60 - nowSecs) };
}

// The same key the website keeps the choice under
const CITY_STORAGE_KEY = "fajr_prayer_city";

/**
 * The dashboard's one-line prayer widget: the next prayer, its time and a live countdown, for the city the
 * student chose last time on this phone (Dhaka until they choose one). Prayer times follow the phone's own clock.
 */
export default function PrayerTimesCompact() {
  const { c } = useTheme();
  const now = useNow(1000);
  const [city, setCity] = useState<CityPreset>(POPULAR_CITIES[0]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CITY_STORAGE_KEY)
      .then((name) => {
        const saved = POPULAR_CITIES.find((preset) => preset.name === name);
        if (saved) setCity(saved);
      })
      .catch(() => {});
  }, []);

  const chooseCity = (next: CityPreset) => {
    setCity(next);
    setOpen(false);
    // If saving fails the choice just is not remembered
    AsyncStorage.setItem(CITY_STORAGE_KEY, next.name).catch(() => {});
  };

  const schedule = calculatePrayerTimes(city.lat, city.lng, now);
  const { nextPrayer, countdown } = nextPrayerAfter(schedule, now);

  return (
    <>
      <GradientCard gradient="emerald" padding={14}>
        <Row gap={10} justify="space-between">
          <Row gap={10} style={{ flex: 1, minWidth: 0 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: onGradient.chip }}>
              <Icon name="compass" size={17} color={onGradient.text} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T variant="caption" color={onGradient.soft} weight="700" numberOfLines={1} style={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
                Next Prayer: {nextPrayer.label}
              </T>
              <T variant="bodyStrong" color={onGradient.text} weight="800" numberOfLines={1} adjustsFontSizeToFit>
                {formatTime12(schedule[nextPrayer.key])}{" "}
                <T variant="small" color={onGradient.soft} weight="500">
                  ({countdown})
                </T>
              </T>
            </View>
          </Row>

          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Prayer times city: ${city.name}. Change city`}
            hitSlop={6}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 36, paddingHorizontal: 10, borderRadius: 12, backgroundColor: onGradient.chip, opacity: pressed ? 0.8 : 1 })}
          >
            <Icon name="map-pin" size={12} color={onGradient.text} />
            <T variant="smallStrong" color={onGradient.text} numberOfLines={1} style={{ maxWidth: 96 }}>
              {city.name}
            </T>
            <Icon name="chevron-down" size={13} color={onGradient.soft} />
          </Pressable>
        </Row>
      </GradientCard>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Prayer times city" contentStyle={{ padding: 0, gap: 0, paddingVertical: 8 }}>
        {POPULAR_CITIES.map((preset) => {
          const active = preset.name === city.name;
          return (
            <Pressable
              key={preset.name}
              onPress={() => chooseCity(preset)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              android_ripple={{ color: c.border }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: active ? c.primarySoft : "transparent" }}
            >
              <View style={{ flex: 1 }}>
                <T variant="bodyStrong" color={active ? "primary" : "text"}>
                  {preset.name}
                </T>
                <T variant="small" color="muted">
                  {preset.country}
                </T>
              </View>
              {active ? <Icon name="check" size={18} color={c.primary} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}
