import React, { useState } from "react";
import { Pressable, View } from "react-native";

import { openExternal, openInApp } from "@/lib/device";
import { academyClock } from "@/lib/format";
import { SUGGESTED_EXPERTISE } from "@/lib/teacher-profile-helper";
import { radius, type Palette } from "@/theme/palette";
import { useStyles, useTheme } from "@/theme/ThemeContext";
import { Badge, Button, Card, Icon, IconButton, Input, Row, T, type IconName } from "@/ui";

import { EmptyBox, SaveStatusCard, SectionCard } from "@/screens/teacher/settings/parts";
import type { Achievement, Experience, Qualification } from "@/screens/teacher/settings/types";
import type { SettingsProfile } from "@/screens/teacher/settings/useSettingsProfile";

const IMPACT_DIMENSIONS = ["Students Mentored", "Hifz Completion Milestones", "Tajweed Fluency Rate", "Character & Islamic Adab"];

const makeStyles = (c: Palette) => ({
  /** One experience / qualification / achievement entry inside its card */
  entry: { gap: 10, padding: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt } as const,
  tagCloud: { flexDirection: "row", flexWrap: "wrap", gap: 8, minHeight: 46, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt, alignItems: "center" } as const,
  tag: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 6, minHeight: 34, borderRadius: radius.md, borderWidth: 1, borderColor: c.primary, backgroundColor: c.surface } as const,
});

