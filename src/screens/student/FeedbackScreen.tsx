import React, { useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { ApiError, api, errorMessage } from "@/api/client";
import { successFeedback, tapFeedback, warningFeedback } from "@/lib/device";
import { useFetch } from "@/lib/hooks";
import { HistoryCard } from "@/screens/student/feedback/HistoryCard";
import { ScoreButtons } from "@/screens/student/feedback/ScoreButtons";
import { DEFAULT_RATINGS, RATING_CATEGORIES, type FeedbackReply, type RatingKey, type Ratings } from "@/screens/student/feedback/types";
import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  GradientCard,
  Icon,
  IconChip,
  Input,
  Row,
  Screen,
  SectionHeader,
  Select,
  Skeleton,
  SkeletonList,
  StarRating,
  T,
  type IconName,
  type ScrollViewRef,
} from "@/ui";

function Hero() {
  return (
    <GradientCard gradient="navyDeep" padding={18}>
      <Row gap={14}>
        <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(37,99,235,0.3)", borderWidth: 1, borderColor: "rgba(96,165,250,0.2)" }}>
          <Icon name="file-text" size={22} color="#93c5fd" />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="h2" color="onDark">
            Monthly Feedback
          </T>
          <T variant="small" color="onDarkMuted">
            Every month review helps us improve the quality of your classes
          </T>
        </View>
      </Row>
    </GradientCard>
  );
}

