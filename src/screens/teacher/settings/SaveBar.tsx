import React from "react";
import { View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { Button, Row, T } from "@/ui";

import type { SaveMode } from "@/screens/teacher/settings/types";

interface SaveBarProps {
  /** The tab this bar saves */
  mode: "personal" | "portfolio";
  unsaved: { personal: boolean; portfolio: boolean };
  savingMode: SaveMode | null;
  disabled: boolean;
  onSave: (mode: SaveMode) => void;
}

/** The bar pinned under the Personal and Portfolio tabs: unsaved marker, "Save All" when both tabs have edits, and the tab's save button */
export function SaveBar({ mode, unsaved, savingMode, disabled, onSave }: SaveBarProps) {
  const { c } = useTheme();
  const dirty = unsaved[mode];
  const name = mode === "personal" ? "Personal Details" : "Portfolio";

  return (
    <Row gap={10} justify="space-between">
      <Row gap={8} style={{ flex: 1, minWidth: 0 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dirty ? c.warning : c.success }} />
        <T variant="smallStrong" numberOfLines={2} style={{ flex: 1 }}>
          {dirty ? `Unsaved changes in ${name}` : `${name} up to date`}
        </T>
      </Row>
      {unsaved.personal && unsaved.portfolio ? <Button title="Save All" icon="save" variant="secondary" size="sm" loading={savingMode === "all"} disabled={disabled} onPress={() => onSave("all")} style={{ height: 40 }} /> : null}
      <Button
        title={savingMode === mode ? "Saving..." : `Save ${mode === "personal" ? "Personal" : "Portfolio"}`}
        icon="save"
        size="sm"
        loading={savingMode === mode}
        disabled={disabled}
        onPress={() => onSave(mode)}
        style={{ height: 40 }}
      />
    </Row>
  );
}
