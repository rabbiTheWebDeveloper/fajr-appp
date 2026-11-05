import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { absoluteUrl } from "@/api/client";
import { openExternal, successFeedback } from "@/lib/device";
import { EditTicketSheet } from "@/screens/teacher/helpdesk/EditTicketSheet";
import {
  QUICK_REPLIES,
  RATING_LABELS,
  assigneeName,
  dayLabel,
  formatTicketDate,
  formatTicketTime,
  isActiveStatus,
  isFinalStatus,
  isOwnMessage,
  resolveCategory,
  statusMeta,
  ticketCode,
  ticketMutation,
  visibleMessages,
  type TicketItem,
  type TicketMessage,
} from "@/screens/teacher/helpdesk/helpdesk-utils";
import { PriorityChip, StaffAvatar, StatusChip, Stepper } from "@/screens/teacher/helpdesk/parts";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors } from "@/theme/palette";
import { Avatar, Banner, Button, Card, Icon, IconChip, Input, Row, Sheet, StarRating, T, type ScrollViewRef } from "@/ui";

export interface SheetNotice {
  id: number;
  type: "success" | "error";
  text: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  ticket: TicketItem | null;
  teacherName: string;
  teacherAvatar: string;
  /** Messages for the teacher while the sheet is open (the app's toasts sit behind an open sheet) */
  notice: SheetNotice | null;
  onDismissNotice: () => void;
  notify: (type: "success" | "error", text: string) => void;
  /** Push an updated ticket into every place it is displayed */
  onSync: (ticket: TicketItem) => void;
  /** Quietly reload the list and its status counts */
  onReload: () => void;
}

/** The ticket with its conversation: a chat with the reply box pinned at the bottom. */
export function TicketDetailSheet(props: Props) {
  if (!props.ticket) return null;
  return <DetailSheet {...props} ticket={props.ticket} />;
}