/** "Yes" / "No" answer to the recommendation question */
function RecommendButton({ label, icon, selected, tone, disabled, onPress }: { label: string; icon: IconName; selected: boolean; tone: "success" | "danger"; disabled: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const fg = selected ? (tone === "success" ? c.successText : c.dangerText) : c.textMuted;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => ({
        flex: 1,
        height: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? (tone === "success" ? c.success : c.danger) : c.borderStrong,
        backgroundColor: selected ? (tone === "success" ? c.successSoft : c.dangerSoft) : c.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name={icon} size={16} color={fg} />
      <T variant="bodyStrong" color={fg}>
        {label}
      </T>
    </Pressable>
  );
}

export default function StudentFeedbackScreen() {
  const { c } = useTheme();
  const scrollRef = useRef<ScrollViewRef>(null);
  const { data, loading, refreshing, error: loadError, refresh, reload, retry } = useFetch<FeedbackReply>("/api/student-portal/feedback");

  const [courseId, setCourseId] = useState("");
  const [ratings, setRatings] = useState<Ratings>(DEFAULT_RATINGS);
  const [likeMost, setLikeMost] = useState("");
  const [couldImprove, setCouldImprove] = useState("");
  const [issuesConcerns, setIssuesConcerns] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // A course can come back twice (two active enrolments in it): list it once
  const courses = (data?.enrolledCourses ?? []).filter((course, index, all) => all.findIndex((other) => other._id === course._id) === index);
  const teacher = data?.teacherInfo ?? null;
  const feedbacks = data?.pastFeedbacks ?? [];
  const submittedCourseIds = data?.submittedCourseIds ?? [];

  // The first course is chosen until the student picks another one (or when the chosen one is no longer enrolled)
  const selectedCourseId = courses.some((course) => course._id === courseId) ? courseId : (courses[0]?._id ?? "");
  // One evaluation per course per calendar month: the server reports which courses are done for this month
  const isAlreadySubmitted = selectedCourseId !== "" && submittedCourseIds.includes(selectedCourseId);

  const setRating = (key: RatingKey, value: number) => setRatings((prev) => ({ ...prev, [key]: value }));

  // The messages sit at the top of the form and the button at the bottom, so bring them into view
  const showTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  const fail = (text: string) => {
    setMessage("");
    setError(text);
    warningFeedback();
    showTop();
  };

  const submit = async () => {
    if (!selectedCourseId) return fail("Please select a course.");
    if (!teacher) return fail("No teacher assigned. Contact admin.");
    if (recommend === null) return fail("Please specify whether you would recommend this teacher.");

    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const reply = await api.post<{ success?: boolean; message?: string }>("/api/student-portal/feedback", {
        courseId: selectedCourseId,
        teacherId: teacher._id,
        rating: ratings.overallSatisfaction,
        teachingClarity: ratings.teachingClarity,
        punctuality: ratings.punctuality,
        subjectKnowledge: ratings.subjectKnowledge,
        behaviorPatience: ratings.behaviorPatience,
        classEngagement: ratings.classEngagement,
        useOfClassTime: ratings.useOfClassTime,
        likeMost,
        couldImprove,
        issuesConcerns,
        recommend,
      });
      if (reply.success) {
        setMessage("Thank you! Feedback submitted successfully.");
        successFeedback();
        setRatings(DEFAULT_RATINGS);
        setLikeMost("");
        setCouldImprove("");
        setIssuesConcerns("");
        setRecommend(null);
        // Brings back the new history entry and marks this course as done for the month
        void reload();
      } else {
        setError(reply.message || "Failed to submit feedback.");
        warningFeedback();
      }
    } catch (e) {
      // The server's own message comes through here (e.g. "already submitted an evaluation for this course this month")
      setError(e instanceof ApiError && e.isNetwork ? "Network error. Please try again." : errorMessage(e, "Failed to submit feedback."));
      warningFeedback();
    } finally {
      setSubmitting(false);
      showTop();
    }
  };

  if (loading) {
    return (
      <Screen>
        <Hero />
        <Card style={{ gap: 14 }}>
          <Skeleton width="60%" height={16} />
          <Skeleton height={46} rounded={12} />
          <Skeleton height={46} rounded={12} />
          <Skeleton height={120} rounded={12} />
          <Skeleton height={84} rounded={12} />
        </Card>
        <SkeletonList count={2} />
      </Screen>
    );
  }

  if (!data || !data.success) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <Hero />
        <Card>
          <ErrorState title="Could not load the feedback form" message={loadError || data?.message || "Please try again."} onRetry={retry} />
        </Card>
      </Screen>
    );
  }

  // A course already evaluated this month shows its form greyed out and locked
  const locked = isAlreadySubmitted;
  const dimmed = { opacity: locked ? 0.6 : 1 };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing} scrollRef={scrollRef}>
      <Hero />

      {/* A refresh that failed keeps the form on screen: say so instead of failing silently */}
      {loadError ? <Banner tone="warning" title="Could not refresh" message={loadError} /> : null}

      <Card style={{ gap: 16 }}>
        <Row gap={10}>
          <IconChip icon="send" size={36} />
          <View style={{ flex: 1 }}>
            <T variant="title">Monthly Teacher Evaluation Form</T>
            <T variant="caption" color="muted">
              Provide monthly rating to help us serve you better
            </T>
          </View>
        </Row>
        <Divider />

        {error ? <Banner tone="danger" message={error} /> : null}
        {message ? <Banner tone="success" message={message} /> : null}

        <Select
          label="Select Course"
          title="Select Course"
          icon="book-open"
          value={selectedCourseId || null}
          options={courses.map((course) => ({ value: course._id, label: course.title }))}
          onChange={(next) => {
            setCourseId(next);
            setError("");
          }}
          placeholder={courses.length === 0 ? "No active courses" : "Select a course"}
          disabled={courses.length === 0}
        />

        <Field label="Assigned Teacher">
          {teacher ? (
            <Row gap={10} style={{ minHeight: 46, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.primarySoft }}>
              <Avatar uri={teacher.avatar || null} name={teacher.name} size={30} square />
              <T variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                {teacher.name}
              </T>
            </Row>
          ) : (
            <Banner tone="warning" message="No teacher assigned." icon="alert-circle" />
          )}
        </Field>

        {locked ? (
          <Banner
            tone="warning"
            icon="alert-circle"
            title="Evaluation Already Submitted"
            message="You have already completed the monthly evaluation for this course. Reviews are limited to one submission per calendar month."
          />
        ) : null}

        <View style={[{ gap: 10 }, dimmed]}>
          <T variant="label" color="muted">
            Teacher Performance Ratings
          </T>
          <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: c.border, overflow: "hidden" }}>
            {RATING_CATEGORIES.map((category, index) => (
              <View key={category.key} style={{ padding: 12, gap: 10, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: c.border }}>
                <View>
                  <T variant="bodyStrong">{category.label}</T>
                  <T variant="caption" color="faint">
                    {category.description}
                  </T>
                </View>
                <ScoreButtons label={category.label} value={ratings[category.key]} onChange={(next) => setRating(category.key, next)} disabled={locked} />
              </View>
            ))}
          </View>
        </View>

        <View style={[{ gap: 12 }, dimmed]}>
          <T variant="label" color="muted">
            Additional Class Insights
          </T>
          <Input
            label="What did you like most about this teacher's class?"
            value={likeMost}
            onChangeText={setLikeMost}
            placeholder="E.g., teaching style, pacing, explanations, friendliness..."
            multiline
            disabled={locked}
          />
          <Input label="What could be improved?" value={couldImprove} onChangeText={setCouldImprove} placeholder="E.g., class timing, notes, homework review speed..." multiline disabled={locked} />
          <Input
            label="Any issues or concerns to report?"
            value={issuesConcerns}
            onChangeText={setIssuesConcerns}
            placeholder="E.g., technical difficulties, audio issues, or general concerns..."
            multiline
            disabled={locked}
          />
        </View>

        <Field label="Would you recommend this teacher to other students?" style={dimmed}>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 12 }}>
            <RecommendButton
              label="Yes"
              icon="thumbs-up"
              tone="success"
              selected={recommend === true}
              disabled={locked}
              onPress={() => {
                tapFeedback();
                setRecommend(true);
              }}
            />
            <RecommendButton
              label="No"
              icon="thumbs-down"
              tone="danger"
              selected={recommend === false}
              disabled={locked}
              onPress={() => {
                tapFeedback();
                setRecommend(false);
              }}
            />
          </View>
        </Field>

        <Field label="Overall satisfaction" style={dimmed}>
          <View style={{ alignItems: "center", gap: 6 }}>
            <StarRating value={ratings.overallSatisfaction} onChange={(next) => setRating("overallSatisfaction", next)} size={32} readOnly={locked} />
            <Row justify="space-between" style={{ alignSelf: "stretch" }}>
              <T variant="caption" color="faint">
                Very Dissatisfied
              </T>
              <T variant="caption" color="faint">
                Very Satisfied
              </T>
            </Row>
          </View>
        </Field>

        <Divider />
        <Button
          title={locked ? "Submitted For This Month" : "Submit Evaluation"}
          icon="send"
          block
          loading={submitting}
          disabled={locked || !teacher || courses.length === 0}
          onPress={() => void submit()}
        />
      </Card>

      <View style={{ gap: 12 }}>
        <SectionHeader title="Evaluation History" icon="clock" action={<Badge label={String(feedbacks.length)} tone="primary" />} />
        {feedbacks.length === 0 ? (
          <Card>
            <EmptyState icon="file-text" title="No evaluations yet" message="Your submitted evaluations will appear here." compact />
          </Card>
        ) : (
          feedbacks.map((feedback) => (
            <HistoryCard key={feedback._id} feedback={feedback} expanded={expandedId === feedback._id} onToggle={() => setExpandedId((current) => (current === feedback._id ? null : feedback._id))} />
          ))
        )}
      </View>
    </Screen>
  );
}
