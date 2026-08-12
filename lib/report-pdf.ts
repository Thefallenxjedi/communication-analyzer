import { jsPDF } from "jspdf";
import type { ChallengeImageKey, DiagnosisReport } from "@/lib/schema";
import {
  CHALLENGE_BLURBS,
  CHALLENGE_IMAGE_KEYS,
  STAT_HINTS,
  type StatId,
} from "@/lib/schema";
import { buildPartASections, buildPartBSections } from "@/lib/scoring";
import { challengeImagePath } from "@/lib/challenge-images";

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
  const scoreCardH = 100;
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
  let levelY = scoreCardY + (scoreCardH - levelBlockH) / 2 + 12;
  for (const line of levelLines) {
    doc.text(line, marginX + contentW - scorePad, levelY, { align: "right" });
    levelY += 16;
  }
  y = scoreCardY + scoreCardH + 28;

  // ——— Main focus ———
  drawEyebrow("Focus 02");
  drawTitle("Your main focus");

  const focusTitle = report.mainChallenge.title || "Primary opportunity";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const focusPadX = 18;
  const focusTextW = doc.getTextWidth(focusTitle);
  const focusW = Math.min(contentW, focusTextW + focusPadX * 2);
  const focusH = 32;
  doc.setFillColor(...C.yellow);
  doc.roundedRect(marginX, y, focusW, focusH, 16, 16, "F");
  doc.setTextColor(...C.ink);
  doc.text(focusTitle, marginX + focusPadX, y + 21);
  y += focusH + 16;

  // Same challenge illustration as the on-screen report
  const challengeImg = await loadImageDataUrl(
    challengeImagePath(report.mainChallenge.imageKey || "generic"),
  );
  if (challengeImg) {
    const imgW = Math.min(contentW, 340);
    const imgH = imgW * (10 / 16);
    ensureSpace(imgH + 16);
    try {
      const fmt = challengeImg.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(
        challengeImg,
        fmt,
        marginX + (contentW - imgW) / 2,
        y,
        imgW,
        imgH,
        undefined,
        "FAST",
      );
      y += imgH + 12;
    } catch {
      // skip image if encode fails
    }
  }

  const imageKey = (
    (CHALLENGE_IMAGE_KEYS as readonly string[]).includes(
      report.mainChallenge.imageKey || "",
    )
      ? report.mainChallenge.imageKey
      : "generic"
  ) as ChallengeImageKey;
  const focusBlurb =
    report.mainChallenge.summary?.trim() || CHALLENGE_BLURBS[imageKey];
  if (focusBlurb) {
    const blurbLines = wrapLines(doc, focusBlurb, contentW, 10);
    ensureSpace(blurbLines.length * 14 + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    for (const line of blurbLines) {
      doc.text(line, marginX + contentW / 2, y, { align: "center" });
      y += 14;
    }
    y += 10;
  }

  const drawFeedbackBlock = (
    label: string,
    text: string,
    labelColor: RGB,
  ) => {
    const size = 10.5;
    const lines = wrapLines(doc, text, contentW - 36, size);
    const lineH = size + 5;
    const boxH = 32 + lines.length * lineH + 14;
    ensureSpace(boxH + 10);

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginX, y, contentW, boxH, 14, 14, "FD");

    drawPlusBullet(marginX + 18, y + 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...labelColor);
    doc.text(label, marginX + 30, y + 19);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...C.ink);
    let ty = y + 38;
    for (const line of lines) {
      doc.text(line, marginX + 18, ty);
      ty += lineH;
    }
    y += boxH + 12;
  };

  if (report.mainChallenge.strengths) {
    drawFeedbackBlock(
      "WHAT WENT WELL",
      report.mainChallenge.strengths,
      C.good,
    );
  }
  if (report.mainChallenge.improvements) {
    drawFeedbackBlock(
      "WHAT TO IMPROVE",
      report.mainChallenge.improvements,
      C.accent,
    );
  }
  if (
    !report.mainChallenge.strengths &&
    !report.mainChallenge.improvements &&
    report.mainChallenge.summary
  ) {
    body(report.mainChallenge.summary);
  }

  // ——— Part A / B ———
  drawPartWithNumbers(
    "PART A — Main Challenges",
    "Primary scorecard. Overall score is the average of these 15. Strongest area first.",
    buildPartASections(report.stats),
  );

  drawPartWithNumbers(
    "PART B — Supporting diagnostics",
    "Secondary signals. Not averaged into overall. Strongest area first.",
    buildPartBSections(report.stats),
  );

  // ——— Notes + plan ———
  newPage();
  drawEyebrow("Practice 03");
  drawBrand();
  drawTitle("Secondary notes");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text("What else worked — and what to tighten next.", marginX, y);
  y += 18;
  body(report.minorChallenges || "—");

  y += 6;
  const planPad = 20;
  const planLineH = 15;
  const planLines = wrapLines(
    doc,
    report.solutionsCopy || "—",
    contentW - planPad * 2,
    10.5,
  );
  const planH = 58 + planLines.length * planLineH + 22;
  const maxPlanH = pageH - bottomSafe - 48;

  if (planH > maxPlanH) {
    ensureSpace(40);
    drawEyebrow("Plan");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...C.ink);
    doc.text("Your practice plan", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("Keep what works. Drill what doesn't.", marginX, y);
    y += 16;
    body(report.solutionsCopy || "—");
  } else {
    if (y + planH > pageH - bottomSafe) newPage();
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.8);
    doc.roundedRect(marginX, y, contentW, planH, 16, 16, "FD");
    doc.setFillColor(...C.yellow);
    doc.roundedRect(marginX, y, 10, planH, 5, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...C.ink);
    doc.text("Your practice plan", marginX + planPad, y + 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("Keep what works. Drill what doesn't.", marginX + planPad, y + 42);

    let planY = y + 62;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...C.ink);
    for (const line of planLines) {
      doc.text(line, marginX + planPad, planY);
      planY += planLineH;
    }
    y += planH + 22;
  }

  drawCta();

  // ——— Testimonials ———
  newPage();
  drawEyebrow("Stories 04");
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
