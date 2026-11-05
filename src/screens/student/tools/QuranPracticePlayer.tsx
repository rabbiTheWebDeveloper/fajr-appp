import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";

import { tapFeedback } from "@/lib/device";
import { PRACTICE_SURAHS, type QuranSurah, type QuranVerse } from "@/lib/islamic-data";
import { arabicText } from "@/screens/student/tools/arabic";
import { useTheme } from "@/theme/ThemeContext";
import { Badge, Button, Card, Chip, GradientCard, Icon, IconButton, IconChip, MIcon, Row, T, toast } from "@/ui";

type RepeatMode = "none" | "verse" | "surah";

const SPEEDS = [0.75, 1.0, 1.25];
const REPEAT_LABEL: Record<RepeatMode, string> = { none: "Repeat Off", verse: "Verse", surah: "Surah" };
const REPEAT_HINT: Record<RepeatMode, string> = { none: "Off", verse: "Current Ayah", surah: "Full Surah" };

const ON_NAVY_SOFT = "rgba(255,255,255,0.12)";

/** A small button on the navy player bar (speed, repeat) */
function ControlPill({ label, active, onPress, icon, accessibilityLabel }: { label: string; active?: boolean; onPress: () => void; icon: React.ReactNode; accessibilityLabel: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: "rgba(255,255,255,0.18)" }}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 12, overflow: "hidden", backgroundColor: active ? c.warning : ON_NAVY_SOFT }}
    >
      {icon}
      <Text style={{ color: "#ffffff", fontSize: 12.5, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

/**
 * The Tajweed practice station: pick a surah, tap an ayah to hear it, and let it run on ayah by ayah.
 * One native player is kept for the whole station and each ayah is loaded into it, like the website's single <audio> element.
 */
export default function QuranPracticePlayer() {
  const { c } = useTheme();
  const [selectedSurahIndex, setSelectedSurahIndex] = useState(0);
  const [activeAyahIndex, setActiveAyahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showTranslation, setShowTranslation] = useState(true);

  const surah: QuranSurah = PRACTICE_SURAHS[selectedSurahIndex];
  const activeVerse: QuranVerse = surah.verses[activeAyahIndex] || surah.verses[0];

  const player = useAudioPlayer(null, { updateInterval: 500 });
  /** The ayah the native player holds right now (null after a failed load, so the next try loads it again) */
  const loadedUrl = useRef<string | null>(null);
  /** The loaded ayah played to its end: it has to be rewound before it can play again */
  const finished = useRef(false);
  /** What the "ayah ended" handler needs, without re-subscribing to the player on every change */
  const latest = useRef({ verses: surah.verses, index: activeAyahIndex, repeatMode, playbackSpeed });
  latest.current = { verses: surah.verses, index: activeAyahIndex, repeatMode, playbackSpeed };

  // Recitation must be heard with the phone on silent, takes over from other apps' audio, and never plays on in the background
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: "doNotMix" }).catch(() => {});
  }, []);

  const stop = useCallback(() => {
    try {
      player.pause();
    } catch {
      // The player was already released (the screen is closing)
    }
    setIsPlaying(false);
    setIsBuffering(false);
  }, [player]);

  /** Plays the given ayah audio. `restart` starts it from the beginning even when it is the one already loaded. */
  const startAudio = useCallback(
    (url: string, restart: boolean) => {
      try {
        if (loadedUrl.current !== url) {
          player.replace(url);
          loadedUrl.current = url;
          setIsBuffering(true);
        } else if (restart || finished.current) {
          player.seekTo(0).catch(() => {});
        }
        finished.current = false;
        player.setPlaybackRate(latest.current.playbackSpeed);
        player.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setIsBuffering(false);
      }
    },
    [player]
  );

  const playAyah = useCallback(
    (index: number) => {
      const verse = latest.current.verses[index];
      if (!verse) return;
      latest.current.index = index;
      setActiveAyahIndex(index);
      startAudio(verse.audioUrl, true);
    },
    [startAudio]
  );

  /** What happens when an ayah finishes: repeat it, move to the next one, start the surah again, or stop */
  const handleAudioEnded = useCallback(() => {
    const { verses, index, repeatMode: repeat } = latest.current;
    finished.current = true;
    if (repeat === "verse" && verses[index]) {
      startAudio(verses[index].audioUrl, true);
    } else if (index < verses.length - 1) {
      playAyah(index + 1);
    } else if (repeat === "surah") {
      playAyah(0);
    } else {
      stop();
    }
  }, [playAyah, startAudio, stop]);

  useEffect(() => {
    const subscription = player.addListener("playbackStatusUpdate", (status) => {
      if (status.error) {
        loadedUrl.current = null;
        setIsPlaying(false);
        setIsBuffering(false);
        toast.error("Could not play this ayah. Check your internet connection and try again.");
        return;
      }
      if (status.didJustFinish) {
        handleAudioEnded();
        return;
      }
      setIsBuffering(status.isBuffering);
      // Follows pauses the app did not ask for (a phone call, another app taking the sound).
      // Only a settled player is trusted: while an ayah is still loading "playing" says little.
      if (status.playbackState === "ready") setIsPlaying(status.playing);
    });
    return () => {
      try {
        subscription.remove();
      } catch {
        // The player went away first
      }
    };
  }, [player, handleAudioEnded]);

  // Leaving the screen (another tab, a pushed page) stops the recitation
  useFocusEffect(
    useCallback(() => {
      return () => stop();
    }, [stop])
  );

  const togglePlayPause = () => {
    tapFeedback();
    if (isPlaying) stop();
    else startAudio(activeVerse.audioUrl, false);
  };

  const handleSurahChange = (index: number) => {
    tapFeedback();
    stop();
    setSelectedSurahIndex(index);
    setActiveAyahIndex(0);
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length];
    tapFeedback();
    setPlaybackSpeed(next);
    latest.current.playbackSpeed = next;
    try {
      player.setPlaybackRate(next);
    } catch {
      // Applied again when the next ayah starts
    }
  };

  const cycleRepeat = () => {
    tapFeedback();
    setRepeatMode((mode) => (mode === "none" ? "verse" : mode === "verse" ? "surah" : "none"));
  };

  return (
    <Card>
      <View style={{ gap: 14 }}>
        {/* Header & surah selector */}
        <Row gap={10}>
          <IconChip icon="book-open" tone="primary" />
          <View style={{ flex: 1 }}>
            <T variant="title">Interactive Tajweed Practice Station</T>
            <T variant="small" color="muted">
              Recited by {surah.reciter}
            </T>
          </View>
        </Row>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {PRACTICE_SURAHS.map((s, idx) => (
            <Chip key={s.number} label={`${s.nameEnglish} (${s.nameArabic})`} selected={idx === selectedSurahIndex} onPress={() => handleSurahChange(idx)} style={{ height: 40 }} />
          ))}
        </ScrollView>

        {/* Surah banner & player controls */}
        <GradientCard gradient="navyDeep">
          <View style={{ gap: 12 }}>
            <View>
              <Row gap={6}>
                <T variant="label" color="onDarkMuted">
                  Surah #{surah.number}
                </T>
                <T variant="caption" color="onDarkMuted">
                  ·
                </T>
                <T variant="caption" color="onDarkMuted">
                  {surah.versesCount} Ayahs
                </T>
              </Row>
              <Row gap={10} wrap style={{ marginTop: 2 }}>
                <T variant="h2" color="onDark">
                  {surah.nameEnglish}
                </T>
                <T color="gold" weight="700" style={{ fontSize: 19, lineHeight: 32 }}>
                  ({surah.nameArabic})
                </T>
              </Row>
              <T variant="small" color="onDarkMuted">
                Meaning: {surah.meaning}
              </T>
            </View>

            <Row gap={10}>
              <IconButton icon="chevron-left" onPress={() => playAyah(Math.max(0, activeAyahIndex - 1))} disabled={activeAyahIndex === 0} size={44} color="#ffffff" background={ON_NAVY_SOFT} accessibilityLabel="Previous ayah" />
              <Button title={isPlaying ? "Pause" : "Play Surah"} icon={isPlaying ? "pause" : "play"} onPress={togglePlayPause} style={{ flex: 1 }} />
              <IconButton
                icon="chevron-right"
                onPress={() => playAyah(Math.min(surah.verses.length - 1, activeAyahIndex + 1))}
                disabled={activeAyahIndex >= surah.verses.length - 1}
                size={44}
                color="#ffffff"
                background={ON_NAVY_SOFT}
                accessibilityLabel="Next ayah"
              />
            </Row>

            <Row gap={8} wrap>
              <ControlPill label={`${playbackSpeed}x`} onPress={cycleSpeed} icon={<MIcon name="speedometer" size={15} color="#ffffff" />} accessibilityLabel={`Playback speed ${playbackSpeed}x. Tap to change`} />
              <ControlPill label={REPEAT_LABEL[repeatMode]} active={repeatMode !== "none"} onPress={cycleRepeat} icon={<Icon name="repeat" size={14} color="#ffffff" />} accessibilityLabel={`Repeat: ${REPEAT_HINT[repeatMode]}. Tap to change`} />
              <T variant="caption" color="onDarkMuted" style={{ flex: 1, textAlign: "right" }}>
                Repeat: {REPEAT_HINT[repeatMode]}
              </T>
            </Row>
          </View>
        </GradientCard>

        {/* Translation toggle */}
        <View style={{ gap: 6 }}>
          <T variant="small" color="muted">
            Tap any verse below to practice and listen to its Tajweed recitation:
          </T>
          <Pressable onPress={() => setShowTranslation((show) => !show)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "flex-start", minHeight: 32, justifyContent: "center" }}>
            <T variant="smallStrong" color="primary">
              {showTranslation ? "Hide Translation" : "Show Translation"}
            </T>
          </Pressable>
        </View>

        {/* Verse by verse list */}
        <View style={{ gap: 12 }}>
          {surah.verses.map((verse, idx) => {
            const isActive = idx === activeAyahIndex;
            return (
              <Pressable
                key={verse.ayahNumber}
                onPress={() => playAyah(idx)}
                accessibilityRole="button"
                accessibilityLabel={`Play ayah ${verse.ayahNumber}`}
                accessibilityState={{ selected: isActive }}
                android_ripple={{ color: c.border }}
                style={{ padding: 14, gap: 8, borderRadius: 16, borderWidth: 1.5, overflow: "hidden", borderColor: isActive ? c.primary : c.border, backgroundColor: isActive ? c.primarySoft : c.surface }}
              >
                <Row gap={8} style={{ minHeight: 28 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: isActive ? c.primary : c.surfaceAlt }}>
                    <Text style={{ color: isActive ? "#ffffff" : c.text, fontSize: 12, fontWeight: "700" }}>{verse.ayahNumber}</Text>
                  </View>
                  {isActive && isPlaying ? (
                    isBuffering ? (
                      <Row gap={6}>
                        <ActivityIndicator size="small" color={c.primary} />
                        <T variant="caption" color="primary">
                          Loading…
                        </T>
                      </Row>
                    ) : (
                      <Badge label="Listening" tone="primary" icon="volume-2" style={{ alignSelf: "center" }} />
                    )
                  ) : null}
                </Row>

                <Text style={[arabicText, { color: c.text }, isActive ? { fontWeight: "800" } : null]}>{verse.arabic}</Text>

                {/* Transliteration & English */}
                {showTranslation ? (
                  <View style={{ gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border }}>
                    <T variant="smallStrong" color="muted" style={{ fontStyle: "italic" }}>
                      {verse.transliteration}
                    </T>
                    <T variant="small">{verse.english}</T>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Card>
  );
}
