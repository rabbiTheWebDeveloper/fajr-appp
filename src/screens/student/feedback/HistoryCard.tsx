import React from "react";
import { Pressable, View } from "react-native";

import { formatDate } from "@/lib/format";
import type { PastFeedback } from "@/screens/student/feedback/types";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Divider, Icon, IconChip, Row, StarRating, T } from "@/ui";

/** A sub-score saved before the detailed form existed has no value: the website shows those as 5/5 */
function SubScore({ label, value }: { label: string; value?: number }) {
  return (
    <View style={{ width: "50%", paddingVertical: 3 }}>
      <T variant="small" color="muted">
        {label}: <T variant="smallStrong">{value ?? 5}/5</T>
      </T>
    </View>
  );
}

function Comment({ label, text, danger }: { label: string; text: string; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <T variant="label" color={danger ? "danger" : "muted"}>
        {label}
      </T>
      <View style={{ padding: 10, borderRadius: radius.sm, backgroundColor: danger ? c.dangerSoft : c.surfaceAlt }}>
        <T variant="small" color={danger ? "danger" : "text"} selectable>
          {text}
        </T>
      </View>
    </View>
  );
}

/** One past evaluation in the history list; "View Details" opens the sub-scores and written answers */
export function HistoryCard({ feedback, expanded, onToggle }: { feedback: PastFeedback; expanded: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  // Only an explicit "No" counts as not recommending (older evaluations have no answer)
  const recommends = feedback.recommend !== false;

  return (
    <View style={{ padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 10 }}>
      <Row gap={10} align="flex-start">
        <IconChip icon="book-open" size={34} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <T variant="bodyStrong" numberOfLines={2}>
            {feedback.course?.title || "—"}
          </T>
          <Row gap={5}>
            <Icon name="user" size={12} color={c.textFaint} />
            <T variant="small" color="muted" numberOfLines={1} style={{ flex: 1 }}>
              {feedback.teacher?.fullName || "—"}
            </T>
          </Row>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View accessibilityLabel={`Overall satisfaction ${feedback.rating} out of 5`}>
            <StarRating value={feedback.rating} size={14} readOnly />
          </View>
          <T variant="caption" color="faint">
            {formatDate(feedback.createdAt)}
          </T>
        </View>
      </Row>

      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded }} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
        <T variant="smallStrong" color="primary">
          {expanded ? "Hide Details" : "View Details"}
        </T>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} color={c.primaryText} />
      </Pressable>

      {expanded ? (
        <View style={{ gap: 12 }}>
          <Divider />
          <View style={{ padding: 10, borderRadius: radius.sm, backgroundColor: c.surfaceAlt }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <SubScore label="Clarity" value={feedback.teachingClarity} />
              <SubScore label="Punctuality" value={feedback.punctuality} />
              <SubScore label="Knowledge" value={feedback.subjectKnowledge} />
              <SubScore label="Patience" value={feedback.behaviorPatience} />
              <SubScore label="Engagement" value={feedback.classEngagement} />
              <SubScore label="Time Use" value={feedback.useOfClassTime} />
            </View>
            <Divider style={{ marginVertical: 6 }} />
            <Row gap={6}>
              <T variant="small" color="muted">
                Recommend:
              </T>
              <Icon name={recommends ? "thumbs-up" : "thumbs-down"} size={13} color={recommends ? c.successText : c.dangerText} />
              <T variant="smallStrong" color={recommends ? "success" : "danger"}>
                {recommends ? "Yes" : "No"}
              </T>
            </Row>
          </View>

          {feedback.likeMost ? <Comment label="Liked Most" text={feedback.likeMost} /> : null}
          {feedback.couldImprove ? <Comment label="Could Improve" text={feedback.couldImprove} /> : null}
          {feedback.issuesConcerns ? <Comment label="Reported Issues" text={feedback.issuesConcerns} danger /> : null}
        </View>
      ) : null}
    </View>
  );
}