function DetailSheet({ visible, onClose, ticket, teacherName, teacherAvatar, notice, onDismissNotice, notify, onSync, onReload }: Props & { ticket: TicketItem }) {
  const { c } = useTheme();
  const [replyContent, setReplyContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(ticket.feedback?.rating ?? 0);
  const [feedbackComment, setFeedbackComment] = useState(ticket.feedback?.comment ?? "");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editSeq, setEditSeq] = useState(0);

  const scrollRef = useRef<ScrollViewRef>(null);
  const replyRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const cat = resolveCategory(ticket);
  const staff = assigneeName(ticket);
  const active = isActiveStatus(ticket.status);
  const final = isFinalStatus(ticket.status);
  const messages = visibleMessages(ticket);
  const feedbackDone = !!ticket.feedback?.submittedAt;
  const railColor = toneColors(c, statusMeta(ticket.status).tone).solid;

  // Keep the conversation pinned to the latest message: on opening, and whenever a message arrives
  const messageCount = messages.length;
  useEffect(() => {
    if (!visible) return undefined;
    const toEnd = () => scrollRef.current?.scrollToEnd({ animated: true });
    // Twice: once early, once after the sheet has finished sliding up and laid out
    const timers = [setTimeout(toEnd, 120), setTimeout(toEnd, 450)];
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [visible, messageCount]);

  // ...and when the keyboard opens over it
  useEffect(() => {
    if (!visible) return undefined;
    const subscription = Keyboard.addListener("keyboardDidShow", () => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => subscription.remove();
  }, [visible]);

  const sendReply = async () => {
    const content = replyContent.trim();
    if (!content || sendingReply) return;
    setSendingReply(true);
    setReplyError("");
    const result = await ticketMutation("POST", { action: "reply", ticketId: ticket._id, content }, "Could not send reply.");
    setSendingReply(false);
    if (result.data?.ticket) {
      setReplyContent("");
      onSync(result.data.ticket);
      onReload();
    } else {
      setReplyError(result.error || "Could not send reply.");
    }
  };

  const closeTicket = async () => {
    setClosing(true);
    const result = await ticketMutation("PATCH", { ticketId: ticket._id, status: "closed" }, "Could not close the ticket.");
    setClosing(false);
    if (result.data) {
      successFeedback();
      onSync(result.data.ticket ?? { ...ticket, status: "closed" });
      setConfirmClose(false);
      notify("success", `Ticket #${ticketCode(ticket)} closed. You can now rate the support you received.`);
      onReload();
    } else {
      notify("error", result.error || "Could not close the ticket.");
    }
  };

  const submitFeedback = async () => {
    if (feedbackRating === 0 || submittingFeedback) return;
    setSubmittingFeedback(true);
    const result = await ticketMutation("POST", { action: "feedback", ticketId: ticket._id, rating: feedbackRating, comment: feedbackComment.trim() }, "Could not submit feedback.");
    setSubmittingFeedback(false);
    if (result.data?.ticket) {
      successFeedback();
      onSync(result.data.ticket);
      notify("success", "Thank you! Your feedback helps us improve.");
    } else {
      notify("error", result.error || "Could not submit feedback.");
    }
  };

  const openEdit = () => {
    setEditSeq((n) => n + 1);
    setEditOpen(true);
  };

  let lastDay = "";

  const composer = active ? (
    <>
      {confirmClose ? (
        <View accessibilityRole="alert" style={{ gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: c.dangerSoft }}>
          <T variant="smallStrong" color="danger">
            Close this ticket? Once closed it cannot be reopened.
          </T>
          <Row gap={8} justify="flex-end">
            <Button title="Keep open" variant="outline" size="sm" onPress={() => setConfirmClose(false)} />
            <Button title="Close ticket" variant="danger" size="sm" icon="lock" loading={closing} onPress={() => void closeTicket()} />
          </Row>
        </View>
      ) : null}

      {replyError ? (
        <Row gap={6} align="flex-start">
          <Icon name="alert-circle" size={13} color={c.dangerText} style={{ marginTop: 2 }} />
          <T variant="smallStrong" color="danger" style={{ flex: 1 }}>
            {replyError}
          </T>
        </Row>
      ) : null}

      <Row gap={6}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ gap: 6, alignItems: "center" }}>
          {QUICK_REPLIES.map((quick) => (
            <Pressable
              key={quick}
              onPress={() => {
                setReplyContent(quick);
                replyRef.current?.focus();
              }}
              accessibilityRole="button"
              style={{ height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, justifyContent: "center" }}
            >
              <T variant="caption" weight="600" color="muted">
                {quick}
              </T>
            </Pressable>
          ))}
        </ScrollView>
        {!confirmClose ? (
          <Pressable onPress={() => setConfirmClose(true)} accessibilityRole="button" hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingHorizontal: 8 }}>
            <Icon name="lock" size={12} color={c.dangerText} />
            <T variant="caption" weight="700" color="danger">
              Close ticket
            </T>
          </Pressable>
        ) : null}
      </Row>

      <Row gap={8} align="flex-end">
        <TextInput
          ref={replyRef}
          value={replyContent}
          onChangeText={setReplyContent}
          multiline
          maxLength={2000}
          placeholder="Write a reply…"
          placeholderTextColor={c.placeholder}
          accessibilityLabel="Write a reply"
          style={{ flex: 1, minHeight: 46, maxHeight: 130, paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.lg, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.inputBg, color: c.text, fontSize: 14, textAlignVertical: "center" }}
        />
        <Pressable
          onPress={() => void sendReply()}
          disabled={!replyContent.trim() || sendingReply}
          accessibilityRole="button"
          accessibilityLabel="Send reply"
          style={{ width: 46, height: 46, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: c.primary, opacity: !replyContent.trim() || sendingReply ? 0.4 : 1 }}
        >
          {sendingReply ? <ActivityIndicator size="small" color="#ffffff" /> : <Icon name="send" size={19} color="#ffffff" />}
        </Pressable>
      </Row>
    </>
  ) : undefined;

  return (
    <Sheet visible={visible} onClose={onClose} title={ticket.title || cat.label} subtitle={`#${ticketCode(ticket)} · ${cat.short}`} full scroll={false} footer={composer}>
      <View style={{ height: 3, backgroundColor: railColor }} />
      {notice ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Banner key={notice.id} tone={notice.type === "success" ? "success" : "danger"} message={notice.text} onClose={onDismissNotice} />
        </View>
      ) : null}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Status, priority, date and who is handling it */}
        <View style={{ gap: 8 }}>
          <Row gap={8} wrap>
            <StatusChip status={ticket.status} />
            <PriorityChip priority={ticket.priority} />
          </Row>
          <Row gap={14} wrap>
            <Row gap={5}>
              <Icon name="calendar" size={13} color={c.textFaint} />
              <T variant="small" color="muted">
                {formatTicketDate(ticket.createdAt)}
              </T>
            </Row>
            <Row gap={6}>
              {staff ? <StaffAvatar name={staff} size={20} /> : <Icon name="user" size={13} color={c.textFaint} />}
              <T variant="small" color="muted">
                {staff || "Unassigned"}
              </T>
            </Row>
          </Row>
        </View>

        <Card padding={14}>
          <Stepper ticket={ticket} />
        </Card>

        {/* Original request */}
        <View style={{ padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, gap: 6 }}>
          <Row justify="space-between">
            <T variant="label" color="faint">
              Original request
            </T>
            {/* Only a ticket no coordinator has picked up yet can be edited */}
            {ticket.status === "open" ? <Button title="Edit" icon="edit-2" variant="ghost" size="sm" onPress={openEdit} /> : null}
          </Row>
          <T variant="body" selectable style={{ lineHeight: 21 }}>
            {ticket.description}
          </T>
        </View>

        {/* Resolution note */}
        {ticket.resolutionNote ? (
          <View style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: c.successSoft }}>
            <IconChip mIcon="check-decagram" tone="success" size={32} />
            <View style={{ flex: 1 }}>
              <T variant="smallStrong" color="success">
                Resolution from the support team
              </T>
              <T variant="body" color="success" selectable style={{ marginTop: 3, lineHeight: 21 }}>
                {ticket.resolutionNote}
              </T>
            </View>
          </View>
        ) : null}

        {/* Conversation */}
        <View style={{ gap: 10 }}>
          <Row gap={10}>
            <T variant="label" color="faint">
              Conversation{messages.length ? ` · ${messages.length}` : ""}
            </T>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          </Row>

          {messages.length === 0 ? (
            <View style={{ alignItems: "center", paddingHorizontal: 20, paddingVertical: 24, borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: c.borderStrong, gap: 4 }}>
              <IconChip icon="message-circle" tone="primary" size={42} />
              <T variant="bodyStrong" center style={{ marginTop: 8 }}>
                {active ? "Waiting for a coordinator" : "No replies on this ticket"}
              </T>
              {active ? (
                <T variant="small" color="muted" center>
                  {"You'll see their reply here. Add more details below anytime."}
                </T>
              ) : null}
            </View>
          ) : (
            messages.map((message, index) => {
              const day = dayLabel(message.sentAt);
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <View key={message._id || index} style={{ gap: 10 }}>
                  {showDay && day ? (
                    <View style={{ alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: c.surfaceAlt, marginVertical: 4 }}>
                      <T variant="label" color="muted">
                        {day}
                      </T>
                    </View>
                  ) : null}
                  <MessageBubble message={message} teacherName={teacherName} teacherAvatar={teacherAvatar} />
                </View>
              );
            })
          )}
        </View>

        {/* Feedback: once the ticket is resolved or closed */}
        {final ? (
          <Card tone="warning" padding={16}>
            {feedbackDone ? (
              <Row gap={12} align="flex-start">
                <IconChip icon="star" tone="warning" size={40} />
                <View style={{ flex: 1, gap: 5 }}>
                  <T variant="bodyStrong">Thanks for your feedback!</T>
                  <Row gap={8}>
                    <StarRating value={ticket.feedback?.rating ?? 0} readOnly size={16} />
                    <T variant="smallStrong" color="muted">
                      {RATING_LABELS[ticket.feedback?.rating ?? 0] ?? ""}
                    </T>
                  </Row>
                  {ticket.feedback?.comment ? (
                    <T variant="body" color="muted" style={{ fontStyle: "italic" }}>
                      “{ticket.feedback.comment}”
                    </T>
                  ) : null}
                </View>
              </Row>
            ) : (
              <View style={{ gap: 12 }}>
                <View>
                  <T variant="bodyStrong">How was your support experience?</T>
                  <T variant="small" color="muted">
                    Your rating is shared with the support team to help them improve.
                  </T>
                </View>
                <Row gap={12}>
                  <StarRating value={feedbackRating} onChange={setFeedbackRating} size={28} />
                  {feedbackRating > 0 ? (
                    <T variant="bodyStrong" color="warning">
                      {RATING_LABELS[feedbackRating]}
                    </T>
                  ) : null}
                </Row>
                <Input value={feedbackComment} onChangeText={setFeedbackComment} multiline maxLength={500} accessibilityLabel="Feedback comment" placeholder="Anything we could have done better? (optional)" />
                <Button title="Submit feedback" icon="send" variant="navy" disabled={feedbackRating === 0} loading={submittingFeedback} onPress={() => void submitFeedback()} />
              </View>
            )}
          </Card>
        ) : null}

        {final ? (
          <Row gap={6} justify="center" align="flex-start" style={{ paddingHorizontal: 8 }}>
            <Icon name="lock" size={12} color={c.textFaint} style={{ marginTop: 2 }} />
            <T variant="caption" color="faint" center style={{ flexShrink: 1 }}>
              {"This ticket is finalized and can't be reopened. Raise a new ticket for new concerns."}
            </T>
          </Row>
        ) : null}
      </ScrollView>

      {/* Rendered inside this sheet so it opens on top of it */}
      <EditTicketSheet
        key={editSeq}
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        ticket={ticket}
        onSaved={(updated) => {
          onSync(updated);
          notify("success", "Ticket updated successfully.");
        }}
      />
    </Sheet>
  );
}

