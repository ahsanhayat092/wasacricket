import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { HydratedMatch } from "@/components/MatchCard";
import { formatMatchDay } from "@/lib/cricket";
import type { TournamentRuleItem } from "@/lib/tournament-rules";
import { parseCustomDate } from "@/components/DatePicker";
import { format } from "date-fns";

export interface SchedulePDFOptions {
  tournamentName?: string;
  venueName?: string;
  oversPerSide?: number;
  maxOverPerBowler?: number;
  formatType?: string;
}

/**
 * Sanitizes text to remove emojis, surrogate pairs, and non-printable characters
 * that corrupt standard PDF-1.3/1.4 font streams (WinAnsiEncoding).
 */
export function cleanPdfText(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "") // remove surrogate pairs & emojis
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " ") // keep printable ASCII and Latin-1
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Bulletproof cross-platform PDF file saver.
 * Supports desktop browsers, iOS Safari, Android Chrome, and in-app webviews.
 */
export function savePdfDocument(doc: jsPDF, filename: string) {
  const safeFilename = filename.toLowerCase().endsWith(".pdf")
    ? filename
    : `${filename}.pdf`;

  if (typeof window === "undefined") {
    doc.save(safeFilename);
    return;
  }

  try {
    const rawBlob = doc.output("blob");
    const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(pdfBlob);

    const isMobile =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // On mobile devices, opening the PDF blob directly in a new window/tab
    // prevents Android DownloadManager "Can't open file" issues
    if (isMobile) {
      window.open(blobUrl, "_blank");
    }

    // Trigger standard jsPDF save (with internal FileSaver fallback)
    try {
      doc.save(safeFilename);
    } catch {
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = safeFilename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) document.body.removeChild(a);
      }, 1000);
    }

    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore cleanup error
      }
    }, 120000);
  } catch (err) {
    console.warn("Custom Blob download fallback to doc.save:", err);
    doc.save(safeFilename);
  }
}

/**
 * Standardizes tournament overall date range for info header: e.g. "14 September 2026 to 15 September 2026 (2 Days)"
 */
export function formatTournamentDateRange(
  matches: { date?: string | null; day?: string | number | null }[]
): string {
  const parsedDates = matches
    .map((m) => {
      if (!m.date) return undefined;
      const parsed = parseCustomDate(m.date);
      if (parsed && !isNaN(parsed.getTime())) {
        if (parsed.getFullYear() < 2020) parsed.setFullYear(2026);
        return parsed;
      }
      return undefined;
    })
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());

  if (parsedDates.length === 0) {
    const rawDates = Array.from(
      new Set(matches.map((m) => m.date?.trim()).filter(Boolean))
    );
    if (rawDates.length > 1) return `${rawDates[0]} to ${rawDates[rawDates.length - 1]}`;
    return rawDates[0] || "Dates As Scheduled";
  }

  const first = parsedDates[0];
  const last = parsedDates[parsedDates.length - 1];

  const firstStr = format(first, "d MMMM yyyy");
  const lastStr = format(last, "d MMMM yyyy");

  // Calculate distinct calendar days
  const distinctDays = new Set(
    parsedDates.map((d) => format(d, "yyyy-MM-dd"))
  ).size;

  const daySuffix = distinctDays > 1 ? ` (${distinctDays} Days)` : "";

  if (firstStr === lastStr) {
    return `${firstStr}${daySuffix}`;
  }

  return `${firstStr} to ${lastStr}${daySuffix}`;
}

/**
 * Resolves tournament day number (1 for Day 1, 2 for Day 2, etc.) for a match
 */
export function getTournamentDayNumber(
  matchDate: string | undefined | null,
  matchDay: string | number | undefined | null,
  allMatches: Array<{ date?: string | null; day?: string | number | null }>
): number {
  // If explicitly designated Day X
  if (typeof matchDay === "number") return matchDay;
  if (matchDay) {
    const matched = String(matchDay).match(/day\s*(\d+)/i);
    if (matched) return parseInt(matched[1], 10);
  }

  // Build sorted distinct midnight timestamps
  const dateTimestamps: number[] = [];
  const seenTimestamps = new Set<number>();

  for (const m of allMatches) {
    if (!m.date) continue;
    const p = parseCustomDate(m.date);
    if (p && !isNaN(p.getTime())) {
      if (p.getFullYear() < 2020) p.setFullYear(2026);
      const mid = new Date(p.getFullYear(), p.getMonth(), p.getDate()).getTime();
      if (!seenTimestamps.has(mid)) {
        seenTimestamps.add(mid);
        dateTimestamps.push(mid);
      }
    }
  }

  if (dateTimestamps.length > 0) {
    dateTimestamps.sort((a, b) => a - b);
    if (matchDate) {
      const pCurrent = parseCustomDate(matchDate);
      if (pCurrent && !isNaN(pCurrent.getTime())) {
        if (pCurrent.getFullYear() < 2020) pCurrent.setFullYear(2026);
        const midCurrent = new Date(
          pCurrent.getFullYear(),
          pCurrent.getMonth(),
          pCurrent.getDate()
        ).getTime();
        const idx = dateTimestamps.indexOf(midCurrent);
        if (idx !== -1) return idx + 1;
      }
    }
  }

  // Fallback if no dates exist: group by distinct days
  const distinctDays = Array.from(
    new Set(
      allMatches
        .map((m) => (m.day ? String(m.day).trim().toUpperCase() : ""))
        .filter(Boolean)
    )
  );
  if (distinctDays.length > 0 && matchDay) {
    const idx = distinctDays.indexOf(String(matchDay).trim().toUpperCase());
    if (idx !== -1) return idx + 1;
  }

  return 1;
}

