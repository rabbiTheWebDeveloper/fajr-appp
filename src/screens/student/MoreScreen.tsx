import React from "react";

import { MoreMenu, type MoreItem } from "@/screens/shared/MoreMenu";
import { useStudent } from "@/screens/student/StudentContext";

// The pages that have no tab of their own, in the website's order
const ITEMS: MoreItem[] = [
  { route: "StudentPayments", label: "Payments", icon: "credit-card" },
  { route: "StudentCertificate", label: "Certificate", icon: "award" },
  { route: "StudentFeedback", label: "Feedback", icon: "file-text" },
  { route: "StudentLeaderboard", label: "Leaderboard", icon: "bar-chart-2" },
  { route: "StudentSettings", label: "Settings", icon: "settings" },
];

export default function StudentMoreScreen() {
  const { student, refreshStudent } = useStudent();
  return <MoreMenu idLine={student?.studentId || "Student Portal"} settingsRoute="StudentSettings" items={ITEMS} onRefresh={refreshStudent} />;
}
