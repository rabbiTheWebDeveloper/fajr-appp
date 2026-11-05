/** Shapes of GET /api/student-portal/feedback, as the route handler builds them */

export interface FeedbackCourse {
  _id: string;
  title: string;
}

export interface FeedbackTeacher {
  _id: string;
  name: string;
  avatar: string;
}

/** One past evaluation: the Feedback document with `course` and `teacher` populated */
export interface PastFeedback {
  _id: string;
  course?: { _id: string; title?: string } | null;
  teacher?: { _id: string; fullName?: string } | null;
  /** Overall satisfaction, 1-5 */
  rating: number;
  teachingClarity?: number;
  punctuality?: number;
  subjectKnowledge?: number;
  behaviorPatience?: number;
  classEngagement?: number;
  useOfClassTime?: number;
  likeMost?: string;
  couldImprove?: string;
  issuesConcerns?: string;
  recommend?: boolean;
  createdAt?: string;
}

export interface FeedbackReply {
  success?: boolean;
  message?: string;
  /** The student's assigned teacher, or null when none is assigned */
  teacherInfo?: FeedbackTeacher | null;
  enrolledCourses?: FeedbackCourse[];
  pastFeedbacks?: PastFeedback[];
  /** Courses already evaluated in the current calendar month */
  submittedCourseIds?: string[];
}

export interface Ratings {
  teachingClarity: number;
  punctuality: number;
  subjectKnowledge: number;
  behaviorPatience: number;
  classEngagement: number;
  useOfClassTime: number;
  overallSatisfaction: number;
}

export type RatingKey = keyof Ratings;

export const DEFAULT_RATINGS: Ratings = {
  teachingClarity: 5,
  punctuality: 5,
  subjectKnowledge: 5,
  behaviorPatience: 5,
  classEngagement: 5,
  useOfClassTime: 5,
  overallSatisfaction: 5,
};

export const RATING_CATEGORIES: { key: Exclude<RatingKey, "overallSatisfaction">; label: string; description: string }[] = [
  { key: "teachingClarity", label: "Teaching Clarity", description: "How clearly the teacher explains concepts" },
  { key: "punctuality", label: "Punctuality", description: "Arriving on time and starting classes promptly" },
  { key: "subjectKnowledge", label: "Subject Knowledge", description: "Teacher's command over the topics" },
  { key: "behaviorPatience", label: "Behavior and Patience", description: "Interaction with students and patience level" },
  { key: "classEngagement", label: "Class Engagement", description: "Keeping students active and interactive" },
  { key: "useOfClassTime", label: "Use of Class Time", description: "Effective management of the class duration" },
];
