import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { radius } from "@/theme/palette";
import { Card, IconButton, Row, Select, T } from "@/ui";

import { PAGE_SIZE_OPTIONS } from "@/screens/teacher/students/shared";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/** 1 … 4 5 6 … 12: every page up to seven, otherwise the ends and the neighbours of the current page */
function pageList(page: number, totalPages: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (page > 3) pages.push("...");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
  if (page < totalPages - 2) pages.push("...");
  pages.push(totalPages);
  return pages;
}

/** Under the student list: the range on show, the page size, and first / previous / numbered / next / last page */
export function PaginationBar({ page, totalPages, total, limit, loading, onPageChange, onLimitChange }: PaginationBarProps) {
  const { c } = useTheme();
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const atStart = page <= 1 || !!loading;
  const atEnd = page >= totalPages || !!loading;

  return (
    <Card padding={12} style={{ gap: 12 }}>
      <Row justify="space-between" gap={10}>
        <T variant="small" color="muted" style={{ flex: 1 }}>
          Showing{" "}
          <T variant="smallStrong">
            {start}–{end}
          </T>{" "}
          of <T variant="smallStrong">{total}</T> students
        </T>
        <Row gap={6}>
          <T variant="caption" color="faint">
            Per page:
          </T>
          <Select<number>
            compact
            title="Students per page"
            value={limit}
            options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: String(size) }))}
            onChange={onLimitChange}
            containerStyle={{ width: 78 }}
          />
        </Row>
      </Row>

      {totalPages > 1 ? (
        <>
          <Row wrap gap={4} justify="center">
            {pageList(page, totalPages).map((p, index) =>
              p === "..." ? (
                <View key={`ellipsis-${index}`} style={{ width: 24, height: 40, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: c.textFaint, fontSize: 14 }}>…</Text>
                </View>
              ) : (
                <Pressable
                  key={p}
                  onPress={loading || p === page ? undefined : () => onPageChange(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`Page ${p}`}
                  accessibilityState={{ selected: p === page }}
                  style={{
                    minWidth: 38,
                    height: 40,
                    paddingHorizontal: 6,
                    borderRadius: radius.sm,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: p === page ? c.primary : "transparent",
                    borderWidth: p === page ? 0 : 1,
                    borderColor: c.border,
                  }}
                >
                  <Text style={{ color: p === page ? "#ffffff" : c.textMuted, fontSize: 12.5, fontWeight: "700" }}>{p}</Text>
                </Pressable>
              )
            )}
          </Row>

          <Row justify="space-between">
            <Row gap={6}>
              <IconButton icon="chevrons-left" size={40} background={c.surfaceAlt} disabled={atStart} accessibilityLabel="First Page" onPress={() => onPageChange(1)} />
              <IconButton icon="chevron-left" size={40} background={c.surfaceAlt} disabled={atStart} accessibilityLabel="Previous Page" onPress={() => onPageChange(page - 1)} />
            </Row>
            <T variant="smallStrong" color="muted">
              Page {page} of {totalPages}
            </T>
            <Row gap={6}>
              <IconButton icon="chevron-right" size={40} background={c.surfaceAlt} disabled={atEnd} accessibilityLabel="Next Page" onPress={() => onPageChange(page + 1)} />
              <IconButton icon="chevrons-right" size={40} background={c.surfaceAlt} disabled={atEnd} accessibilityLabel="Last Page" onPress={() => onPageChange(totalPages)} />
            </Row>
          </Row>
        </>
      ) : null}
    </Card>
  );
}
