import AsyncStorage from "@react-native-async-storage/async-storage";

import { POPULAR_CITIES, type CityPreset, type PrayerTimeSchedule } from "@/lib/islamic-data";

export interface PrayerSlot {
  key: keyof PrayerTimeSchedule;
  label: string;
}

export const PRAYER_ORDER: PrayerSlot[] = [
  { key: "fajr", label: "Fajr" },
  { key: "sunrise", label: "Sunrise" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

/**
 * The next prayer after `now` (Fajr tomorrow once Isha has passed) and the time left to it, e.g. "1h 5m 30s".
 * Like the website's widget this reads the phone's own clock: the schedule is worked out for the phone's time zone.
 */
export function nextPrayerAfter(schedule: PrayerTimeSchedule, now: Date): { nextPrayer: PrayerSlot; countdown: string } {
  const nowSecs = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();
  const left = (diffSecs: number) => {
    const h = Math.floor(diffSecs / 3600);
    const m = Math.floor((diffSecs % 3600) / 60);
    return `${h > 0 ? `${h}h ` : ""}${m}m ${diffSecs % 60}s`;
  };

  for (const p of PRAYER_ORDER) {
    const [ph, pm] = schedule[p.key].split(":").map(Number);
    const prayerSecs = (ph * 60 + pm) * 60;
    if (prayerSecs > nowSecs) return { nextPrayer: p, countdown: left(prayerSecs - nowSecs) };
  }

  // Past Isha: the next prayer is Fajr tomorrow
  const [fh, fm] = schedule.fajr.split(":").map(Number);
  return { nextPrayer: PRAYER_ORDER[0], countdown: left((24 * 60 + fh * 60 + fm) * 60 - nowSecs) };
}

/** The same key the website keeps in localStorage */
const CITY_STORAGE_KEY = "fajr_prayer_city";

/** The city the student chose last time on this phone (Dhaka until they choose one) */
export async function loadSavedCity(): Promise<CityPreset> {
  try {
    const name = await AsyncStorage.getItem(CITY_STORAGE_KEY);
    return POPULAR_CITIES.find((city) => city.name === name) ?? POPULAR_CITIES[0];
  } catch {
    return POPULAR_CITIES[0];
  }
}

export function saveCity(city: CityPreset): void {
  // When this fails the choice just is not remembered
  AsyncStorage.setItem(CITY_STORAGE_KEY, city.name).catch(() => {});
}
