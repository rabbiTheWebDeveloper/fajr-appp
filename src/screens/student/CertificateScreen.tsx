import React, { useState } from "react";
import { View } from "react-native";

import { errorMessage } from "@/api/client";
import { successFeedback } from "@/lib/device";
import { shareHtmlAsPdf } from "@/lib/files";
import { useFetch } from "@/lib/hooks";
import { CertificatePreview, LockedCertificate } from "@/screens/student/certificate/CertificatePreview";
import { buildCertificate } from "@/screens/student/certificate/certificateHtml";
import { CERTIFICATE_PATH, type CertificateReply } from "@/screens/student/certificate/helpers";
import { Badge, Button, Card, EmptyState, ErrorState, IconChip, Row, Screen, Skeleton, SkeletonCard, T, toast } from "@/ui";

/**
 * Student > Certificate: the course completion certificate. It is generated for every student but stays
 * locked (no preview, no download) until an admin approves it.
 */
export default function StudentCertificateScreen() {
  const { data, loading, refreshing, error, refresh, retry } = useFetch<CertificateReply>(CERTIFICATE_PATH);
  const [downloading, setDownloading] = useState(false);

  const cert = data?.success ? (data.certificate ?? null) : null;
  const approved = Boolean(cert?.certificateApproved);

  const download = async () => {
    if (!cert || downloading) return;
    if (!approved) {
      toast.error("Certificate is currently locked awaiting Admin Approval. Please contact administration.");
      return;
    }
    setDownloading(true);
    try {
      const { html, fileName } = buildCertificate(cert);
      await shareHtmlAsPdf(html, fileName, { landscape: true });
      successFeedback();
    } catch (e) {
      toast.error(errorMessage(e, "Could not create the certificate PDF. Please try again."));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <SkeletonCard lines={3} />
        <Skeleton height={420} rounded={12} />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <ErrorState title="Certificate data unavailable" message={error} onRetry={retry} />
      </Screen>
    );
  }

  if (!cert) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <EmptyState mIcon="certificate-outline" tone="neutral" title="Certificate data unavailable" message="Please contact administration." actionLabel="Retry" onAction={retry} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Card style={{ gap: 12 }}>
        <Row gap={12} align="flex-start">
          <IconChip icon="shield" tone={approved ? "success" : "warning"} />
          <View style={{ flex: 1, gap: 5 }}>
            <T variant="h2">My Certificate</T>
            {approved ? <Badge label="Approved & Verified" tone="success" icon="check-circle" /> : <Badge label="Locked • Awaiting Admin Approval" tone="warning" icon="lock" />}
          </View>
        </Row>
        <T variant="small" color="muted">
          {approved
            ? "Official course completion certificate — approved and ready for high-resolution download."
            : "Certificate generated and locked pending administrative review. Unlock requires Admin approval."}
        </T>
        {approved ? (
          <Button title="Download PDF Certificate" icon="download" variant="navy" size="lg" block loading={downloading} onPress={download} />
        ) : (
          <View style={{ gap: 6 }}>
            <Button title="Download Locked (Pending Approval)" icon="lock" variant="secondary" size="lg" block disabled />
            <T variant="caption" color="faint" center>
              Admin approval required to download certificate
            </T>
          </View>
        )}
      </Card>

      {approved ? <CertificatePreview cert={cert} /> : <LockedCertificate />}
    </Screen>
  );
}
