"use client";

import {
  PROFILE_RING,
  flattenProfileAxes,
  focusSectionIdForKey,
  orderProfileSections,
  polarAt,
  angleForIndex,
  shortProfileLabel,
  profileBandSummary,
  type ProfileSectionInput,
} from "@/lib/communication-profile";

type CommunicationProfileRadarProps = {
  sections: ProfileSectionInput[];
  focusImageKey?: string;
  overallScore?: number;
  onSelectSection?: (sectionId: string) => void;
};

const SIZE = 500;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADAR_R = 108;
const RING_INNER = 122;
const RING_OUTER = 148;
const LABEL_R_BASE = 168;
const LABEL_R_ALT = 182;
const LEVELS = 5;

function polygonPoints(
  n: number,
  radiusForIndex: (i: number) => number,
): string {
  return Array.from({ length: n }, (_, i) => {
    const { x, y } = polarAt(CX, CY, angleForIndex(i, n), radiusForIndex(i));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function donutSlice(
  startAngle: number,
  endAngle: number,
  r0: number,
  r1: number,
): string {
  const span = endAngle - startAngle;
  const a0 = startAngle;
  const a1 = span < 0.01 ? startAngle + 0.01 : endAngle;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p0 = polarAt(CX, CY, a0, r1);
  const p1 = polarAt(CX, CY, a1, r1);
  const p2 = polarAt(CX, CY, a1, r0);
  const p3 = polarAt(CX, CY, a0, r0);
  return [
    `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function labelAnchor(angle: number): "start" | "middle" | "end" {
  const cos = Math.cos(angle);
  if (cos > 0.35) return "start";
  if (cos < -0.35) return "end";
  return "middle";
}

function labelNudge(angle: number): { dx: number; dy: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const pad = 5;
  return { dx: cos * pad, dy: sin * pad };
}

export function CommunicationProfileRadar({
  sections,
  focusImageKey,
  overallScore,
  onSelectSection,
}: CommunicationProfileRadarProps) {
  const ordered = orderProfileSections(sections);
  const axes = flattenProfileAxes(ordered);
  const n = axes.length;
  if (n < 3) return null;

  const focusSectionId = focusSectionIdForKey(ordered, focusImageKey);
  const weakest = [...ordered].sort((a, b) => a.score - b.score)[0];
  const bandSummary = profileBandSummary(overallScore, weakest);
  const bandCount = ordered.length;
  const gridCols =
    bandCount <= 2
      ? "grid-cols-2"
      : bandCount === 3
        ? "grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4";
  const ringMeta = (id: string) =>
    PROFILE_RING[id] || {
      fill: "#f3f4f6",
      stroke: "#6b7280",
      short: "Area",
    };

  const bandLabel = (sectionId: string, fallback: string) => {
    if (sectionId === "aCertainty") return "Authority";
    return fallback;
  };

  let cursor = 0;
  const slices = ordered.map((section) => {
    const count = section.stats.length;
    const start = angleForIndex(cursor - 0.5, n);
    const end = angleForIndex(cursor + count - 0.5, n);
    cursor += count;
    return { section, start, end };
  });

  const gridPolys = Array.from({ length: LEVELS }, (_, li) => {
    const r = (RADAR_R * (li + 1)) / LEVELS;
    return polygonPoints(n, () => r);
  });

  const dataPoints = polygonPoints(
    n,
    (i) => (Math.min(100, Math.max(0, axes[i].score)) / 100) * RADAR_R,
  );

  return (
    <div className="card-surface overflow-hidden p-4 sm:p-6">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
          Communication profile
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
          Your four areas
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Outer edge = stronger on each skill. Each point shows the metric score
          (0–100). Colored bands are Fluency, Content, Delivery, and Presence.
        </p>
      </div>

      <div className="relative mt-4 sm:mt-5">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto h-auto w-full max-w-md sm:max-w-lg"
          role="img"
          aria-label="Radar chart of fluency, content, delivery, and presence scores"
        >
          {slices.map(({ section, start, end }) => {
            const meta = ringMeta(section.id);
            const focused = section.id === focusSectionId;
            return (
              <path
                key={section.id}
                d={donutSlice(start, end, RING_INNER, RING_OUTER)}
                fill={focused ? meta.fill : `${meta.fill}cc`}
                stroke={focused ? meta.stroke : "rgba(255,255,255,0.95)"}
                strokeWidth={focused ? 2 : 1}
                className={onSelectSection ? "cursor-pointer" : undefined}
                onClick={() => onSelectSection?.(section.id)}
              />
            );
          })}

          {slices.map(({ section, start, end }) => {
            const mid = (start + end) / 2;
            const { x, y } = polarAt(
              CX,
              CY,
              mid,
              (RING_INNER + RING_OUTER) / 2,
            );
            const meta = ringMeta(section.id);
            const focused = section.id === focusSectionId;
            return (
              <text
                key={`${section.id}-ring-label`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={focused ? meta.stroke : "#1c1c1c"}
                className={onSelectSection ? "cursor-pointer" : undefined}
                style={{
                  fontSize: focused ? 11 : 10,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                }}
                onClick={() => onSelectSection?.(section.id)}
              >
                {meta.short}
              </text>
            );
          })}

          <polygon
            points={polygonPoints(n, () => RADAR_R)}
            fill="#fafafa"
            stroke="none"
          />

          {gridPolys.map((pts, i) => (
            <polygon
              key={`grid-${i}`}
              points={pts}
              fill="none"
              stroke={
                i === LEVELS - 1 ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.05)"
              }
              strokeWidth={1}
            />
          ))}

          {axes.map((_, i) => {
            const { x, y } = polarAt(CX, CY, angleForIndex(i, n), RADAR_R);
            return (
              <line
                key={`spoke-${i}`}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="rgba(0,0,0,0.06)"
                strokeWidth={1}
              />
            );
          })}

          <polygon
            points={dataPoints}
            fill="rgba(225, 6, 0, 0.07)"
            stroke="#e10600"
            strokeWidth={1.75}
            strokeLinejoin="round"
          />

          {axes.map((axis, i) => {
            const r =
              (Math.min(100, Math.max(0, axis.score)) / 100) * RADAR_R;
            const angle = angleForIndex(i, n);
            const { x, y } = polarAt(CX, CY, angle, r);
            const focused = axis.id === focusImageKey;
            return (
              <g key={`dot-${axis.id}`}>
                {focused ? (
                  <circle cx={x} cy={y} r={7} fill="rgba(225, 6, 0, 0.12)" />
                ) : null}
                <circle
                  cx={x}
                  cy={y}
                  r={focused ? 4 : 2.75}
                  fill={focused ? "#e10600" : "#374151"}
                  stroke="#fff"
                  strokeWidth={1.25}
                />
              </g>
            );
          })}

          {axes.map((axis, i) => {
            const angle = angleForIndex(i, n);
            const labelR = i % 2 === 0 ? LABEL_R_BASE : LABEL_R_ALT;
            const { x, y } = polarAt(CX, CY, angle, labelR);
            const focused = axis.id === focusImageKey;
            const anchor = labelAnchor(angle);
            const nudge = labelNudge(angle);
            const score = Math.round(axis.score);
            return (
              <text
                key={`label-${axis.id}`}
                x={x + nudge.dx}
                y={y + nudge.dy}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill={focused ? "#e10600" : "#6b7280"}
                className={onSelectSection ? "cursor-pointer" : undefined}
                style={{
                  fontSize: focused ? 9.5 : 8.5,
                  fontWeight: focused ? 800 : 650,
                }}
                onClick={() => onSelectSection?.(axis.sectionId)}
              >
                {shortProfileLabel(axis.label)} {score}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {axes.map((axis) => {
          const focused = axis.id === focusImageKey;
          return (
            <div
              key={`metric-${axis.id}`}
              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                focused
                  ? "border-accent/40 bg-accent-soft/50 font-extrabold text-foreground"
                  : "border-border/70 bg-white text-foreground/90"
              }`}
            >
              <span className="min-w-0 leading-snug">{axis.label}</span>
              <span className="shrink-0 tabular-nums font-extrabold">
                {Math.round(axis.score)}
              </span>
            </div>
          );
        })}
      </div>

      <div className={`mt-4 grid gap-2.5 ${gridCols}`}>
        {ordered.map((section) => {
          const meta = ringMeta(section.id);
          const focused = section.id === focusSectionId;
          const Tag = onSelectSection ? "button" : "div";
          return (
            <Tag
              key={section.id}
              type={onSelectSection ? "button" : undefined}
              onClick={
                onSelectSection
                  ? () => onSelectSection(section.id)
                  : undefined
              }
              className={`relative block w-full min-h-[80px] rounded-2xl border px-3 py-3 text-left ${
                onSelectSection
                  ? "cursor-pointer appearance-none font-inherit transition hover:border-foreground/15"
                  : ""
              } ${
                focused
                  ? "border-accent/50 bg-accent-soft/60 shadow-sm ring-1 ring-accent/20"
                  : "border-border/80 bg-white"
              }`}
            >
              <span
                className="pointer-events-none absolute inset-x-3 top-0 h-0.5 rounded-full"
                style={{ background: meta.stroke }}
                aria-hidden
              />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
                {bandLabel(section.id, meta.short)}
              </p>
              <p className="mt-2 text-xl font-extrabold leading-none tabular-nums tracking-tight text-foreground sm:text-2xl">
                {section.score}/100
              </p>
            </Tag>
          );
        })}
      </div>

      {bandSummary ? (
        <p className="mt-4 rounded-xl border border-border/60 bg-track/40 px-3 py-2.5 text-sm leading-relaxed text-muted">
          {overallScore != null && overallScore >= 80 ? (
            <span className="font-extrabold text-foreground">{bandSummary}</span>
          ) : weakest ? (
            <>
              Softest area:{" "}
              <span className="font-extrabold text-foreground">
                {bandLabel(weakest.id, ringMeta(weakest.id).short)}
              </span>
              {focusSectionId === weakest.id
                ? " — that’s where your main challenge sits."
                : "."}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