function MessageBubble({ message, teacherName, teacherAvatar }: { message: TicketMessage; teacherName: string; teacherAvatar: string }) {
  const { c } = useTheme();
  const own = isOwnMessage(message);
  const files = (message.attachments || []).filter((file) => !!file.url);
  const fg = own ? "#ffffff" : c.text;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, justifyContent: own ? "flex-end" : "flex-start" }}>
      {!own ? <StaffAvatar name={message.senderName} /> : null}
      <View style={{ maxWidth: "80%", alignItems: own ? "flex-end" : "flex-start" }}>
        {!own ? (
          <Row gap={6} style={{ marginBottom: 3, paddingHorizontal: 4 }}>
            <T variant="caption" weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
              {message.senderName || "Support Team"}
            </T>
            <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: c.warningSoft }}>
              <Text style={{ color: c.warningText, fontSize: 9, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }}>Staff</Text>
            </View>
          </Row>
        ) : null}
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 16,
            borderBottomRightRadius: own ? 5 : 16,
            borderBottomLeftRadius: own ? 16 : 5,
            backgroundColor: own ? c.primary : c.surfaceAlt,
            borderWidth: own ? 0 : 1,
            borderColor: c.border,
            gap: 6,
          }}
        >
          <Text selectable style={{ color: fg, fontSize: 13.5, lineHeight: 20 }}>
            {message.content}
          </Text>
          {files.map((file, index) => (
            <Pressable key={file._id || index} onPress={() => void openExternal(file.url)} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
              <Icon name="paperclip" size={13} color={fg} />
              <Text numberOfLines={1} style={{ color: fg, fontSize: 12.5, fontWeight: "600", textDecorationLine: "underline", flexShrink: 1 }}>
                {file.title || "Attachment"}
              </Text>
            </Pressable>
          ))}
        </View>
        <T variant="caption" color="faint" style={{ marginTop: 3, paddingHorizontal: 4, fontSize: 10 }}>
          {own ? "You · " : ""}
          {formatTicketTime(message.sentAt)}
        </T>
      </View>
      {own ? <Avatar uri={teacherAvatar ? absoluteUrl(teacherAvatar) : null} name={teacherName || "You"} size={30} /> : null}
    </View>
  );
}
