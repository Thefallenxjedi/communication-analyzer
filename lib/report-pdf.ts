import { jsPDF } from "jspdf";
import type { ChallengeImageKey, DiagnosisReport } from "@/lib/schema";
import {
  CHALLENGE_BLURBS,
  CHALLENGE_IMAGE_KEYS,
  STAT_HINTS,
  type StatId,
} from "@/lib/schema";
import { buildPartASections, buildPartBSections, isHighPerformer } from "@/lib/scoring";
import { challengeImagePath } from "@/lib/challenge-images";
import { resolvePracticePlan } from "@/lib/practice-plans";
import {
  PROFILE_RING,
  PROFILE_RING_STROKE_RGB,
  angleForIndex,
  flattenProfileAxes,
  focusSectionIdForKey,
  orderProfileSections,
  polarAt,
  profileBandSummary,
  shortProfileLabel,
} from "@/lib/communication-profile";

export type ReportPdfOptions = {
  recipientName?: string;
};

export const DIAGNOSIS_CALL_URL =
  process.env.NEXT_PUBLIC_DIAGNOSIS_CALL_URL ||
  process.env.NEXT_PUBLIC_COACH_URL ||
  process.env.NEXT_PUBLIC_THOUGHTS2WORDS_URL ||
  "https://www.elitespeakprogram.com/elitespeak-video16#open-popup";

const PDF_FILENAME = "YourCommunicationReport.pdf";

/**
 * Coaching-workbook palette (EliteSpeak):
 * cream pages, yellow accents, red brand, soft cards.
 */
const C = {
  cream: [255, 252, 245] as const,
  ink: [28, 28, 28] as const,
  muted: [110, 110, 110] as const,
  accent: [225, 6, 0] as const,
  yellow: [255, 210, 40] as const,
  yellowSoft: [255, 230, 120] as const,
  orange: [255, 150, 40] as const,
  good: [22, 140, 90] as const,
  warn: [230, 150, 20] as const,
  weak: [225, 6, 0] as const,
  white: [255, 255, 255] as const,
  card: [255, 255, 255] as const,
  line: [232, 226, 214] as const,
  track: [236, 230, 218] as const,
};

type RGB = readonly [number, number, number];

function scoreColor(score: number): RGB {
  if (score >= 70) return C.good;
  if (score >= 50) return C.warn;
  return C.weak;
}

async function loadImageDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function wrapLines(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text.replace(/\s+/g, " ").trim(), maxWidth) as string[];
}

