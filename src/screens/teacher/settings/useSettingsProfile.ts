import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/api/client";
import { successFeedback, warningFeedback } from "@/lib/device";
import { pickDocument, pickImage, uploadFile } from "@/lib/files";
import { useTeacher } from "@/screens/teacher/TeacherContext";
import { confirmAsync, toast } from "@/ui";

import { failureText, type Achievement, type Experience, type ProfileReply, type Qualification, type SaveMode, type TeacherProfileData } from "@/screens/teacher/settings/types";

type PersonalField = "fullName" | "gender" | "bloodGroup" | "joinDate" | "currentService" | "phone" | "emergencyContactNumber" | "presentAddress" | "permanentAddress" | "nidOrBirthCertificatePicture" | "bio";
type PortfolioField = "portfolioHeadline" | "portfolioUrl" | "impact";

/** The lists the Portfolio tab edits */
interface PortfolioLists {
  keyExpertise: string[];
  experiences: Experience[];
  qualifications: Qualification[];
  achievements: Achievement[];
}

const PROFILE_PATH = "/api/teacher-portal/profile";

/** The fields the Personal tab saves */
function personalPayload(p: TeacherProfileData | null) {
  return {
    avatar: p?.avatar || "",
    fullName: p?.fullName || "",
    phone: p?.phone || "",
    emergencyContactNumber: p?.emergencyContactNumber || "",
    gender: p?.gender || "male",
    bloodGroup: p?.bloodGroup || "A+",
    joinDate: p?.joinDate || undefined,
    currentService: p?.currentService || "",
    presentAddress: p?.presentAddress || "",
    permanentAddress: p?.permanentAddress || "",
    nidOrBirthCertificatePicture: p?.nidOrBirthCertificatePicture || "",
    bio: p?.bio || "",
  };
}

/** The fields the Portfolio tab saves; rows left blank are not sent */
function portfolioPayload(p: TeacherProfileData | null) {
  return {
    portfolioHeadline: p?.portfolioHeadline || "",
    portfolioUrl: p?.portfolioUrl || "",
    impact: p?.impact || "",
    keyExpertise: (p?.keyExpertise || []).filter((k) => typeof k === "string" && k.trim().length > 0),
    qualifications: (p?.qualifications || [])
      .filter((q) => q && (q.degree || q.institute))
      .map((q) => ({ degree: q.degree || "", institute: q.institute || "", passingYear: q.passingYear ? Number(q.passingYear) : undefined })),
    experiences: (p?.experiences || [])
      .filter((e) => e && (e.institute || e.position || e.time))
      .map((e) => ({ institute: e.institute || "", position: e.position || "", time: e.time || "", description: e.description || "" })),
    achievements: (p?.achievements || []).filter((a) => a && a.title).map((a) => ({ title: a.title || "", year: a.year || "", description: a.description || "" })),
  };
}

/** The required fields of the Personal tab, checked before anything is sent */
function personalProblem(p: TeacherProfileData | null): string {
  if (!p?.fullName?.trim()) return "Full name is required.";
  if (!p?.emergencyContactNumber?.trim()) return "Emergency contact number is required.";
  if (!p?.presentAddress?.trim()) return "Present address is required.";
  if (!p?.permanentAddress?.trim()) return "Permanent address is required.";
  if (!p?.bloodGroup) return "Blood group is required.";
  return "";
}

/**
 * Everything the settings screen knows about the teacher's profile: the copy being edited, which tab has
 * unsaved edits, the uploads and the mode-wise save (Personal, Portfolio or both in one request).
 */
