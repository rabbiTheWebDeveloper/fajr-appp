import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ApiError, apiRaw } from "@/api/client";
import { successFeedback } from "@/lib/device";
import { useFetch } from "@/lib/hooks";
import { useTeacher } from "@/screens/teacher/TeacherContext";
import { RequestItem, type CeoRequest, type CeoRequestType } from "@/screens/teacher/ceo/RequestItem";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Banner, Button, Card, Divider, EmptyState, ErrorState, Icon, IconButton, Input, MIcon, Row, Screen, Skeleton, T, type IconName, type MIconName, type ScrollViewRef } from "@/ui";

const REQUESTS_PATH = "/api/teacher-portal/ceo-requests";
/** The server refuses a 4th problem report in one (Bangladesh-time) month */
const MONTHLY_PROBLEM_LIMIT = 3;

/** GET /api/teacher-portal/ceo-requests */
interface RequestsReply {
  success?: boolean;
  message?: string;
  requests?: CeoRequest[];
  total?: number;
  page?: number;
  totalPages?: number;
  monthlyProblemCount?: number;
}

/** CEO Direct Line: send the CEO a meeting request or a problem report and follow the answers (the website's /teacher/ceo-request) */
export default function TeacherCeoRequestScreen() {
  const { c } = useTheme();
  const { gems, refreshGems } = useTeacher();

  const [selectedType, setSelectedType] = useState<CeoRequestType | "">("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);

  const scrollRef = useRef<ScrollViewRef>(null);

  const { data, loading, refreshing, error, refresh, reload, retry } = useFetch<RequestsReply>(REQUESTS_PATH, { limit: 20 });
  const requests = data?.requests ?? [];
  const monthlyProblemCount = data?.monthlyProblemCount || 0;
  const problemLimitReached = monthlyProblemCount >= MONTHLY_PROBLEM_LIMIT;

  const handleSubmit = async () => {
    if (!selectedType) {
      setErrorMsg("Please select a request type.");
      return;
    }
    if (selectedType === "problem_report" && problemLimitReached) {
      setErrorMsg("You have reached the monthly limit of 3 problem reports.");
      return;
    }
    if (!subject.trim()) {
      setErrorMsg("Subject is required.");
      return;
    }
    if (!message.trim()) {
      setErrorMsg("Message is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const reply = await apiRaw<{ success?: boolean; message?: string }>(REQUESTS_PATH, { method: "POST", body: { type: selectedType, subject, message } });
      if (reply.data?.success) {
        successFeedback();
        setSuccessMsg("Your request has been submitted. The CEO has been notified via Telegram.");
        // A meeting request costs 10 gems: bring the balance up to date
        if (selectedType === "meeting_request") void refreshGems();
        setSelectedType("");
        setSubject("");
        setMessage("");
        setShowForm(false);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        void reload();
      } else {
        setErrorMsg(reply.data?.message || "Failed to submit request.");
      }
    } catch (e) {
      setErrorMsg(e instanceof ApiError && e.message ? e.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} scrollRef={scrollRef}>
      {/* ── Header ── */}
      <Row gap={10}>
        <T variant="small" color="muted" style={{ flex: 1 }}>
          Submit a meeting request or problem report
        </T>
        <IconButton icon="refresh-cw" onPress={() => void refresh()} disabled={loading || refreshing} accessibilityLabel="Refresh requests" background={c.surface} />
        <Button title={showForm ? "Close" : "New Request"} icon={showForm ? "x" : "send"} variant={showForm ? "secondary" : "primary"} size="sm" onPress={() => setShowForm((v) => !v)} />
      </Row>

      {/* ── Success banner ── */}
      {successMsg ? <Banner tone="success" title="Request Submitted Successfully!" message={successMsg} onClose={() => setSuccessMsg("")} /> : null}

      {/* ── Form card ── */}
      {showForm ? (
        <Card padding={0} style={{ overflow: "hidden" }}>
          <View style={{ height: 4, backgroundColor: c.primary }} />
          <View style={{ padding: 16, gap: 16 }}>
            <Row gap={8} wrap>
              <MIcon name="creation" size={15} color={c.primary} />
              <T variant="bodyStrong">New Request</T>
              <T variant="small" color="faint">
                · Notifies CEO via Telegram instantly
              </T>
            </Row>

            {/* Monthly limit alert */}
            {problemLimitReached ? (
              <Banner
                tone="warning"
                icon="alert-triangle"
                title="Monthly Limit Reached"
                message={`You have submitted ${monthlyProblemCount} problem reports this month. The monthly limit is ${MONTHLY_PROBLEM_LIMIT}. Meeting requests are unaffected.`}
              />
            ) : null}

            {/* ── Type selector ── */}
            <View style={{ gap: 8 }}>
              <T variant="label" color="muted">
                Request Type
              </T>
              <TypeCard
                mIcon="calendar-clock"
                title="Request CEO Meeting"
                description="Schedule a direct meeting with the CEO to discuss your concerns or ideas."
                selected={selectedType === "meeting_request"}
                solid={c.primary}
                soft={c.primarySoft}
                softText={c.primaryText}
                onPress={() => setSelectedType("meeting_request")}
                footer={(active) => (
                  <Row gap={8} wrap style={{ marginTop: 10 }}>
                    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, backgroundColor: active ? "rgba(255,255,255,0.2)" : c.primarySoft }}>
                      <Text style={{ color: active ? "#ffffff" : c.primaryText, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" }}>Cost: 10 💎</Text>
                    </View>
                    {gems ? <Text style={{ color: active ? "rgba(255,255,255,0.85)" : c.textFaint, fontSize: 11, fontWeight: "600" }}>You have {gems.totalGems} 💎</Text> : null}
                  </Row>
                )}
              />
              <TypeCard
                icon="alert-triangle"
                title="Report a Problem"
                titleNote={problemLimitReached ? "(3/3 submitted)" : undefined}
                description={problemLimitReached ? "You have reached your limit of 3 problem reports for this month. Try again next month." : "Report any issue, complaint, or problem you are facing directly to the CEO."}
                selected={selectedType === "problem_report" && !problemLimitReached}
                disabled={problemLimitReached}
                solid={c.danger}
                soft={c.dangerSoft}
                softText={c.dangerText}
                onPress={() => setSelectedType("problem_report")}
              />
            </View>

            {/* ── Subject ── */}
            <View style={{ gap: 4 }}>
              <Input label="Subject" value={subject} onChangeText={setSubject} maxLength={150} placeholder="Brief summary of your request..." />
              <T variant="caption" color="faint" style={{ textAlign: "right" }}>
                {subject.length}/150
              </T>
            </View>

            {/* ── Message ── */}
            <View style={{ gap: 4 }}>
              <Input
                label="Message"
                value={message}
                onChangeText={setMessage}
                maxLength={1000}
                multiline
                placeholder="Describe your request or problem in detail. Include any relevant information that will help the CEO understand your situation..."
              />
              <T variant="caption" color="faint" style={{ textAlign: "right" }}>
                {message.length}/1000
              </T>
            </View>

            {errorMsg ? <Banner tone="danger" icon="alert-triangle" message={errorMsg} onClose={() => setErrorMsg("")} /> : null}

            <Button title={submitting ? "Submitting..." : "Submit Request"} icon="send" iconRight="arrow-right" size="lg" block loading={submitting} onPress={() => void handleSubmit()} />
          </View>
        </Card>
      ) : null}

      {/* ── Submitted requests ── */}
      <Card padding={0} style={{ overflow: "hidden" }}>
        <Row justify="space-between" style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Row gap={8}>
            <Icon name="message-square" size={15} color={c.textFaint} />
            <T variant="bodyStrong">My Requests</T>
          </Row>
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: c.surfaceAlt }}>
            <T variant="caption" weight="700" color="muted">
              {requests.length}
            </T>
          </View>
        </Row>

        {loading ? (
          <View accessibilityLabel="Loading">
            {Array.from({ length: 3 }, (_, i) => (
              <View key={i}>
                {i > 0 ? <Divider /> : null}
                <View style={{ padding: 16, gap: 9 }}>
                  <Row gap={6}>
                    <Skeleton width={64} height={16} rounded={5} />
                    <Skeleton width={70} height={16} rounded={8} />
                    <Skeleton width={76} height={16} rounded={8} />
                  </Row>
                  <Skeleton width="72%" height={13} />
                  <Skeleton width="40%" height={10} />
                </View>
              </View>
            ))}
          </View>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={retry} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon="inbox"
            tone="neutral"
            title="No requests yet"
            message="Use the form above to send your first request"
            actionLabel={showForm ? undefined : "New Request"}
            onAction={showForm ? undefined : () => setShowForm(true)}
          />
        ) : (
          requests.map((request, index) => (
            <View key={request._id}>
              {index > 0 ? <Divider /> : null}
              <RequestItem request={request} expanded={expandedId === request._id} onToggle={() => setExpandedId(expandedId === request._id ? null : request._id)} />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

interface TypeCardProps {
  icon?: IconName;
  mIcon?: MIconName;
  title: string;
  /** A short note after the title (the "3/3 submitted" marker) */
  titleNote?: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  /** Background when selected */
  solid: string;
  /** Icon tile background and icon colour when not selected */
  soft: string;
  softText: string;
  onPress: () => void;
  footer?: (active: boolean) => React.ReactNode;
}

/** One of the two request types: fills with its colour when chosen */
function TypeCard({ icon, mIcon, title, titleNote, description, selected, disabled, solid, soft, softText, onPress, footer }: TypeCardProps) {
  const { c } = useTheme();
  const iconColor = disabled ? c.textFaint : selected ? "#ffffff" : softText;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={{ padding: 16, borderRadius: radius.lg, borderWidth: 2, borderColor: selected ? solid : c.border, backgroundColor: selected ? solid : c.surfaceAlt, opacity: disabled ? 0.6 : 1 }}
    >
      <Row gap={12} align="flex-start">
        <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: disabled ? c.border : selected ? "rgba(255,255,255,0.2)" : soft }}>
          {mIcon ? <MIcon name={mIcon} size={21} color={iconColor} /> : <Icon name={icon ?? "circle"} size={20} color={iconColor} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="bodyStrong" color={disabled ? "faint" : selected ? "#ffffff" : "text"}>
            {title}
            {titleNote ? (
              <T variant="caption" weight="600" color="danger">
                {" "}
                {titleNote}
              </T>
            ) : null}
          </T>
          <T variant="small" color={disabled ? "faint" : selected ? "rgba(255,255,255,0.85)" : "muted"} style={{ marginTop: 4, lineHeight: 18 }}>
            {description}
          </T>
          {footer ? footer(selected) : null}
        </View>
        {selected ? <Icon name="check-circle" size={18} color="#ffffff" /> : null}
      </Row>
    </Pressable>
  );
}
