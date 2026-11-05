import React, { useState } from "react";
import { Pressable, View } from "react-native";

import { successFeedback } from "@/lib/device";
import { CATEGORIES, PRIORITIES, ticketCode, ticketMutation, type Priority, type TicketItem } from "@/screens/teacher/helpdesk/helpdesk-utils";
import { CategoryTile } from "@/screens/teacher/helpdesk/parts";
import { useTheme } from "@/theme/ThemeContext";
import { radius, toneColors } from "@/theme/palette";
import { Banner, Button, Field, Icon, Input, ProgressBar, Row, Sheet, T } from "@/ui";

const TIPS = ["Student name & batch", "Date / class time", "What you've already tried"];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The topic chosen from "Start a request" (opens straight on step 2), or "" */
  initialCategory: string;
  /** Only one active (open / in-progress / on-hold) ticket is allowed at a time */
  hasActiveTicket: boolean;
  /** The ticket was created: the list must refresh */
  onCreated: () => void;
  onView: (ticket: TicketItem) => void;
}

/**
 * "Raise a new ticket": step 1 picks the topic, step 2 takes subject, priority and description, step 3 confirms.
 * The parent gives it a new `key` each time it opens, so the form always starts clean.
 */
export function CreateTicketSheet({ visible, onClose, initialCategory, hasActiveTicket, onCreated, onView }: Props) {
  const { c } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(initialCategory ? 2 : 1);
  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState(initialCategory);
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<TicketItem | null>(null);

  const selectedCat = CATEGORIES.find((cat) => cat.label === category);

  const pickCategory = (label: string) => {
    // The subject follows the topic until the teacher types their own
    const prevWasDefault = !title || title === category;
    setCategory(label);
    if (prevWasDefault) setTitle(label);
    setStep(2);
  };

  const submit = async () => {
    setFormError("");
    if (hasActiveTicket) {
      setFormError("You already have an active ticket. Only one active ticket is allowed at a time — please continue in that thread.");
      return;
    }
    if (!category) {
      setFormError("Please choose a category.");
      setStep(1);
      return;
    }
    if (description.trim().length < 10) {
      setFormError("Please describe the issue in a little more detail (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    const result = await ticketMutation("POST", { category, title: title.trim() || category, description: description.trim(), priority }, "Failed to create support ticket.");
    setSubmitting(false);
    if (result.data) {
      successFeedback();
      setCreated(result.data.ticket ?? null);
      setStep(3);
      onCreated();
    } else {
      setFormError(result.error || "Failed to create support ticket.");
    }
  };

  if (step === 3) {
    return (
      <Sheet visible={visible} onClose={onClose}>
        <View style={{ alignItems: "center", paddingVertical: 18, gap: 6 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", backgroundColor: c.success, marginBottom: 10 }}>
            <Icon name="check" size={38} color="#ffffff" />
          </View>
          <T variant="h2" center>
            Ticket submitted!
          </T>
          {created ? (
            <T variant="mono" color="primary" center style={{ fontSize: 14 }}>
              #{ticketCode(created)}
            </T>
          ) : null}
          <T variant="body" color="muted" center style={{ maxWidth: 320 }}>
            {"Our team has been notified. You'll see their reply in the conversation thread — usually within 2–4 business hours."}
          </T>
          <Row gap={10} style={{ marginTop: 16, alignSelf: "stretch" }}>
            <Button title="Done" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            {created ? (
              <Button
                title="View ticket"
                onPress={() => {
                  onClose();
                  onView(created);
                }}
                style={{ flex: 1 }}
              />
            ) : null}
          </Row>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Raise a new ticket"
      subtitle={step === 1 ? "Step 1 of 2 — What do you need help with?" : "Step 2 of 2 — Tell us what's happening"}
      footer={
        step === 1 ? (
          <Row justify="flex-end" gap={10}>
            <Button title="Cancel" variant="ghost" onPress={onClose} />
            <Button title="Continue" iconRight="arrow-right" disabled={!category} onPress={() => setStep(2)} />
          </Row>
        ) : (
          <Row justify="space-between" gap={10}>
            <Button title="Back" variant="ghost" icon="arrow-left" onPress={() => setStep(1)} />
            <Button title={submitting ? "Submitting…" : "Submit ticket"} icon="send" loading={submitting} onPress={() => void submit()} />
          </Row>
        )
      }
    >
      <ProgressBar value={step === 1 ? 50 : 100} height={4} />

      {step === 1 ? (
        <View accessibilityRole="radiogroup" accessibilityLabel="Ticket category" style={{ gap: 10 }}>
          {CATEGORIES.map((cat) => {
            const selected = category === cat.label;
            return (
              <Pressable
                key={cat.label}
                onPress={() => pickCategory(cat.label)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: selected ? 2 : 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : "transparent" }}
              >
                <CategoryTile cat={cat} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T variant="bodyStrong" color={selected ? "primary" : "text"}>
                    {cat.short}
                  </T>
                  <T variant="small" color="muted">
                    {cat.desc}
                  </T>
                </View>
                <Icon name={selected ? "check-circle" : "chevron-right"} size={selected ? 18 : 16} color={selected ? c.primary : c.textFaint} style={{ marginTop: 2 }} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          {formError ? <Banner tone="danger" message={formError} /> : null}

          {selectedCat ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt }}>
              <CategoryTile cat={selectedCat} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T variant="label" color="faint">
                  Topic
                </T>
                <T variant="bodyStrong" numberOfLines={2}>
                  {selectedCat.label}
                </T>
              </View>
              <Button title="Change" variant="ghost" size="sm" onPress={() => setStep(1)} />
            </View>
          ) : null}

          <Input label="Subject" value={title} onChangeText={setTitle} maxLength={120} placeholder="e.g. Missing class count for 12 March" />

          <Field label="Priority">
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {PRIORITIES.map((p) => {
                const selected = priority === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => setPriority(p.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={{ flexBasis: "47%", flexGrow: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, borderWidth: selected ? 2 : 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : "transparent" }}
                  >
                    <Row gap={6}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: toneColors(c, p.tone).solid }} />
                      <T variant="smallStrong">{p.label}</T>
                    </Row>
                    <T variant="caption" color="muted">
                      {p.hint}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <View style={{ gap: 6 }}>
            <Row justify="space-between">
              <T variant="smallStrong" color="muted">
                Describe the issue
              </T>
              <T variant="caption" weight="700" color={description.length > 1800 ? "danger" : "faint"}>
                {description.length}/2000
              </T>
            </Row>
            <Input
              value={description}
              onChangeText={setDescription}
              maxLength={2000}
              multiline
              accessibilityLabel="Describe the issue"
              placeholder="What happened, when, and who is involved? Include student names, batch, dates or class times."
            />
            <Row gap={6} wrap>
              {TIPS.map((tip) => (
                <View key={tip} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: c.surfaceAlt }}>
                  <Icon name="check" size={11} color={c.success} />
                  <T variant="caption" color="muted">
                    {tip}
                  </T>
                </View>
              ))}
            </Row>
          </View>
        </>
      )}
    </Sheet>
  );
}