/**
 * Formats day and date for the PDF fixtures table:
 * e.g. "Day 1 - Mon, 14 September 2026", "Day 2 - Tue, 15 September 2026"
 */
export function formatMatchDayWithDayNumber(
  day: string | number | undefined | null,
  date: string | undefined | null,
  allMatches: Array<{ date?: string | null; day?: string | number | null }>
): string {
  const baseDayDate = cleanPdfText(formatMatchDay(typeof day === "string" ? day : null, date)) || "";
  const dayNum = getTournamentDayNumber(date, day, allMatches);

  if (!baseDayDate || baseDayDate === "TBD") {
    return `Day ${dayNum}`;
  }

  // Avoid duplicate "Day 1 - Day 1 ..."
  if (/^day\s*\d+/i.test(baseDayDate)) {
    return baseDayDate;
  }

  return `Day ${dayNum} - ${baseDayDate}`;
}

/**
 * Core builder that produces a high-contrast, landscape A4 PDF document
 */
export function buildSchedulePdfDoc(
  matches: HydratedMatch[],
  optionsOrName?: string | SchedulePDFOptions,
  extraOptions?: SchedulePDFOptions
): { doc: jsPDF; filename: string; tournamentName: string } {
  const options: SchedulePDFOptions =
    typeof optionsOrName === "string"
      ? { tournamentName: optionsOrName, ...extraOptions }
      : { ...optionsOrName };

  const rawName = (options.tournamentName || "Tournament Schedule").trim();
  const tournamentName = cleanPdfText(rawName) || "Tournament Schedule";
  const defaultOvers = options.oversPerSide || 4;
  const defaultMaxBowler =
    options.maxOverPerBowler || (defaultOvers <= 5 ? 1 : Math.ceil(defaultOvers / 5));
  const formatType = cleanPdfText((options.formatType || "CRICKET").replace(/_/g, " "));
  const fallbackVenue = cleanPdfText(options.venueName || "Askari XI Cricket Ground, Lahore");

  // Landscape A4 provides 297mm width - optimal orientation for 8-column tournament fixtures
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

  // Palette
  const darkNavy = [15, 23, 42]; // #0f172a
  const emeraldPrimary = [5, 150, 105]; // #059669
  const emeraldHeader = [4, 120, 87]; // #047857

  // 1. Header Banner (Navy Slate with Emerald Stripe)
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Emerald Top Stripe
  doc.setFillColor(emeraldPrimary[0], emeraldPrimary[1], emeraldPrimary[2]);
  doc.rect(0, 0, pageWidth, 3.5, "F");

  // Tournament Title
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(tournamentName.toUpperCase(), 14, 16);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(167, 243, 208); // light emerald
  doc.text("OFFICIAL TOURNAMENT FIXTURES & MATCH SCHEDULE", 14, 23);

  // Metadata right-aligned
  const nowStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Generated: ${nowStr}`, pageWidth - 14, 15, { align: "right" });
  doc.text(`Total Fixtures: ${matches.length} Matches`, pageWidth - 14, 21, { align: "right" });
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text(`Format: ${defaultOvers} OVERS | ${formatType}`, pageWidth - 14, 27, { align: "right" });

  // 2. Info Summary Card
  const allVenues = Array.from(new Set(matches.map((m) => cleanPdfText(m.venue)).filter(Boolean)));
  const venueText = allVenues.length > 0 ? allVenues.join(" | ") : fallbackVenue;
  const dateText = formatTournamentDateRange(matches);

  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(14, 36, pageWidth - 28, 11, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.text("VENUE:", 18, 43);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(venueText, 32, 43);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("DATES:", 115, 43);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(dateText, 128, 43);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("DEFAULT QUOTA:", 205, 43);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(5, 150, 105);
  doc.text(`${defaultOvers} Ov / side (Max ${defaultMaxBowler} ov/bowler)`, 234, 43);

  // 3. Build Table Data with Clean ASCII/Latin-1 Text
  const tableData = matches.map((m) => {
    const isSemi =
      m.stage === "SEMI_FINAL" ||
      m.stage === "SEMI_1" ||
      m.stage === "SEMI_2";
    const isPlayoff =
      m.stage === "PLAYOFF" ||
      isSemi ||
      m.stage === "QUALIFIER_1" ||
      m.stage === "QUALIFIER_2" ||
      m.stage === "ELIMINATOR";
    const isFinal = m.stage === "FINAL";

    let stageLabel = "League";
    if (isFinal) stageLabel = "GRAND FINAL";
    else if (m.stage === "SEMI_FINAL") stageLabel = "Semi-Final";
    else if (m.stage === "SEMI_1") stageLabel = "Semi-Final 1";
    else if (m.stage === "SEMI_2") stageLabel = "Semi-Final 2";
    else if (m.stage === "QUALIFIER_1") stageLabel = "Qualifier 1";
    else if (m.stage === "QUALIFIER_2") stageLabel = "Qualifier 2";
    else if (m.stage === "ELIMINATOR") stageLabel = "Eliminator";
    else if (isPlayoff) stageLabel = "Playoff";
    else if (m.stage === "GROUP_STAGE" || m.stage === "GROUP") {
      stageLabel = m.groupName ? `Group ${cleanPdfText(m.groupName)}` : "Group Stage";
    }
    else if (m.groupName) stageLabel = `Group ${cleanPdfText(m.groupName)}`;

    const matchNumberLabel = `#${m.matchNumber}`;
    const dayDate = cleanPdfText(formatMatchDayWithDayNumber(m.day, m.date, matches)) || "TBD";
    const time = cleanPdfText(m.time) || "TBD";

    const teamAName = m.teamA
      ? `${cleanPdfText(m.teamA.name)}${m.teamA.shortName ? ` (${cleanPdfText(m.teamA.shortName)})` : ""}`
      : isFinal
        ? "TBD (Finalist 1)"
        : isSemi
          ? "TBD (Semi-Finalist 1)"
          : isPlayoff
            ? "TBD (Qualifier)"
            : "TBD";

    const teamBName = m.teamB
      ? `${cleanPdfText(m.teamB.name)}${m.teamB.shortName ? ` (${cleanPdfText(m.teamB.shortName)})` : ""}`
      : isFinal
        ? "TBD (Finalist 2)"
        : isSemi
          ? "TBD (Semi-Finalist 2)"
          : isPlayoff
            ? "TBD (Qualifier)"
            : "TBD";

    const matchup = `${teamAName}   vs   ${teamBName}`;
    const matchOvers = `${m.oversPerSide || defaultOvers} Ov`;
    const venue = cleanPdfText(m.venue) || venueText || "Venue TBD";

    let statusText = cleanPdfText(m.status) || "Upcoming";
    if (m.status === "UPCOMING") statusText = "Upcoming";
    else if (m.status === "LIVE") statusText = "LIVE";
    else if (m.status === "COMPLETED") {
      statusText = cleanPdfText(m.resultText) || "Completed";
    }

    return [
      matchNumberLabel,
      stageLabel,
      dayDate,
      time,
      matchup,
      matchOvers,
      venue,
      statusText,
    ];
  });

  // Usable width: 297 - 28 = 269mm (left: 14mm, right: 14mm)
  autoTable(doc, {
    startY: 51,
    head: [["Match", "Stage", "Day & Date", "Time", "Teams / Matchup", "Quota", "Venue", "Status / Result"]],
    body: tableData,
    theme: "grid",
    showHead: "everyPage",
    headStyles: {
      fillColor: emeraldHeader as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42], // deep dark slate for maximum contrast & crisp readability
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: "bold", halign: "center" },
      1: { cellWidth: 26, fontStyle: "bold" },
      2: { cellWidth: 46 },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 80, fontStyle: "bold" },
      5: { cellWidth: 16, halign: "center" },
      6: { cellWidth: 34 },
      7: { cellWidth: 33, halign: "center" },
    },
    didParseCell: (data) => {
      const rowRaw = data.row.raw as string[] | undefined;
      const stageText = rowRaw ? String(rowRaw[1] || "") : "";

      if (data.section === "body") {
        // Highlight Grand Final
        if (stageText.includes("FINAL") && !stageText.includes("Semi")) {
          data.cell.styles.fillColor = [254, 243, 199]; // amber-100
          data.cell.styles.textColor = [120, 53, 15]; // amber-900
          data.cell.styles.fontStyle = "bold";
        }
        // Highlight Playoffs / Semi-Finals
        else if (
          stageText.includes("Semi") ||
          stageText.includes("Playoff") ||
          stageText.includes("Qualifier") ||
          stageText.includes("Eliminator")
        ) {
          data.cell.styles.fillColor = [243, 232, 255]; // purple-100
          data.cell.styles.textColor = [88, 28, 135]; // purple-900
          data.cell.styles.fontStyle = "bold";
        }

        // Status column styling
        if (data.column.index === 7) {
          const val = String(data.cell.raw);
          if (val === "LIVE") {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
            data.cell.styles.fontStyle = "bold";
          } else if (val.toLowerCase().includes("won") || val === "Completed") {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [71, 85, 105]; // slate-600
          }
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 4. Page Numbers and Footer Branding on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 9, pageWidth - 14, pageHeight - 9);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "PitchPe Tournament Management Platform - Official Match Fixtures Schedule",
      14,
      pageHeight - 5
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 14,
      pageHeight - 5,
      { align: "right" }
    );
  }

  // Safe file name
  const safeName =
    tournamentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tournament";
  const filename = `${safeName}-schedule.pdf`;

  return { doc, filename, tournamentName };
}

