import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/theme/ThemeContext";
import { gradients, radius, toneColors, type Tone } from "@/theme/palette";
import { Icon, IconChip, MIcon, Row, T, initialsOf } from "@/ui";

import {
  assigneeName,
  formatTicketDate,
  hasNewStaffReply,
  isActiveStatus,
  isFinalStatus,
  isOwnMessage,
  lastActivity,
  priorityMeta,
  resolveCategory,
  statusMeta,
  ticketCode,
  ticketTimeAgo,
  visibleMessages,
  type Category,
  type TicketItem,
} from "@/screens/teacher/helpdesk/helpdesk-utils";

/** A small pill with a coloured dot: ticket status, priority */
function DotPill({ label, tone, small }: { label: string; tone: Tone; small?: boolean }) {
  const { c } = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: small ? 7 : 9, paddingVertical: small ? 2 : 4, borderRadius: radius.pill, backgroundColor: t.bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.solid }} />
      <Text numberOfLines={1} style={{ color: t.fg, fontSize: small ? 10.5 : 11.5, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

export function StatusChip({ status, small }: { status: string; small?: boolean }) {
  const m = statusMeta(status);
  return <DotPill label={m.label} tone={m.tone} small={small} />;
}

export function PriorityChip({ priority }: { priority?: string }) {
  const p = priorityMeta(priority);
  return <DotPill label={`${p.label} priority`} tone={p.tone} />;
}

/** A solid "New reply" marker: the latest message on an active ticket is from staff */
export function NewReplyBadge() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: c.primary }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#ffffff" }} />
      <Text style={{ color: "#ffffff", fontSize: 10.5, fontWeight: "700" }}>New reply</Text>
    </View>
  );
}

export function CategoryTile({ cat, size = 40 }: { cat: Category; size?: number }) {
  return <IconChip icon={cat.icon} mIcon={cat.mIcon} tone={cat.tone} size={size} />;
}

/** Support staff are shown with a gold initials disc, the teacher with their own photo */
export function StaffAvatar({ name, size = 30 }: { name?: string; size?: number }) {
  const { c } = useTheme();
  return (
    <LinearGradient colors={[gradients.gold[0], gradients.gold[1]]} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: c.navy, fontWeight: "800", fontSize: Math.round(size * 0.36) }}>{initialsOf(name || "Support", "?")}</Text>
    </LinearGradient>
  );
}

/** Progress tracker: Submitted → In Review → Resolved */
export function Stepper({ ticket }: { ticket: TicketItem }) {
  const { c } = useTheme();
  const s = ticket.status;
  const final = isFinalStatus(s);
  const current = final ? 3 : 1;
  const steps = [
    { label: "Submitted", sub: formatTicketDate(ticket.createdAt) },
    { label: s === "on-hold" ? "On Hold" : "In Review", sub: s === "open" ? "Awaiting coordinator" : s === "on-hold" ? "Paused by team" : final ? "Completed" : "Coordinator working" },
    { label: s === "closed" ? "Closed" : "Resolved", sub: final ? formatTicketDate(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt) : "Pending" },
  ];
  return (
    <View accessibilityLabel="Ticket progress" style={{ flexDirection: "row", alignItems: "flex-start" }}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const fill = i + 1 < current ? 1 : i + 1 === current ? 0.5 : 0;
        return (
          <React.Fragment key={step.label}>
            <View style={{ alignItems: "center", gap: 5, width: 78 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: done ? c.success : active ? c.primary : c.surfaceAlt }}>
                {done ? (
                  <Icon name="check" size={15} color="#ffffff" />
                ) : active ? (
                  <MIcon name="timer-sand" size={14} color="#ffffff" />
                ) : (
                  <Text style={{ color: c.textFaint, fontSize: 12, fontWeight: "700" }}>{i + 1}</Text>
                )}
              </View>
              <View style={{ alignItems: "center" }}>
                <T variant="caption" weight="700" color={done || active ? "text" : "faint"} center>
                  {step.label}
                </T>
                <T variant="caption" color="faint" center style={{ fontSize: 10 }}>
                  {step.sub}
                </T>
              </View>
            </View>
            {i < steps.length - 1 ? (
              <View style={{ flex: 1, height: 2, marginTop: 14, borderRadius: 1, backgroundColor: c.border, overflow: "hidden" }}>
                <View style={{ width: `${fill * 100}%`, height: "100%", backgroundColor: c.success }} />
              </View>
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/** One ticket in the "My Tickets" list */
export function TicketRow({ ticket, onPress }: { ticket: TicketItem; onPress: () => void }) {
  const { c } = useTheme();
  const cat = resolveCategory(ticket);
  const meta = statusMeta(ticket.status);
  const msgs = visibleMessages(ticket);
  const last = msgs[msgs.length - 1];
  const newReply = hasNewStaffReply(ticket);
  const staff = assigneeName(ticket);
  // Only the priorities that need attention are flagged in the list
  const pr = ticket.priority === "high" || ticket.priority === "urgent" ? priorityMeta(ticket.priority) : null;
  const prColors = pr ? toneColors(c, pr.tone) : null;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: c.border }}
      accessibilityRole="button"
      accessibilityLabel={`Ticket ${ticketCode(ticket)}: ${ticket.title}, ${meta.label}`}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14, paddingLeft: 16, paddingRight: 12, backgroundColor: newReply ? c.primarySoft : "transparent" }}
    >
      <View style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 4, borderTopRightRadius: 2, borderBottomRightRadius: 2, backgroundColor: toneColors(c, meta.tone).solid, opacity: isActiveStatus(ticket.status) ? 1 : 0.6 }} />
      <CategoryTile cat={cat} />

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Row gap={6} wrap>
          <T variant="mono" color="faint" style={{ fontSize: 11 }}>
            #{ticketCode(ticket)}
          </T>
          <T variant="caption" color="faint">
            · {cat.short}
          </T>
          {pr && prColors ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: prColors.bg }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: prColors.solid }} />
              <Text style={{ color: prColors.fg, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 }}>{pr.label}</Text>
            </View>
          ) : null}
          {newReply ? <NewReplyBadge /> : null}
        </Row>
        <T variant="bodyStrong" numberOfLines={1}>
          {ticket.title || cat.label}
        </T>
        <T variant="small" color="muted" numberOfLines={1}>
          {last ? (
            <>
              <T variant="smallStrong" color="muted">
                {isOwnMessage(last) ? "You" : last.senderName || "Support"}:
              </T>{" "}
              {last.content}
            </>
          ) : (
            ticket.description
          )}
        </T>
        <Row gap={8} wrap style={{ marginTop: 5 }}>
          <StatusChip status={ticket.status} small />
          <T variant="caption" color="faint">
            {ticketTimeAgo(lastActivity(ticket))}
          </T>
          {msgs.length > 0 ? (
            <Row gap={3}>
              <Icon name="message-square" size={11} color={c.textFaint} />
              <T variant="caption" color="faint">
                {msgs.length}
              </T>
            </Row>
          ) : null}
        </Row>
        <Row gap={6} style={{ marginTop: 4 }}>
          {staff ? (
            <>
              <StaffAvatar name={staff} size={18} />
              <T variant="caption" color="muted" numberOfLines={1} style={{ flex: 1 }}>
                {staff}
              </T>
            </>
          ) : (
            <T variant="caption" color="faint" style={{ fontStyle: "italic" }}>
              Unassigned
            </T>
          )}
        </Row>
      </View>

      <Icon name="chevron-right" size={16} color={c.textFaint} style={{ marginTop: 12 }} />
    </Pressable>
  );
}
