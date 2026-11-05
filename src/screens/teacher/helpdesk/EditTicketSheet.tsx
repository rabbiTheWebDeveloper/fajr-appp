import React, { useState } from "react";
import { View } from "react-native";

import { CATEGORIES, resolveCategory, ticketCode, ticketMutation, type TicketItem } from "@/screens/teacher/helpdesk/helpdesk-utils";
import { Banner, Button, Input, Row, Select, Sheet, T } from "@/ui";

const TOPIC_OPTIONS = CATEGORIES.map((cat) => ({ value: cat.label, label: cat.label }));

interface Props {
  visible: boolean;
  onClose: () => void;
  ticket: TicketItem;
  /** Saved: the updated ticket goes back to every place it is shown */
  onSaved: (ticket: TicketItem) => void;
}

/** Edit an open ticket (topic, subject, description). The server refuses once a coordinator has started on it. */
export function EditTicketSheet({ visible, onClose, ticket, onSaved }: Props) {
  const [category, setCategory] = useState(() => {
    const cat = resolveCategory(ticket);
    // A ticket whose topic is not one of the listed ones falls back to "General Feedback & Other"
    return CATEGORIES.some((item) => item.label === cat.label) ? cat.label : CATEGORIES[CATEGORIES.length - 1].label;
  });
  const [title, setTitle] = useState(ticket.title || "");
  const [description, setDescription] = useState(ticket.description || "");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    if (!description.trim()) {
      setError("Description cannot be empty.");
      return;
    }
    setUpdating(true);
    const nextTitle = title.trim() || category;
    const result = await ticketMutation("PUT", { ticketId: ticket._id, category, title: nextTitle, description: description.trim() }, "Failed to update ticket.");
    setUpdating(false);
    if (result.data) {
      onSaved(result.data.ticket ?? { ...ticket, title: nextTitle, description: description.trim(), tags: [category] });
      onClose();
    } else {
      setError(result.error || "Failed to update ticket.");
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Edit ticket #${ticketCode(ticket)}`}
      subtitle="Open tickets can be edited until a coordinator starts working on them."
      footer={
        <Row justify="flex-end" gap={10}>
          <Button title="Cancel" variant="ghost" onPress={onClose} />
          <Button title={updating ? "Saving…" : "Save changes"} icon="check" loading={updating} onPress={() => void save()} />
        </Row>
      }
    >
      {error ? <Banner tone="danger" message={error} /> : null}
      <Select label="Topic" value={category} options={TOPIC_OPTIONS} onChange={setCategory} searchable={false} />
      <Input label="Subject" value={title} onChangeText={setTitle} maxLength={120} />
      <View style={{ gap: 6 }}>
        <Row justify="space-between">
          <T variant="smallStrong" color="muted">
            Description
          </T>
          <T variant="caption" weight="700" color="faint">
            {description.length}/2000
          </T>
        </Row>
        <Input value={description} onChangeText={setDescription} maxLength={2000} multiline accessibilityLabel="Description" />
      </View>
    </Sheet>
  );
}