export function useSettingsProfile() {
  const { refreshProfile } = useTeacher();
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [unsaved, setUnsaved] = useState({ personal: false, portfolio: false });
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingNID, setUploadingNID] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Loads the saved profile; resolves with the failure message, or "" when it worked */
  const load = useCallback(async (): Promise<string> => {
    let problem = "";
    try {
      const reply = await api.get<ProfileReply>(PROFILE_PATH);
      if (reply.success && reply.teacher) {
        if (alive.current) setProfile(reply.teacher);
      } else {
        problem = reply.message || "Could not load your profile.";
      }
    } catch (e) {
      problem = failureText(e, "Could not load your profile.");
    }
    if (alive.current) {
      setLoadError(problem);
      setLoading(false);
    }
    return problem;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    setLoadError("");
    void load();
  }, [load]);

  /** Pull-to-refresh. Reloading replaces the edited copy, so unsaved edits are only dropped after a yes. */
  const refresh = useCallback(async () => {
    if (unsaved.personal || unsaved.portfolio) {
      const ok = await confirmAsync({
        title: "Discard unsaved changes?",
        message: "Refreshing loads your saved profile again and drops the changes you have not saved yet.",
        confirmText: "Discard and refresh",
        destructive: true,
      });
      if (!ok) return;
    }
    setRefreshing(true);
    const problem = await load();
    if (!alive.current) return;
    setRefreshing(false);
    if (problem) {
      // What is on screen (and its unsaved marks) stays as it was
      toast.error(problem);
      return;
    }
    setUnsaved({ personal: false, portfolio: false });
    setError("");
  }, [load, unsaved.personal, unsaved.portfolio]);

  const updatePersonal = useCallback((field: PersonalField, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setUnsaved((prev) => ({ ...prev, personal: true }));
  }, []);

  const updatePortfolio = useCallback((field: PortfolioField, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
    setUnsaved((prev) => ({ ...prev, portfolio: true }));
  }, []);

  /** Replaces one of the Portfolio tab's lists (skills, experience, qualifications, achievements) */
  const setPortfolioList = useCallback(<K extends keyof PortfolioLists>(field: K, next: PortfolioLists[K]) => {
    setProfile((p) => ({ ...p, [field]: next }));
    setUnsaved((prev) => ({ ...prev, portfolio: true }));
  }, []);

  /** The profile photo: uploaded straight away, applied to the account by the next Personal save */
  const uploadAvatar = useCallback(async () => {
    const picked = await pickImage({ square: true });
    if (!picked) return;
    setUploadingImage(true);
    setError("");
    try {
      const url = await uploadFile(picked);
      if (!alive.current) return;
      setProfile((prev) => ({ ...prev, avatar: url }));
      setUnsaved((prev) => ({ ...prev, personal: true }));
      toast.success("Photo uploaded! Tap 'Save Personal Changes' to apply.");
    } catch (e) {
      const text = failureText(e, "Failed to upload image.", "Failed to upload image due to a network error.");
      setError(text);
      toast.error(text);
    } finally {
      if (alive.current) setUploadingImage(false);
    }
  }, []);

  /** The NID / birth certificate: an image or a PDF, stored as a link in the same field the teacher can also type into */
  const uploadNid = useCallback(async () => {
    const picked = await pickDocument(["image/*", "application/pdf"]);
    if (!picked) return;
    setUploadingNID(true);
    setError("");
    try {
      const url = await uploadFile(picked);
      if (!alive.current) return;
      setProfile((prev) => ({ ...prev, nidOrBirthCertificatePicture: url }));
      setUnsaved((prev) => ({ ...prev, personal: true }));
      toast.success("Document uploaded! Tap 'Save Personal Changes' to apply.");
    } catch (e) {
      const text = failureText(e, "Failed to upload document.", "Failed to upload document due to a network error.");
      setError(text);
      toast.error(text);
    } finally {
      if (alive.current) setUploadingNID(false);
    }
  }, []);

  const save = useCallback(
    async (mode: SaveMode) => {
      setError("");
      if (mode !== "portfolio") {
        const problem = personalProblem(profile);
        if (problem) {
          setError(problem);
          toast.error(problem);
          warningFeedback();
          return;
        }
      }

      const payload = {
        mode,
        ...(mode !== "portfolio" ? personalPayload(profile) : null),
        ...(mode !== "personal" ? portfolioPayload(profile) : null),
      };

      setSavingMode(mode);
      try {
        const reply = await api.put<ProfileReply>(PROFILE_PATH, payload);
        if (!alive.current) return;
        if (!reply.success) {
          const text = reply.message || "Failed to update profile.";
          setError(text);
          toast.error(text);
          return;
        }
        // The payout details are saved on the Salary page; keep the copy already on screen
        setProfile((prev) => ({ ...prev, ...reply.teacher, paymentInfo: prev?.paymentInfo || reply.teacher?.paymentInfo }));
        setUnsaved((prev) => (mode === "all" ? { personal: false, portfolio: false } : { ...prev, [mode]: false }));
        successFeedback();
        toast.success(
          mode === "personal" ? "Personal & contact information saved successfully!" : mode === "portfolio" ? "Portfolio & career showcase saved successfully!" : "All profile settings saved successfully!"
        );
        // The header, avatar and the onboarding checklist read the shared profile
        await refreshProfile().catch(() => {});
      } catch (e) {
        if (!alive.current) return;
        const text = failureText(e, "Failed to update profile.");
        setError(text);
        toast.error(text);
      } finally {
        if (alive.current) setSavingMode(null);
      }
    },
    [profile, refreshProfile]
  );

  /** Only the verification fields are patched: a reload would overwrite unsaved edits in the other tabs */
  const markEmailVerified = useCallback(
    (verifiedAt: string) => {
      setProfile((p) => ({ ...p, emailVerified: true, verifiedEmail: p?.email, emailVerifiedAt: verifiedAt }));
      setError("");
      successFeedback();
      toast.success("Your email address has been verified!");
      void refreshProfile();
    },
    [refreshProfile]
  );

  return {
    profile,
    loading,
    loadError,
    retry,
    refresh,
    refreshing,
    unsaved,
    savingMode,
    uploadingImage,
    uploadingNID,
    /** Saving and uploads lock every save button, as on the website */
    busy: savingMode !== null || uploadingImage || uploadingNID,
    error,
    clearError: () => setError(""),
    updatePersonal,
    updatePortfolio,
    setPortfolioList,
    uploadAvatar,
    uploadNid,
    save,
    markEmailVerified,
  };
}

export type SettingsProfile = ReturnType<typeof useSettingsProfile>;
