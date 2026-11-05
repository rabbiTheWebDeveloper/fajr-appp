import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

import { useTheme } from "@/theme/ThemeContext";
import { T } from "@/ui/core";

export interface ChartDatum {
  label: string;
  value: number;
  /** Overrides the series colour for this bar */
  color?: string;
}

interface BarChartProps {
  data: ChartDatum[];
  height?: number;
  color?: string;
  /** Text above each bar; defaults to the number */
  formatValue?: (value: number) => string;
  /** Hide the value labels above the bars (e.g. for a dense 31-day chart) */
  hideValues?: boolean;
  /** Show only every Nth x-axis label (1 = all) */
  labelEvery?: number;
  style?: StyleProp<ViewStyle>;
}

/** Vertical bars with labels underneath */
export function BarChart({ data, height = 150, color, formatValue, hideValues, labelEvery = 1, style }: BarChartProps) {
  const { c } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  const barColor = color ?? c.primary;
  return (
    <View style={[{ gap: 6 }, style]}>
      <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap: data.length > 14 ? 2 : 6, borderBottomWidth: 1, borderBottomColor: c.border }}>
        {data.map((d, i) => {
          const barHeight = Math.max(d.value > 0 ? 3 : 0, (d.value / max) * (height - (hideValues ? 4 : 20)));
          return (
            <View key={`${d.label}-${i}`} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              {!hideValues && d.value > 0 ? (
                <Text numberOfLines={1} style={{ color: c.textMuted, fontSize: 9.5, fontWeight: "700", marginBottom: 2 }}>
                  {formatValue ? formatValue(d.value) : d.value}
                </Text>
              ) : null}
              <View style={{ width: "100%", maxWidth: 34, height: barHeight, backgroundColor: d.color ?? barColor, borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: data.length > 14 ? 2 : 6 }}>
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={{ flex: 1, alignItems: "center" }}>
            <Text numberOfLines={1} style={{ color: c.textFaint, fontSize: 9.5, fontWeight: "600" }}>
              {i % labelEvery === 0 ? d.label : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface HorizontalBarsProps {
  data: ChartDatum[];
  color?: string;
  formatValue?: (value: number) => string;
  style?: StyleProp<ViewStyle>;
}

/** Labelled horizontal bars: good for rankings and category breakdowns */
export function HorizontalBars({ data, color, formatValue, style }: HorizontalBarsProps) {
  const { c } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={[{ gap: 10 }, style]}>
      {data.map((d, i) => (
        <View key={`${d.label}-${i}`} style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <T variant="small" color="muted" numberOfLines={1} style={{ flex: 1 }}>
              {d.label}
            </T>
            <T variant="smallStrong">{formatValue ? formatValue(d.value) : d.value}</T>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: "hidden" }}>
            <View style={{ width: `${(d.value / max) * 100}%`, height: "100%", borderRadius: 4, backgroundColor: d.color ?? color ?? c.primary }} />
          </View>
        </View>
      ))}
    </View>
  );
}

interface LineChartProps {
  data: ChartDatum[];
  height?: number;
  color?: string;
  /** Fill the area under the line */
  filled?: boolean;
  labelEvery?: number;
  style?: StyleProp<ViewStyle>;
}

/** A simple line (trend) chart */
export function LineChart({ data, height = 140, color, filled = true, labelEvery = 1, style }: LineChartProps) {
  const { c } = useTheme();
  const [width, setWidth] = React.useState(0);
  const stroke = color ?? c.primary;
  const max = Math.max(1, ...data.map((d) => d.value));
  const padX = 6;
  const padY = 8;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = height - padY * 2;
  const points = data.map((d, i) => ({
    x: padX + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padY + innerH - (d.value / max) * innerH,
  }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = points.length ? `M ${points[0].x} ${height - padY} L ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${points[points.length - 1].x} ${height - padY} Z` : "";

  return (
    <View style={[{ gap: 6 }, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={padX} x2={width - padX} y1={padY + innerH * f} y2={padY + innerH * f} stroke={c.border} strokeWidth={1} />
          ))}
          {filled && area ? <Path d={area} fill={stroke} opacity={0.12} /> : null}
          <Polyline points={polyline} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {data.length <= 16 ? points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={c.surface} stroke={stroke} strokeWidth={2} />) : null}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      <View style={{ flexDirection: "row" }}>
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={{ flex: 1, alignItems: "center" }}>
            <Text numberOfLines={1} style={{ color: c.textFaint, fontSize: 9.5, fontWeight: "600" }}>
              {i % labelEvery === 0 ? d.label : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface ProgressRingProps {
  /** 0–100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Content in the middle; defaults to "NN%" */
  children?: React.ReactNode;
}

/** A circular progress indicator with the percentage in the middle */
export function ProgressRing({ percent, size = 84, strokeWidth = 9, color, trackColor, children }: ProgressRingProps) {
  const { c } = useTheme();
  const pct = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? c.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color ?? c.primary} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - pct / 100)} />
      </Svg>
      {children ?? <Text style={{ color: c.text, fontSize: Math.round(size * 0.22), fontWeight: "800" }}>{Math.round(pct)}%</Text>}
    </View>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** A donut chart with a legend beside it */
export function DonutChart({ data, size = 120, strokeWidth = 18, centerLabel, formatValue }: { data: DonutSlice[]; size?: number; strokeWidth?: number; centerLabel?: string; formatValue?: (value: number) => string }) {
  const { c } = useTheme();
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surfaceAlt} strokeWidth={strokeWidth} fill="none" />
          {total > 0
            ? data.map((d, i) => {
                const length = (Math.max(0, d.value) / total) * circumference;
                const dash = <Circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={d.color} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />;
                offset += length;
                return dash;
              })
            : null}
        </Svg>
        {centerLabel ? <Text style={{ color: c.text, fontSize: 15, fontWeight: "800" }}>{centerLabel}</Text> : null}
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: d.color }} />
            <T variant="small" color="muted" style={{ flex: 1 }} numberOfLines={1}>
              {d.label}
            </T>
            <T variant="smallStrong">{formatValue ? formatValue(d.value) : d.value}</T>
          </View>
        ))}
      </View>
    </View>
  );
}
