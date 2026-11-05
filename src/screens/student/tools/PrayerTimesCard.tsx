import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { tapFeedback } from "@/lib/device";
import { formatTime12 } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { POPULAR_CITIES, calculatePrayerTimes, type CityPreset } from "@/lib/islamic-data";
import { PRAYER_ORDER, loadSavedCity, nextPrayerAfter, saveCity } from "@/screens/student/tools/prayer";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Card, Divider, GradientCard, Icon, IconChip, ListItem, Row, Sheet, T, TileGrid } from "@/ui";

/** Today's prayer times for a chosen city, with the next prayer highlighted and a live countdown to it */
export default function PrayerTimesCard() {
  const { c } = useTheme();
  const now = useNow(1000);
  const [selectedCity, setSelectedCity] = useState<CityPreset>(POPULAR_CITIES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const chosenHere = useRef(false);

  useEffect(() => {
    let alive = true;
    void loadSavedCity().then((city) => {
      // A city picked before the saved one was read wins
      if (alive && !chosenHere.current) setSelectedCity(city);
    });
    return () => {
      alive = false;
    };
  }, []);

  const chooseCity = (city: CityPreset) => {
    chosenHere.current = true;
    tapFeedback();
    setSelectedCity(city);
    setIsOpen(false);
    saveCity(city);
  };

  const schedule = calculatePrayerTimes(selectedCity.lat, selectedCity.lng, now);
  const { nextPrayer, countdown } = nextPrayerAfter(schedule, now);

  return (
    <Card>
      <View style={{ gap: 14 }}>
        <Row gap={10}>
          <IconChip icon="compass" tone="success" />
          <View style={{ flex: 1 }}>
            <T variant="title">Daily Prayer Times (Namaz)</T>
            <T variant="small" color="muted">
              Upcoming prayer timing & reminders
            </T>
          </View>
        </Row>

        <Pressable
          onPress={() => setIsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`City: ${selectedCity.name}, ${selectedCity.country}. Tap to change`}
          android_ripple={{ color: c.border }}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.surfaceAlt, alignSelf: "flex-start", maxWidth: "100%" }}
        >
          <Icon name="map-pin" size={15} color={c.success} />
          <T variant="smallStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {selectedCity.name}, {selectedCity.country}
          </T>
          <Icon name="chevron-down" size={15} color={c.textMuted} />
        </Pressable>

        <Divider />

        {/* Next prayer countdown spotlight */}
        <GradientCard gradient="emerald">
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10.5, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>Next Upcoming Salah</Text>
          <Text style={{ color: "#ffffff", fontSize: 22, lineHeight: 30, fontWeight: "800" }}>
            {nextPrayer.label} at {formatTime12(schedule[nextPrayer.key])}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}>
            <Icon name="clock" size={15} color="#ffffff" />
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12.5, fontWeight: "600" }}>
              Starts in <Text style={{ color: "#ffffff", fontWeight: "800" }}>{countdown}</Text>
            </Text>
          </View>
        </GradientCard>

        {/* Fajr, Sunrise and the four other prayers */}
        <TileGrid columns={3} gap={8}>
          {PRAYER_ORDER.map((p) => {
            const isNext = p.key === nextPrayer.key;
            return (
              <View
                key={p.key}
                accessibilityLabel={`${p.label} ${formatTime12(schedule[p.key])}${isNext ? ", next" : ""}`}
                style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, borderWidth: isNext ? 1.5 : 1, borderColor: isNext ? c.success : c.border, backgroundColor: isNext ? c.successSoft : c.surfaceAlt }}
              >
                <T variant="label" color={isNext ? "success" : "muted"} numberOfLines={1} style={{ letterSpacing: 0.4 }}>
                  {p.label}
                </T>
                <T variant="bodyStrong" weight="800" color={isNext ? "success" : "text"} numberOfLines={1}>
                  {formatTime12(schedule[p.key])}
                </T>
                {isNext ? <Badge label="Next" tone="success" solid style={{ alignSelf: "center" }} /> : null}
              </View>
            );
          })}
        </TileGrid>
      </View>

      <Sheet visible={isOpen} onClose={() => setIsOpen(false)} title="Choose a city" subtitle="Prayer times are worked out for this city" contentStyle={{ padding: 6, gap: 0 }}>
        {POPULAR_CITIES.map((city) => {
          const selected = city.name === selectedCity.name;
          return (
            <ListItem
              key={city.name}
              title={city.name}
              subtitle={city.country}
              onPress={() => chooseCity(city)}
              left={<Icon name="map-pin" size={16} color={selected ? c.success : c.textFaint} />}
              right={selected ? <Icon name="check" size={18} color={c.success} /> : <View style={{ width: 18 }} />}
              style={selected ? { backgroundColor: c.successSoft, borderRadius: 12 } : undefined}
            />
          );
        })}
      </Sheet>
    </Card>
  );
}
