import React from "react";
import { View } from "react-native";

import { Avatar, Badge, Card, Icon, Row, SearchBar, T } from "@/ui";
import { useTheme } from "@/theme/ThemeContext";

import { avatarUri, studentStatusTone, type Student } from "@/screens/teacher/classes/types";

/** "My Students (x of y)" and the search box above the student list */
export function StudentsToolbar({ shown, total, loading, search, onSearchChange }: { shown: number; total: number; loading: boolean; search: string; onSearchChange: (text: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Row gap={8}>
        <Icon name="users" size={16} color={c.primary} />
        <T variant="title">My Students</T>
        {!loading ? (
          <T variant="body" color="faint">
            ({shown} of {total})
          </T>
        ) : null}
      </Row>
      <SearchBar value={search} onChangeText={onSearchChange} placeholder="Search by name, ID, email or phone…" />
    </View>
  );
}

/** One assigned student: status, ID, contact and courses */
export function StudentRow({ student, index }: { student: Student; index: number }) {
  const { c } = useTheme();
  const phone = student.phone || student.studentNumber;
  const status = student.studentStatus || "active";

  return (
    <Card padding={14}>
      <Row gap={12} align="flex-start">
        <Avatar uri={avatarUri(student.avatar)} name={student.fullName} size={42} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Row gap={8} justify="space-between" align="flex-start">
            <T variant="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
              {index + 1}. {student.fullName}
            </T>
            <Badge label={status.toUpperCase()} tone={studentStatusTone(status)} />
          </Row>
          <T variant="caption" color="faint" style={{ fontFamily: "monospace" }}>
            {student.studentId || "—"}
            {student.gender ? ` · ${student.gender}` : ""}
          </T>
          {student.email ? (
            <Row gap={6}>
              <Icon name="mail" size={12} color={c.textFaint} />
              <T variant="small" color="muted" numberOfLines={1} selectable style={{ flex: 1 }}>
                {student.email}
              </T>
            </Row>
          ) : null}
          {phone ? (
            <Row gap={6}>
              <Icon name="phone" size={12} color={c.textFaint} />
              <T variant="small" color="muted" selectable>
                {phone}
              </T>
            </Row>
          ) : null}
          {student.courses && student.courses.length > 0 ? (
            <Row gap={6} wrap style={{ marginTop: 2 }}>
              {student.courses.map((course, i) => (
                <Badge key={i} label={course.title || "—"} tone="primary" style={{ maxWidth: "100%" }} />
              ))}
            </Row>
          ) : (
            <T variant="small" color="faint" style={{ fontStyle: "italic" }}>
              No courses
            </T>
          )}
        </View>
      </Row>
    </Card>
  );
}
