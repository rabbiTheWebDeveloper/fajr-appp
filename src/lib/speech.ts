import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

import { toast } from "@/ui/toast";

/**
 * Reads Arabic text aloud with the phone's own text-to-speech voice: the app's version of the website's
 * du'a "Listen" button (same language and speed: Arabic, 0.85).
 *
 *   const { speaking, toggle, stop } = useArabicSpeech();
 *   <Button title={speaking ? "Stop" : "Listen"} onPress={() => toggle(dua.arabic)} />
 *
 * Call stop() when the text on screen changes. Speech also stops when the screen is left.
 */
export function useArabicSpeech(): { speaking: boolean; toggle: (text: string) => void; stop: () => void } {
  const [speaking, setSpeaking] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      Speech.stop().catch(() => {});
    };
  }, []);

  const stop = useCallback(() => {
    Speech.stop().catch(() => {});
    if (mounted.current) setSpeaking(false);
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (speaking) {
        stop();
        return;
      }
      if (!text.trim()) return;
      const finished = () => {
        if (mounted.current) setSpeaking(false);
      };
      setSpeaking(true);
      Speech.speak(text, {
        language: "ar-SA",
        rate: 0.85,
        onDone: finished,
        onStopped: finished,
        onError: () => {
          finished();
          toast.error("This phone could not read the du'a aloud. An Arabic voice may need to be installed in the phone's text-to-speech settings.");
        },
      });
    },
    [speaking, stop]
  );

  return { speaking, toggle, stop };
}
