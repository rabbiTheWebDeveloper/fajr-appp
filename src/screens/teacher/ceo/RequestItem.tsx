import React from "react";
import { Pressable, Text, View } from "react-native";

import { formatClock, formatDate } from "@/lib/format";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors, type Tone } from "@/theme/palette";
import { Badge, Icon, MIcon, Row, T } from "@/ui";

export type CeoRequestType = "meeting_request" | "problem_report";

/** One request as GET /api/teacher-portal/ceo-requests returns it in `requests` */
export interface CeoRequest {
  _id: string;
  requestId: string;
  type: CeoRequestType;
  subject: string;
  message: string;
  status: "pending" | "seen" | "in-review" | "responded" | "closed";
  adminResponse?: string;
  respondedBy?: string;
  respondedAt?: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  seen: { label: "Seen", tone: "info" },
  "in-review": { label: "In Review", tone: "violet" },
  responded: { label: "Responded", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

/** "Nov 5, 2026, 2:30 PM" (academy time) */
function formatRequestDate(value: string): string {
  return `${formatDate(value, "medium")}, ${formatClock(value)}`;
}

function StatusBadge({ status }: { status: string }) {
  const { c } = useTheme();
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  const t = toneColors(c, s.tone);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: t.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.solid }} />
      <Text style={{ color: t.fg, fontSize: 11, fontWeight: "700" }}>{s.label}</Text>
    </View>
  );
}

function TypeChip({ type }: { type: string }) {
  return type === "meeting_request" ? <Badge label="Meeting" tone="primary" icon="calendar" /> : <Badge label="Problem" tone="danger" icon="alert-triangle" />;
}

/** A row of "My Requests": tap to unfold the message, the CEO's response and where the request stands */
export function RequestItem({ request, expanded, onToggle }: { request: CeoRequest; expanded: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  return (
    <View>
      <Pressable onPress={onToggle} android_ripple={{ color: c.border }} accessibilityRole="button" accessibilityState={{ expanded }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Row gap={6} wrap>
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: c.primarySoft }}>
              <T variant="mono" color="primary" style={{ fontSize: 10.5 }}>
                {request.requestId}
              </T>
            </View>
            <TypeChip type={request.type} />
            <StatusBadge status={request.status} />
          </Row>
          <T variant="bodyStrong" numberOfLines={expanded ? undefined : 1}>
            {request.subject}
          </T>
          <T variant="caption" color="faint">
            {formatRequestDate(request.createdAt)}
          </T>
        </View>
        <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: expanded ? c.primarySoft : c.surfaceAlt }}>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={14} color={expanded ? c.primaryText : c.textFaint} />
        </View>
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
          {/* Original message */}
          <View style={{ padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, gap: 6 }}>
            <T variant="label" color="faint">
              Your Message
            </T>
            <T variant="body" color="muted" selectable style={{ lineHeight: 21 }}>
              {request.message}
            </T>
          </View>

          {/* The CEO's response */}
          {request.adminResponse ? (
            <View style={{ padding: 14, borderRadius: radius.lg, backgroundColor: c.successSoft, gap: 6 }}>
              <Row gap={6}>
                <MIcon name="crown" size={14} color={c.successText} />
                <T variant="label" color="success" style={{ flexShrink: 1 }}>
                  CEO Response
                  {request.respondedBy ? (
                    <T variant="caption" color="success" style={{ textTransform: "none", letterSpacing: 0 }}>
                      {" "}
                      — {request.respondedBy}
                    </T>
                  ) : null}
                </T>
              </Row>
              <T variant="body" color="success" selectable style={{ lineHeight: 21 }}>
                {request.adminResponse}
              </T>
              {request.respondedAt ? (
                <T variant="caption" color="success" style={{ opacity: 0.75 }}>
                  {formatRequestDate(request.respondedAt)}
                </T>
              ) : null}
            </View>
          ) : null}

          {request.status === "pending" ? (
            <Row gap={8} align="flex-start" style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: c.warningSoft }}>
              <Icon name="clock" size={14} color={c.warningText} style={{ marginTop: 1 }} />
              <T variant="small" color="warning" style={{ flex: 1 }}>
                Your request has been sent to the CEO and is awaiting review.
              </T>
            </Row>
          ) : null}
          {request.status === "seen" ? (
            <Row gap={8} align="flex-start" style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, backgroundColor: c.infoSoft }}>
              <Icon name="eye" size={14} color={c.infoText} style={{ marginTop: 1 }} />
              <T variant="small" color="info" style={{ flex: 1 }}>
                The CEO has seen your request and will respond soon.
              </T>
            </Row>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