/**
 * Downloads the fixtures PDF
 */
export async function downloadSchedulePDF(
  matches: HydratedMatch[],
  optionsOrName?: string | SchedulePDFOptions,
  extraOptions?: SchedulePDFOptions
) {
  const { doc, filename } = buildSchedulePdfDoc(matches, optionsOrName, extraOptions);
  savePdfDocument(doc, filename);
}

/**
 * Opens the fixtures PDF directly in a new browser tab for immediate viewing/printing
 */
export async function openSchedulePDF(
  matches: HydratedMatch[],
  optionsOrName?: string | SchedulePDFOptions,
  extraOptions?: SchedulePDFOptions
) {
  const { doc } = buildSchedulePdfDoc(matches, optionsOrName, extraOptions);
  const rawBlob = doc.output("blob");
  const pdfBlob = new Blob([rawBlob], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, "_blank");
}

/**
 * Generate and download official Tournament Rules PDF
 */
export async function downloadRulesPDF(
  rules: TournamentRuleItem[],
  rawTournamentName = "WASA Premier League 2026"
) {
  const tournamentName = cleanPdfText(rawTournamentName) || "Tournament Rules";
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryEmerald = [5, 150, 105]; // #059669
  const darkSlate = [15, 23, 42]; // #0f172a

  // 1. Header Banner
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.rect(0, 0, pageWidth, 38, "F");

  // Emerald Top Stripe
  doc.setFillColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Title Text
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text(tournamentName.toUpperCase(), 14, 18);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(167, 243, 208);
  doc.text("Official Tournament Rules & Regulations Guide", 14, 25);

  // Date
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const nowStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.text(`Official Document`, pageWidth - 14, 18, { align: "right" });
  doc.text(`Updated: ${nowStr}`, pageWidth - 14, 25, { align: "right" });

  // 2. Info Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 43, pageWidth - 28, 14, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text("TOURNAMENT FORMAT:", 18, 51.5);
  doc.setFont("helvetica", "normal");
  doc.text("Tape Ball Cricket | League & Knockouts | Official Match Rules", 60, 51.5);

  // 3. Build Categorized Table Body with Clean Text
  const tableData: (string | number)[][] = rules.map((r, index) => {
    return [index + 1, cleanPdfText(r.category), cleanPdfText(r.rule)];
  });

  autoTable(doc, {
    startY: 62,
    head: [["#", "Category", "Official Rule & Regulation"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, fontStyle: "bold", halign: "center" },
      1: { cellWidth: 42, fontStyle: "bold", textColor: [15, 23, 42] },
      2: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === "body") {
        const cat = String(data.cell.raw);
        if (cat.includes("Last Man")) {
          data.cell.styles.textColor = [217, 119, 6]; // amber
        } else if (cat.includes("Tie-Breaker")) {
          data.cell.styles.textColor = [16, 185, 129]; // emerald
        } else if (cat.includes("Bowling")) {
          data.cell.styles.textColor = [14, 116, 144]; // sky
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 4. Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `PitchPe Platform - Tournament Rules - Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // Safe file name and download
  const safeName =
    tournamentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tournament";
  const filename = `${safeName}-tournament-rules.pdf`;
  savePdfDocument(doc, filename);
}