export async function buildReportPdf(
  report: DiagnosisReport,
  options: ReportPdfOptions = {},
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 52;
  const contentW = pageW - marginX * 2;
  const bottomSafe = 64;
  const LABEL_W = contentW - 48;
  const BAR_H = 5;
  const BAR_H_SECTION = 7;

  let y = 56;

  /** Soft cream page + yellow blob (top-left) + warm footer bar */
  const paintPage = () => {
    doc.setFillColor(...C.cream);
    doc.rect(0, 0, pageW, pageH, "F");

    // Organic corner blob (stacked ellipses — workbook-style accent)
    doc.setFillColor(...C.yellow);
    doc.ellipse(-18, -10, 78, 62, "F");
    doc.setFillColor(...C.yellowSoft);
    doc.ellipse(28, -28, 54, 48, "F");
    doc.setFillColor(...C.orange);
    doc.ellipse(-6, 28, 36, 30, "F");

    // Thin warm bar at bottom (yellow → orange via two rects)
    doc.setFillColor(...C.yellow);
    doc.rect(0, pageH - 10, pageW * 0.55, 10, "F");
    doc.setFillColor(...C.orange);
    doc.rect(pageW * 0.55, pageH - 10, pageW * 0.45, 10, "F");
  };

  paintPage();

  const newPage = () => {
    doc.addPage();
    paintPage();
    y = 56;
  };

  const ensureSpace = (need: number) => {
    if (y + need <= pageH - bottomSafe) return;
    newPage();
  };

  const drawFooter = (pageNum: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("EliteSpeak Program  ·  elitespeakprogram.com", marginX, pageH - 24);
    doc.text(String(pageNum), pageW - marginX, pageH - 24, { align: "right" });
  };

  /** Small caps workbook label — e.g. "DIAGNOSIS 01" */
  const drawEyebrow = (label: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.orange);
    doc.text(label.toUpperCase(), marginX, y);
    // Baseline + ascender clearance before next line
    y += 24;
  };

  const drawBrand = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.accent);
    doc.text("ELITESPEAK", marginX, y);
    // Extra room before large titles (26pt ascenders need space)
    y += 32;
  };

  const drawTitle = (text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...C.ink);
    const lines = wrapLines(doc, text, contentW, 24);
    for (const line of lines) {
      doc.text(line, marginX, y);
      y += 30;
    }
    y += 10;
  };

  /** Soft yellow highlight strip behind a key phrase */
  const drawHighlightTitle = (before: string, highlight: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    const beforeW = doc.getTextWidth(before);
    const hiW = doc.getTextWidth(highlight);
    // Highlight sits behind the word — leave headroom so it doesn't cover brand
    doc.setFillColor(...C.yellow);
    doc.roundedRect(marginX + beforeW + 2, y - 18, hiW + 12, 26, 6, 6, "F");
    doc.setTextColor(...C.ink);
    doc.text(before, marginX, y);
    doc.text(highlight, marginX + beforeW + 8, y);
    y += 40;
  };

  const body = (text: string, opts?: { color?: RGB; size?: number; indent?: number }) => {
    const size = opts?.size ?? 10.5;
    const color = opts?.color ?? C.ink;
    const indent = opts?.indent ?? 0;
    const lines = wrapLines(doc, text, contentW - indent, size);
    const lineH = size + 5;
    ensureSpace(lines.length * lineH + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    for (const line of lines) {
      ensureSpace(lineH + 4);
      doc.text(line, marginX + indent, y);
      y += lineH;
    }
    y += 8;
  };

  /** Numbered yellow circle — coaching workbook style */
  const drawNumberCircle = (n: number, cx: number, cy: number, r = 12) => {
    doc.setFillColor(...C.yellow);
    doc.circle(cx, cy, r, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.ink);
    doc.text(String(n), cx, cy + 4, { align: "center" });
  };

  /** Plus bullet in yellow circle */
  const drawPlusBullet = (cx: number, cy: number) => {
    doc.setFillColor(...C.yellow);
    doc.circle(cx, cy, 6, "F");
    doc.setDrawColor(...C.ink);
    doc.setLineWidth(1.4);
    doc.line(cx - 3, cy, cx + 3, cy);
    doc.line(cx, cy - 3, cx, cy + 3);
  };

  const drawMajorPartBanner = (title: string, blurb: string) => {
    ensureSpace(88);
    const blurbLines = wrapLines(doc, blurb, contentW - 36, 10);
    const bannerH = 52 + blurbLines.length * 13;

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginX, y, contentW, bannerH, 16, 16, "FD");

    // Left accent stripe
    doc.setFillColor(...C.yellow);
    doc.roundedRect(marginX, y, 8, bannerH, 4, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...C.ink);
    doc.text(title, marginX + 22, y + 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    let by = y + 44;
    for (const line of blurbLines) {
      doc.text(line, marginX + 22, by);
      by += 13;
    }
    y += bannerH + 24;
  };

  const drawNumberedSectionTitle = (
    n: number,
    title: string,
    score: number,
    blurb?: string,
  ) => {
    const titleSize = 13;
    const hintLines = blurb
      ? wrapLines(doc, blurb, contentW - 40, 9).slice(0, 2)
      : [];
    const blockH =
      28 +
      (hintLines.length ? hintLines.length * 11 + 4 : 0) +
      BAR_H_SECTION +
      18;
    ensureSpace(blockH);

    drawNumberCircle(n, marginX + 12, y + 6, 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleSize);
    doc.setTextColor(...C.ink);
    const titleX = marginX + 32;
    const titleMax = contentW - 32 - 56;
    const titleWrapped = wrapLines(doc, title, titleMax, titleSize);
    let rowY = y + 10;
    for (const line of titleWrapped) {
      doc.text(line, titleX, rowY);
      rowY += titleSize + 3;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...scoreColor(score));
    doc.text(`${Math.round(score)}/100`, marginX + contentW, y + 10, {
      align: "right",
    });

    y = Math.max(rowY, y + 22) + 2;

    if (hintLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      for (const line of hintLines) {
        doc.text(line, titleX, y);
        y += 11;
      }
      y += 4;
    }

    doc.setFillColor(...C.track);
    doc.roundedRect(marginX, y, contentW, BAR_H_SECTION, 3, 3, "F");
    const fill = Math.max(0, Math.min(100, score)) / 100;
    if (fill > 0) {
      doc.setFillColor(...scoreColor(score));
      doc.roundedRect(
        marginX,
        y,
        Math.max(4, contentW * fill),
        BAR_H_SECTION,
        3,
        3,
        "F",
      );
    }
    y += BAR_H_SECTION + 16;
  };

  const scoreMarker = (label: string, score: number, hint?: string) => {
    const titleSize = 10.5;
    const hintSize = 8.5;
    const labelLines = wrapLines(doc, label, LABEL_W - 16, titleSize);
    const hintLines = hint
      ? wrapLines(doc, hint, contentW - 28, hintSize).slice(0, 2)
      : [];
    const blockH =
      labelLines.length * (titleSize + 3) +
      (hintLines.length ? hintLines.length * (hintSize + 2) + 4 : 0) +
      BAR_H +
      16;
    ensureSpace(blockH);

    drawPlusBullet(marginX + 8, y - 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(titleSize);
    doc.setTextColor(...C.ink);
    let rowY = y;
    for (const line of labelLines) {
      doc.text(line, marginX + 22, rowY);
      rowY += titleSize + 3;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...scoreColor(score));
    doc.text(`${Math.round(score)}/100`, marginX + contentW, y, {
      align: "right",
    });

    y = rowY + 2;

    if (hintLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(hintSize);
      doc.setTextColor(...C.muted);
      for (const line of hintLines) {
        doc.text(line, marginX + 22, y);
        y += hintSize + 2;
      }
      y += 3;
    }

    doc.setFillColor(...C.track);
    doc.roundedRect(marginX + 22, y, contentW - 22, BAR_H, 2, 2, "F");
    const fill = Math.max(0, Math.min(100, score)) / 100;
    if (fill > 0) {
      doc.setFillColor(...scoreColor(score));
      doc.roundedRect(
        marginX + 22,
        y,
        Math.max(4, (contentW - 22) * fill),
        BAR_H,
        2,
        2,
        "F",
      );
    }
    y += BAR_H + 14;
  };

  const drawCta = () => {
    ensureSpace(132);
    const boxH = 118;
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginX, y, contentW, boxH, 16, 16, "FD");

    doc.setFillColor(...C.yellow);
    doc.roundedRect(marginX + 18, y + 16, 72, 16, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.ink);
    doc.text("NEXT STEP", marginX + 30, y + 27);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...C.ink);
    doc.text("Want to solve your speaking?", marginX + 18, y + 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    const ctaLines = wrapLines(
      doc,
      "Book a diagnosis call with EliteSpeak — direct feedback that changes how you think and speak.",
      contentW - 36,
      9,
    );
    let ctaTextY = y + 64;
    for (const line of ctaLines.slice(0, 2)) {
      doc.text(line, marginX + 18, ctaTextY);
      ctaTextY += 11;
    }

    const btnY = y + 84;
    const btnW = contentW - 36;
    const btnH = 26;
    doc.setFillColor(...C.accent);
    doc.roundedRect(marginX + 18, btnY, btnW, btnH, 13, 13, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.white);
    doc.text("SET UP A DIAGNOSIS CALL", marginX + 18 + btnW / 2, btnY + 17, {
      align: "center",
    });
    doc.link(marginX + 18, btnY, btnW, btnH, { url: DIAGNOSIS_CALL_URL });
    y += boxH + 12;
  };

  const drawPartWithNumbers = (
    partTitle: string,
    blurb: string,
    sections: ReturnType<typeof buildPartASections>,
  ) => {
    newPage();
    drawEyebrow(partTitle.includes("PART A") ? "Scorecard 01" : "Scorecard 02");
    drawBrand();
    drawMajorPartBanner(partTitle, blurb);
    sections.forEach((section, i) => {
      drawNumberedSectionTitle(
        i + 1,
        section.title,
        section.score,
        section.blurb,
      );
      for (const stat of section.stats) {
        scoreMarker(stat.label, stat.score, STAT_HINTS[stat.id as StatId]);
      }
      y += 8;
    });
  };

  // ——— Cover ———
  drawEyebrow("Diagnosis 01");
  drawBrand();
  drawHighlightTitle("Your Communication ", "Report");

  const recipient = options.recipientName?.trim();
  if (recipient) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...C.ink);
    doc.text(`Prepared for ${recipient}`, marginX, y);
    y += 16;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    marginX,
    y,
  );
  y += 20;

  // Score card — cream-white card with yellow left rail
  const overall = Math.round(report.overallScore);
  const levelText = report.level || "Communication Profile";
  const topPct =
    typeof report.scoreTopPercent === "number" &&
    Number.isFinite(report.scoreTopPercent)
      ? Math.max(1, Math.min(99, Math.round(report.scoreTopPercent)))
      : null;
  const scoreCardH = topPct != null ? 172 : 112;
  const scorePad = 22;
  const scoreCardY = y;

  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.8);
  doc.roundedRect(marginX, scoreCardY, contentW, scoreCardH, 18, 18, "FD");
  doc.setFillColor(...C.yellow);
  doc.roundedRect(marginX, scoreCardY, 10, scoreCardH, 5, 5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.orange);
  doc.text("OVERALL SCORE", marginX + scorePad, scoreCardY + 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(...C.ink);
  doc.text(String(overall), marginX + scorePad, scoreCardY + 72);
  const numW = doc.getTextWidth(String(overall));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...C.muted);
  doc.text("/ 100", marginX + scorePad + numW + 6, scoreCardY + 68);

  const levelMaxW = contentW * 0.4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.ink);
  const levelLines = wrapLines(doc, levelText, levelMaxW, 12);
  const levelBlockH = levelLines.length * 16;
  let levelY = scoreCardY + 36;
  for (const line of levelLines) {
    doc.text(line, marginX + contentW - scorePad, levelY, { align: "right" });
    levelY += 16;
  }

  if (topPct != null) {
    const beatPct = Math.max(1, Math.min(99, 100 - topPct));
    const barX = marginX + scorePad;
    const barW = contentW - scorePad * 2;
    const barY = scoreCardY + scoreCardH - 32;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.accent);
    doc.text(
      `You outscored ${beatPct}% of communicators`,
      marginX + scorePad,
      scoreCardY + 92,
    );

    const rawX = barX + (barW * beatPct) / 100;
    const markerX = Math.max(barX + 14, Math.min(barX + barW - 14, rawX));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.accent);
    doc.text("You", markerX, barY - 16, { align: "center" });

    doc.setFillColor(...C.accent);
    doc.triangle(
      markerX,
      barY - 3,
      markerX - 3.5,
      barY - 11,
      markerX + 3.5,
      barY - 11,
      "F",
    );

    doc.setFillColor(...C.line);
    doc.roundedRect(barX, barY, barW, 5, 2, 2, "F");
    doc.setFillColor(...C.accent);
    doc.roundedRect(barX, barY, Math.max(4, markerX - barX), 5, 2, 2, "F");

    doc.setFillColor(...C.accent);
    doc.circle(markerX, barY + 2.5, 4, "F");
    doc.setFillColor(...C.white);
    doc.circle(markerX, barY + 2.5, 1.8, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text("Lower", barX, barY + 14);
    doc.text("Higher", barX + barW, barY + 14, { align: "right" });
  }

  y = scoreCardY + scoreCardH + 22;

  // ——— Page 1 continued: focus image + what went well / improve ———
  const focusTitle = report.mainChallenge.title || "Primary opportunity";
  const imageKey = (
    (CHALLENGE_IMAGE_KEYS as readonly string[]).includes(
      report.mainChallenge.imageKey || "",
    )
      ? report.mainChallenge.imageKey
      : "generic"
  ) as ChallengeImageKey;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.orange);
  doc.text("YOUR MAIN FOCUS", marginX, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const focusPadX = 16;
  const focusTextW = doc.getTextWidth(focusTitle);
  const focusPillW = Math.min(contentW, focusTextW + focusPadX * 2);
  const focusPillH = 28;
  doc.setFillColor(...C.yellow);
  doc.roundedRect(marginX, y, focusPillW, focusPillH, 14, 14, "F");
  doc.setTextColor(...C.ink);
  doc.text(focusTitle, marginX + focusPadX, y + 18);
  y += focusPillH + 14;

  const challengeImg = await loadImageDataUrl(
    challengeImagePath(report.mainChallenge.imageKey || "generic"),
  );

  const strengthsText = report.mainChallenge.strengths?.trim() || "";
  const improveText = report.mainChallenge.improvements?.trim() || "";
  const focusBlurb =
    report.mainChallenge.summary?.trim() || CHALLENGE_BLURBS[imageKey];

  // Two-column: illustration left, feedback cards right (fills empty page-1 space)
  const colGap = 16;
  const leftW = Math.min(210, contentW * 0.42);
  const rightW = contentW - leftW - colGap;
  const imgH = leftW * (10 / 16);
  const feedbackStartY = y;

  if (challengeImg) {
    try {
      const fmt = challengeImg.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      doc.setFillColor(...C.white);
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.7);
      doc.roundedRect(marginX, y, leftW, imgH + 12, 14, 14, "FD");
      doc.addImage(
        challengeImg,
        fmt,
        marginX + 6,
        y + 6,
        leftW - 12,
        imgH,
        undefined,
        "FAST",
      );
    } catch {
      // skip image if encode fails
    }
  }

  const drawFeedbackCard = (
    x: number,
    startY: number,
    width: number,
    label: string,
    text: string,
    labelColor: RGB,
  ): number => {
    const size = 9.5;
    const lines = wrapLines(doc, text, width - 28, size);
    const lineH = size + 4;
    const boxH = Math.max(72, 28 + lines.length * lineH + 12);

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, startY, width, boxH, 12, 12, "FD");

    drawPlusBullet(x + 12, startY + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...labelColor);
    doc.text(label, x + 24, startY + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...C.ink);
    let ty = startY + 34;
    for (const line of lines.slice(0, 6)) {
      doc.text(line, x + 12, ty);
      ty += lineH;
    }
    return boxH;
  };

  let rightY = feedbackStartY;
  const rightX = marginX + leftW + colGap;
  if (strengthsText) {
    rightY +=
      drawFeedbackCard(
        rightX,
        rightY,
        rightW,
        "WHAT WENT WELL",
        strengthsText,
        C.good,
      ) + 10;
  }
  if (improveText) {
    rightY +=
      drawFeedbackCard(
        rightX,
        rightY,
        rightW,
        "WHAT TO IMPROVE",
        improveText,
        C.accent,
      ) + 10;
  }
  if (!strengthsText && !improveText && focusBlurb) {
    rightY +=
      drawFeedbackCard(
        rightX,
        rightY,
        rightW,
        "YOUR FOCUS",
        focusBlurb,
        C.orange,
      ) + 10;
  }

  y = Math.max(feedbackStartY + imgH + 20, rightY) + 4;

  // ——— Page 2: Communication profile radar ———
  newPage();
  drawEyebrow("Profile 02");
  drawBrand();
  drawTitle("Your communication profile");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...C.muted);
  doc.text(
    "Four areas from your Part A scorecard. Closer to the edge means stronger.",
    marginX,
    y,
  );
  y += 16;

  const partAForProfile = buildPartASections(report.stats, {
    transcriptOnly: Boolean(report.transcriptOnly),
  });
  const orderedProfile = orderProfileSections(partAForProfile);
  const profileAxes = flattenProfileAxes(orderedProfile);
  const focusSecId = focusSectionIdForKey(
    orderedProfile,
    report.mainChallenge.imageKey,
  );

  if (profileAxes.length >= 3) {
    const chartSize = Math.min(contentW, 288);
    const cx = marginX + contentW / 2;
    const cy = y + chartSize / 2 - 8;
    const n = profileAxes.length;
    const radarR = chartSize * 0.32;
    const ringInner = chartSize * 0.36;
    const ringOuter = chartSize * 0.44;
    const labelR = chartSize * 0.49;

    // Soft card behind chart
    const cardPad = 10;
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.7);
    doc.roundedRect(
      cx - chartSize / 2 - cardPad,
      y - 4,
      chartSize + cardPad * 2,
      chartSize + 8,
      16,
      16,
      "FD",
    );

    // Ring segments as fan wedges (outer arc approx via triangle strips)
    let axisCursor = 0;
    for (const section of orderedProfile) {
      const count = section.stats.length;
      const a0 = angleForIndex(axisCursor - 0.5, n);
      const a1 = angleForIndex(axisCursor + count - 0.5, n);
      axisCursor += count;
      const fill = PROFILE_RING[section.id]?.rgb || ([240, 240, 240] as const);
      const stroke =
        PROFILE_RING_STROKE_RGB[section.id] || ([120, 120, 120] as const);
      const focused = section.id === focusSecId;
      const steps = Math.max(8, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 48));
      doc.setFillColor(...fill);
      for (let s = 0; s < steps; s++) {
        const t0 = a0 + ((a1 - a0) * s) / steps;
        const t1 = a0 + ((a1 - a0) * (s + 1)) / steps;
        const o0 = polarAt(cx, cy, t0, ringOuter);
        const o1 = polarAt(cx, cy, t1, ringOuter);
        const i1 = polarAt(cx, cy, t1, ringInner);
        const i0 = polarAt(cx, cy, t0, ringInner);
        doc.triangle(o0.x, o0.y, o1.x, o1.y, i1.x, i1.y, "F");
        doc.triangle(o0.x, o0.y, i1.x, i1.y, i0.x, i0.y, "F");
      }
      if (focused) {
        doc.setDrawColor(...stroke);
        doc.setLineWidth(1.6);
        const midSteps = Math.max(6, steps);
        for (let s = 0; s < midSteps; s++) {
          const t0 = a0 + ((a1 - a0) * s) / midSteps;
          const t1 = a0 + ((a1 - a0) * (s + 1)) / midSteps;
          const p0 = polarAt(cx, cy, t0, ringOuter);
          const p1 = polarAt(cx, cy, t1, ringOuter);
          doc.line(p0.x, p0.y, p1.x, p1.y);
        }
      }
      // Ring label
      const mid = (a0 + a1) / 2;
      const lp = polarAt(cx, cy, mid, (ringInner + ringOuter) / 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.ink);
      doc.text(
        PROFILE_RING[section.id]?.short || "Area",
        lp.x,
        lp.y + 2.5,
        { align: "center" },
      );
    }

    // White radar disc
    doc.setFillColor(255, 255, 255);
    // approximate disc with polygon
    {
      const pts: number[] = [];
      for (let i = 0; i < n; i++) {
        const p = polarAt(cx, cy, angleForIndex(i, n), radarR);
        pts.push(p.x, p.y);
      }
      // jsPDF doesn't have easy filled polygon - use triangles from center
      for (let i = 0; i < n; i++) {
        const p0 = polarAt(cx, cy, angleForIndex(i, n), radarR);
        const p1 = polarAt(cx, cy, angleForIndex((i + 1) % n, n), radarR);
        doc.triangle(cx, cy, p0.x, p0.y, p1.x, p1.y, "F");
      }
    }

    // Grid + spokes
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.5);
    for (let level = 1; level <= 4; level++) {
      const r = (radarR * level) / 4;
      for (let i = 0; i < n; i++) {
        const p0 = polarAt(cx, cy, angleForIndex(i, n), r);
        const p1 = polarAt(cx, cy, angleForIndex((i + 1) % n, n), r);
        doc.line(p0.x, p0.y, p1.x, p1.y);
      }
    }
    for (let i = 0; i < n; i++) {
      const p = polarAt(cx, cy, angleForIndex(i, n), radarR);
      doc.line(cx, cy, p.x, p.y);
    }

    // Data polygon (filled via triangles) + outline
    const dataPts = profileAxes.map((axis, i) => {
      const r = (Math.min(100, Math.max(0, axis.score)) / 100) * radarR;
      return polarAt(cx, cy, angleForIndex(i, n), r);
    });
    doc.setFillColor(225, 6, 0);
    // light fill - jsPDF setFillColor with GState would be better; approximate with translucent look via pale red
    doc.setFillColor(255, 214, 210);
    for (let i = 0; i < n; i++) {
      const p0 = dataPts[i];
      const p1 = dataPts[(i + 1) % n];
      doc.triangle(cx, cy, p0.x, p0.y, p1.x, p1.y, "F");
    }
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(1.4);
    for (let i = 0; i < n; i++) {
      const p0 = dataPts[i];
      const p1 = dataPts[(i + 1) % n];
      doc.line(p0.x, p0.y, p1.x, p1.y);
    }
    for (let i = 0; i < n; i++) {
      const axis = profileAxes[i];
      const p = dataPts[i];
      const focused = axis.id === report.mainChallenge.imageKey;
      const dot: RGB = focused ? C.accent : C.ink;
      doc.setFillColor(...dot);
      doc.circle(p.x, p.y, focused ? 2.4 : 1.7, "F");
      doc.setFillColor(...C.white);
      doc.circle(p.x, p.y, focused ? 0.9 : 0.6, "F");
    }

    // Axis labels
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    for (let i = 0; i < n; i++) {
      const axis = profileAxes[i];
      const p = polarAt(cx, cy, angleForIndex(i, n), labelR);
      const focused = axis.id === report.mainChallenge.imageKey;
      const labelColor: RGB = focused ? C.accent : C.muted;
      doc.setTextColor(...labelColor);
      doc.text(shortProfileLabel(axis.label), p.x, p.y + 1.8, {
        align: "center",
      });
    }

    y += chartSize + 18;

    // Band score cards (2–4 depending on transcript-only vs full audio)
    const bandCount = orderedProfile.length;
    const gap = 8;
    const boxW = (contentW - gap * Math.max(0, bandCount - 1)) / bandCount;
    const boxH = 52;
    ensureSpace(boxH + 24);
    orderedProfile.forEach((section, idx) => {
      const bx = marginX + idx * (boxW + gap);
      const stroke =
        PROFILE_RING_STROKE_RGB[section.id] || ([180, 180, 180] as const);
      const focused = section.id === focusSecId;
      const border: RGB = focused ? C.accent : C.line;
      const bandShort =
        section.id === "aCertainty"
          ? "Authority"
          : PROFILE_RING[section.id]?.short || "Area";
      doc.setFillColor(...C.white);
      doc.setDrawColor(...border);
      doc.setLineWidth(focused ? 1.4 : 0.7);
      doc.roundedRect(bx, y, boxW, boxH, 10, 10, "FD");
      doc.setFillColor(...stroke);
      doc.rect(bx, y, boxW, 3.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text(bandShort.toUpperCase(), bx + 8, y + 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...C.ink);
      const scoreStr = String(section.score);
      const scoreW = doc.getTextWidth(scoreStr);
      doc.text(scoreStr, bx + 8, y + 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text("/100", bx + 8 + scoreW + 6, y + 38);
    });
    y += boxH + 16;

    const weakest = [...orderedProfile].sort((a, b) => a.score - b.score)[0];
    const bandLine = profileBandSummary(
      Math.round(report.overallScore),
      weakest,
    );
    if (bandLine) {
      const focusGeneric = report.mainChallenge.imageKey === "generic";
      const highPerformer = isHighPerformer(Math.round(report.overallScore));
      const soft =
        highPerformer && focusGeneric
          ? bandLine
          : `${bandLine.replace(/\.$/, "")}${
              focusSecId === weakest?.id
                ? " — that’s where your main challenge sits."
                : "."
            }`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...C.muted);
      const softLines = wrapLines(doc, soft, contentW, 9.5);
      ensureSpace(softLines.length * 13 + 8);
      for (const line of softLines) {
        doc.text(line, marginX, y);
        y += 13;
      }
      y += 12;
    }
  }

  // Compact full-width focus strip (details live on page 1)
  ensureSpace(58);
  const stripH = 52;
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.8);
  doc.roundedRect(marginX, y, contentW, stripH, 14, 14, "FD");
  doc.setFillColor(...C.yellow);
  doc.roundedRect(marginX, y, 8, stripH, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.orange);
  doc.text("MAIN FOCUS", marginX + 20, y + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...C.ink);
  doc.text(focusTitle, marginX + 20, y + 38);

  if (focusBlurb) {
    const blurbMax = contentW * 0.48;
    const blurbLines = wrapLines(doc, focusBlurb, blurbMax, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    let by = y + 18;
    for (const line of blurbLines.slice(0, 3)) {
      doc.text(line, marginX + contentW - 18, by, { align: "right" });
      by += 12;
    }
  }
  y += stripH + 12;

  // ——— Part A / B ———
  drawPartWithNumbers(
    "PART A — Main Challenges",
    "Primary scorecard. Overall score is the average of these 15. Strongest area first.",
    buildPartASections(report.stats, {
      transcriptOnly: Boolean(report.transcriptOnly),
    }),
  );

  drawPartWithNumbers(
    "PART B — Supporting diagnostics",
    "Secondary signals. Not averaged into overall. Strongest area first.",
    buildPartBSections(report.stats, {
      transcriptOnly: Boolean(report.transcriptOnly),
    }),
  );

  // ——— Notes ———
  newPage();
  drawEyebrow("Practice 03");
  drawBrand();
  drawTitle("Secondary notes");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text("What else worked, and what to tighten next.", marginX, y);
  y += 18;
  body(report.minorChallenges || "—");
  drawCta();

  // ——— Practice workbook (2–3 pages by level) ———
  const plan = resolvePracticePlan(report.level, report.overallScore);
  const mainFocusTitle = (report.mainChallenge.title || "").trim();

  const drawPlanSection = (label: string) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.accent);
    doc.text(label.toUpperCase(), marginX, y);
    y += 16;
  };

  const drawCheckLines = (items: string[]) => {
    for (const item of items) {
      body(item, { size: 10.5 });
    }
  };

  // Plan page 1 — Where you are
  newPage();
  drawEyebrow("Plan 04");
  drawBrand();
  drawTitle("Your practice plan");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text(`For your level: ${plan.level}`, marginX, y);
  y += 18;

  drawPlanSection("Where you are");
  body(plan.whatThisLevelMeans);
  body(plan.nextFourteenDays);
  if (mainFocusTitle) {
    body(
      `Start with your main challenge: ${mainFocusTitle}. Use the drills below to attack that habit first.`,
    );
  }

  drawPlanSection("Week 1 focus");
  body(plan.week1Focus);
  drawPlanSection("Week 2 focus");
  body(plan.week2Focus);
  drawCta();

  // Plan page 2 — Drills
  newPage();
  drawEyebrow("Plan 05");
  drawBrand();
  drawTitle("Your drills");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text("Check each box as you complete it. Keep sessions short.", marginX, y);
  y += 18;

  drawPlanSection("Daily (5 to 10 minutes)");
  drawCheckLines([...plan.dailyDrills]);
  drawPlanSection("Three times this week (about 15 minutes)");
  drawCheckLines([...plan.thriceWeeklyDrills]);
  drawPlanSection("Pressure drill (once this week)");
  body(plan.pressureDrill);
  drawCta();

  // Plan page 3 — Make it stick
  newPage();
  drawEyebrow("Plan 06");
  drawBrand();
  drawTitle("Make it stick");

  drawPlanSection("What to stop doing");
  drawCheckLines(plan.trapsToStop.map((t) => `• ${t}`));
  drawPlanSection("Your framework");
  body(plan.framework);
  drawPlanSection("How you will know it is working");
  drawCheckLines(plan.successSignals.map((s, i) => `${i + 1}. ${s}`));
  drawPlanSection("What the next level looks like");
  body(plan.nextLevelLooksLike);

  drawPlanSection("Notes from this week");
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.6);
  for (let i = 0; i < 5; i++) {
    ensureSpace(22);
    doc.line(marginX, y, marginX + contentW, y);
    y += 22;
  }
  y += 8;
  drawCta();

  // ——— Testimonials ———
  newPage();
  drawEyebrow("Stories 07");
  const testimonials = await loadImageDataUrl("/pdf/testimonials.png");
  if (testimonials) {
    const imgW = contentW;
    const imgH = contentW * (512 / 1024);
    ensureSpace(imgH + 20);
    try {
      doc.addImage(testimonials, "JPEG", marginX, y, imgW, imgH, undefined, "FAST");
      y += imgH + 20;
    } catch {
      try {
        doc.addImage(testimonials, "PNG", marginX, y, imgW, imgH, undefined, "FAST");
        y += imgH + 20;
      } catch {
        // skip
      }
    }
  } else {
    drawBrand();
    drawTitle("What Elite Speakers Say");
    body("See elitespeakprogram.com for more participant stories.");
  }

  drawCta();

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(i);
  }

  return doc;
}

export async function downloadReportPdf(
  report: DiagnosisReport,
  options: ReportPdfOptions = {},
): Promise<void> {
  const doc = await buildReportPdf(report, options);
  const safe =
    options.recipientName?.trim().replace(/[^\w\- ]+/g, "").slice(0, 40) || "";
  const filename = safe
    ? `YourCommunicationReport-${safe.replace(/\s+/g, "")}.pdf`
    : PDF_FILENAME;
  doc.save(filename);
}

export async function getReportPdfBlobUrl(
  report: DiagnosisReport,
  options: ReportPdfOptions = {},
): Promise<string> {
  const doc = await buildReportPdf(report, options);
  return String(doc.output("bloburl"));
}

export { PDF_FILENAME };