/** Tab 2: what the public Teacher Portfolio shows: headline, link, skills, experience, qualifications, achievements, impact */
export function PortfolioTab({ settings }: { settings: SettingsProfile }) {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const { profile, updatePortfolio, setPortfolioList, unsaved, savingMode, busy } = settings;
  const [expertiseInput, setExpertiseInput] = useState("");

  const expertise = profile?.keyExpertise || [];
  const experiences = profile?.experiences || [];
  const qualifications = profile?.qualifications || [];
  const achievements = profile?.achievements || [];
  const portfolioUrl = (profile?.portfolioUrl || "").trim();

  const addExpertiseTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!expertise.includes(trimmed)) setPortfolioList("keyExpertise", [...expertise, trimmed]);
    setExpertiseInput("");
  };
  const removeExpertiseTag = (tag: string) => setPortfolioList("keyExpertise", expertise.filter((t) => t !== tag));

  const updateExperience = (index: number, field: keyof Experience, value: string) =>
    setPortfolioList("experiences", experiences.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  const updateQualification = (index: number, field: keyof Qualification, value: string | number) =>
    setPortfolioList("qualifications", qualifications.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  const updateAchievement = (index: number, field: keyof Achievement, value: string) =>
    setPortfolioList("achievements", achievements.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  return (
    <>
      <Card tone="warning" style={{ gap: 10 }}>
        <Row gap={6}>
          <Icon name="star" size={14} color={c.warningText} />
          <T variant="label" color="warning">
            Public Portfolio Showcase
          </T>
        </Row>
        <T variant="title">Career Experience, Expertise & Impact</T>
        <T variant="small" color="muted">
          These portfolio fields are displayed to prospective students, parents, and academic evaluators on the public Teacher Portfolio directory.
        </T>
        <Button title="Live Portfolio Preview" icon="eye" iconRight="external-link" size="sm" onPress={() => void openInApp("/teacher-portfolio")} />
      </Card>

      <SectionCard icon="star" tone="warning" title="Headline & External Portfolio Link" subtitle="Your professional tagline and external showcase/profile links.">
        <Input
          label="Professional Portfolio Headline / Tagline"
          icon="star"
          value={profile?.portfolioHeadline || ""}
          onChangeText={(text) => updatePortfolio("portfolioHeadline", text)}
          placeholder="e.g. Senior Quran & Tajweed Specialist | 7+ Yrs Exp | Ijazah Holder"
          hint="Appears prominently under your name on the public teacher card."
        />
        <Input
          label="Professional Portfolio / Website URL"
          icon="globe"
          value={profile?.portfolioUrl || ""}
          onChangeText={(text) => updatePortfolio("portfolioUrl", text)}
          placeholder="https://yourportfolio.com or LinkedIn / YouTube / Personal website"
          hint="Personal website, LinkedIn, research portfolio, or video channel."
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {portfolioUrl ? <Button title="Visit Link" iconRight="external-link" variant="ghost" size="sm" onPress={() => void openExternal(portfolioUrl.startsWith("http") ? portfolioUrl : `https://${portfolioUrl}`)} /> : null}
      </SectionCard>

      <SectionCard icon="tag" title="Key of Expertise" subtitle="Instructional specialties, recitation styles, and subject mastery." action={<Badge label={`${expertise.length} skills active`} tone="primary" />}>
        <View style={s.tagCloud}>
          {expertise.length > 0 ? (
            expertise.map((tag, index) => (
              <View key={`${tag}-${index}`} style={s.tag}>
                <T variant="smallStrong" color="primary" style={{ flexShrink: 1 }}>
                  {tag}
                </T>
                <IconButton icon="x" size={28} accessibilityLabel={`Remove skill ${tag}`} onPress={() => removeExpertiseTag(tag)} />
              </View>
            ))
          ) : (
            <T variant="small" color="faint" style={{ fontStyle: "italic", flex: 1 }}>
              No expertise tags added yet. Type below or tap one of the quick suggestions.
            </T>
          )}
        </View>

        <Input
          icon="tag"
          value={expertiseInput}
          onChangeText={setExpertiseInput}
          placeholder="Type an expertise (e.g. Tajweed, Quran Hifz, Tafsir, Arabic Grammar)"
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={() => addExpertiseTag(expertiseInput)}
          accessibilityLabel="New expertise"
        />
        <Button title="Add Skill" icon="plus" block onPress={() => addExpertiseTag(expertiseInput)} />

        <T variant="label" color="faint">
          Quick Add Popular Suggestions:
        </T>
        <Row gap={8} wrap>
          {SUGGESTED_EXPERTISE.map((suggestion) => {
            const added = expertise.includes(suggestion);
            return (
              <Pressable
                key={suggestion}
                onPress={() => (added ? removeExpertiseTag(suggestion) : addExpertiseTag(suggestion))}
                accessibilityRole="button"
                accessibilityState={{ selected: added }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: added ? c.success : c.border, backgroundColor: added ? c.successSoft : c.surface }}
              >
                <Icon name={added ? "check" : "plus"} size={14} color={added ? c.successText : c.textFaint} />
                <T variant="smallStrong" color={added ? "success" : "text"}>
                  {suggestion}
                </T>
              </Pressable>
            );
          })}
        </Row>
      </SectionCard>

      <SectionCard
        icon="briefcase"
        tone="success"
        title="Teaching Experience (Instituted, Position, Time)"
        subtitle="Historical teaching roles, previous institutions, and tenures."
        action={<Button title="Add Experience" icon="plus" variant="success" size="sm" onPress={() => setPortfolioList("experiences", [...experiences, { institute: "", position: "", time: "", description: "" }])} />}
      >
        {experiences.length > 0 ? (
          experiences.map((item, index) => (
            <View key={index} style={s.entry}>
              <EntryHeader icon="home" title={`Experience #${index + 1}`} removeLabel="Remove experience" onRemove={() => setPortfolioList("experiences", experiences.filter((_, i) => i !== index))} />
              <Input label="Institute / School / Organization" required value={item.institute || ""} onChangeText={(text) => updateExperience(index, "institute", text)} placeholder="e.g. Al-Madinah Quran Academy" />
              <Input label="Position / Designation" required value={item.position || ""} onChangeText={(text) => updateExperience(index, "position", text)} placeholder="e.g. Senior Tajweed & Qira'ah Instructor" />
              <Input label="Time Period / Duration" required value={item.time || ""} onChangeText={(text) => updateExperience(index, "time", text)} placeholder="e.g. 2020 - 2023 or 3 Years" />
              <Input
                label="Responsibilities & Highlights (Optional)"
                value={item.description || ""}
                onChangeText={(text) => updateExperience(index, "description", text)}
                placeholder="e.g. Mentored 80+ Hifz students, introduced phonetic Tajweed drills..."
              />
            </View>
          ))
        ) : (
          <EmptyBox icon="briefcase" title="No teaching experience entries recorded." message="Tap “Add Experience” to add your previous academies, roles, and duration." />
        )}
      </SectionCard>

      <SectionCard
        icon="book"
        title="Academic Sanad & Qualifications"
        subtitle="Degrees, academic certificates, and institution records."
        // A new row starts on the current year, as on the website
        action={<Button title="Add Qualification" icon="plus" size="sm" onPress={() => setPortfolioList("qualifications", [...qualifications, { degree: "", institute: "", passingYear: academyClock().getUTCFullYear() }])} />}
      >
        {qualifications.length > 0 ? (
          qualifications.map((item, index) => (
            <View key={index} style={s.entry}>
              <EntryHeader icon="book" title={`Qualification #${index + 1}`} removeLabel="Delete qualification" onRemove={() => setPortfolioList("qualifications", qualifications.filter((_, i) => i !== index))} />
              <Input value={item.degree || ""} onChangeText={(text) => updateQualification(index, "degree", text)} placeholder="Degree / Sanad (e.g. Dawra-e-Hadith, BSc in Arabic)" accessibilityLabel="Degree or Sanad" />
              <Input value={item.institute || ""} onChangeText={(text) => updateQualification(index, "institute", text)} placeholder="Institute / Madrasha / University" accessibilityLabel="Institute" />
              <Input
                value={item.passingYear ? String(item.passingYear) : ""}
                onChangeText={(text) => updateQualification(index, "passingYear", parseInt(text.replace(/\D/g, ""), 10) || "")}
                placeholder="Passing Year"
                keyboardType="number-pad"
                accessibilityLabel="Passing year"
              />
            </View>
          ))
        ) : (
          <EmptyBox icon="book" title="No educational qualifications added yet." />
        )}
      </SectionCard>

      <SectionCard
        icon="award"
        tone="warning"
        title="Key Achievements, Honors & Sanads"
        subtitle="Ijazahs, awards, certifications, or recitation accolades."
        action={<Button title="Add Achievement" icon="plus" variant="gold" size="sm" onPress={() => setPortfolioList("achievements", [...achievements, { title: "", year: "", description: "" }])} />}
      >
        {achievements.length > 0 ? (
          achievements.map((item, index) => (
            <View key={index} style={s.entry}>
              <EntryHeader icon="award" title={`Achievement #${index + 1}`} removeLabel="Remove achievement" onRemove={() => setPortfolioList("achievements", achievements.filter((_, i) => i !== index))} />
              <Input label="Achievement Title / Honor" required value={item.title || ""} onChangeText={(text) => updateAchievement(index, "title", text)} placeholder="e.g. Ijazah in Hafs 'an 'Asim with connected Sanad" />
              <Input label="Year / Date" value={item.year || ""} onChangeText={(text) => updateAchievement(index, "year", text)} placeholder="e.g. 2023" />
              <Input
                label="Awarding Authority / Details (Optional)"
                value={item.description || ""}
                onChangeText={(text) => updateAchievement(index, "description", text)}
                placeholder="e.g. Issued by Sheikh Al-Minshawi Institute of Quranic Sciences"
              />
            </View>
          ))
        ) : (
          <EmptyBox icon="award" title="No achievements or honors added yet." />
        )}
      </SectionCard>

      <SectionCard icon="trending-up" title="Teaching Impact & Student Transformations" subtitle="Measurable influence, memorization rates, and student retention stories.">
        <Input
          multiline
          value={profile?.impact || ""}
          onChangeText={(text) => updatePortfolio("impact", text)}
          placeholder="e.g. Over the past 6 years, mentored 250+ students across 8 countries. Helped 32 students successfully complete full Quran Hifz with connected Sanad, and guided 150+ beginner children to recite the Holy Quran with precise Makharij and Tajweed..."
          accessibilityLabel="Teaching impact"
        />
        <View style={{ gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: c.primarySoft }}>
          <Row gap={6}>
            <Icon name="target" size={14} color={c.primaryText} />
            <T variant="smallStrong" color="primary">
              Key Impact Dimensions:
            </T>
          </Row>
          <Row gap={6} wrap>
            {IMPACT_DIMENSIONS.map((dimension) => (
              <Badge key={dimension} label={dimension} tone="neutral" />
            ))}
          </Row>
        </View>
      </SectionCard>

      <SaveStatusCard
        unsaved={unsaved.portfolio}
        title={unsaved.portfolio ? "Unsaved Portfolio Details" : "Portfolio & Career Details Up to Date"}
        message={unsaved.portfolio ? "Save your updated skills, experiences, qualifications, and impact." : "Your public teacher portfolio is synchronized."}
        buttonTitle={savingMode === "portfolio" ? "Saving Portfolio Changes..." : "Save Portfolio Changes"}
        saving={savingMode === "portfolio"}
        disabled={busy}
        onSave={() => void settings.save("portfolio")}
      />
    </>
  );
}

function EntryHeader({ icon, title, removeLabel, onRemove }: { icon: IconName; title: string; removeLabel: string; onRemove: () => void }) {
  const { c } = useTheme();
  return (
    <Row justify="space-between">
      <Row gap={6}>
        <Icon name={icon} size={15} color={c.textMuted} />
        <T variant="smallStrong">{title}</T>
      </Row>
      <Button title="Delete" icon="trash-2" variant="dangerSoft" size="sm" accessibilityLabel={removeLabel} onPress={onRemove} />
    </Row>
  );
}
