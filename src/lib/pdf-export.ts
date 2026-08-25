import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { HydratedMatch } from "@/components/MatchCard";
import { formatMatchDay } from "@/lib/cricket";
import type { TournamentRuleItem } from "@/lib/tournament-rules";

export async function downloadSchedulePDF(
  matches: HydratedMatch[],
  tournamentName = "WASA Premier League 2026"
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Primary Colors (Emerald & Slate Theme)
  const primaryEmerald = [5, 150, 105]; // #059669
  const darkSlate = [15, 23, 42]; // #0f172a
  const accentGold = [217, 119, 6]; // #d97706

  // 1. Header Banner
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.rect(0, 0, pageWidth, 38, "F");

  // Emerald Top Stripe
  doc.setFillColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Title Text
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(tournamentName.toUpperCase(), 14, 18);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(167, 243, 208); // light emerald
  doc.text("Official Tournament Fixtures & Match Schedule", 14, 25);

  // Meta stats right aligned in header
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const nowStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.text(`Generated: ${nowStr}`, pageWidth - 14, 18, { align: "right" });
  doc.text(`Total Fixtures: ${matches.length} Matches`, pageWidth - 14, 25, { align: "right" });

  // 2. Info Summary Card
  const allDates = Array.from(new Set(matches.map((m) => m.date?.trim()).filter(Boolean)));
  const allVenues = Array.from(new Set(matches.map((m) => m.venue?.trim()).filter(Boolean)));
  const venueText = allVenues.length > 0 ? allVenues.join(" • ") : "Askari XI Cricket Ground, Lahore";
  const dateText = allDates.length > 0 ? allDates.join(" to ") : "Scheduled Dates";

  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(14, 43, pageWidth - 28, 14, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text("VENUE & FORMAT:", 18, 51.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${venueText}  |  ${dateText}  |  4 Overs League / 5 Overs Final`, 55, 51.5);

  // 3. Table Rows Construction
  const tableData = matches.map((m) => {
    const isPlayoff = m.stage === "PLAYOFF" || m.stage?.toUpperCase() === "PLAYOFF";
    const isFinal = m.stage === "FINAL" || m.stage?.toUpperCase() === "FINAL";
    const matchLabel = isFinal
      ? "GRAND FINAL"
      : isPlayoff
        ? "PLAYOFF MATCH"
        : `Match ${m.matchNumber}`;
    const dayDate = formatMatchDay(m.day, m.date);
    const time = m.time || "TBD";
    const teamA = m.teamA
      ? `${m.teamA.name} (${m.teamA.shortName})`
      : isFinal
        ? "TBD (Rank 1)"
        : isPlayoff
          ? "TBD (Rank 2)"
          : "TBD";
    const teamB = m.teamB
      ? `${m.teamB.name} (${m.teamB.shortName})`
      : isFinal
        ? "TBD (Playoff Winner)"
        : isPlayoff
          ? "TBD (Rank 3)"
          : "TBD";
    const matchup = `${teamA} vs ${teamB}`;
    
    let statusText = m.status;
    if (m.status === "UPCOMING") statusText = "Upcoming";
    else if (m.status === "LIVE") statusText = "LIVE";
    else if (m.status === "COMPLETED") {
      statusText = m.resultText || "Completed";
    }

    return [matchLabel, dayDate, time, matchup, statusText];
  });

  // 4. AutoTable for Fixtures
  autoTable(doc, {
    startY: 62,
    head: [["Fixture", "Day & Date", "Time", "Teams / Matchup", "Status / Result"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
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
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      1: { cellWidth: 36 },
      2: { cellWidth: 20 },
      3: { cellWidth: 54, fontStyle: "bold" },
      4: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      // Highlight Grand Final row
      const fixtureText = data.row.raw ? String(data.row.raw[0]) : "";
      if (fixtureText.includes("GRAND FINAL") && data.section === "body") {
        data.cell.styles.fillColor = [254, 243, 199]; // amber-100
        data.cell.styles.textColor = [146, 64, 14]; // amber-800
        data.cell.styles.fontStyle = "bold";
      } else if (fixtureText.includes("PLAYOFF") && data.section === "body") {
        data.cell.styles.fillColor = [243, 232, 255]; // purple-100
        data.cell.styles.textColor = [107, 33, 168]; // purple-800
        data.cell.styles.fontStyle = "bold";
      }

      // Highlight Results / Status
      if (data.column.index === 4 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val === "LIVE") {
          data.cell.styles.textColor = [220, 38, 38]; // red-600
          data.cell.styles.fontStyle = "bold";
        } else if (val.includes("won by") || val === "Completed") {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Tournament Guidelines Box at the bottom
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  
  if (finalY + 32 < pageHeight) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, finalY + 8, pageWidth - 28, 22, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("TOURNAMENT GUIDELINES & FORMAT:", 18, finalY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("• All league & playoff matches are 4 overs per side. Grand Final is 5 overs per side.", 18, finalY + 19.5);
    doc.text("• Team Ranked 1 directly qualifies for Grand Final. Teams Ranked 2 & 3 play in the Playoff match.", 18, finalY + 24.5);
  }

  // 6. Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `WASA Cricket Platform • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // Save the PDF
  const filename = `${tournamentName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-schedule.pdf`;
  doc.save(filename);
}

/**
 * Generate and download official Tournament Rules PDF
 */
export async function downloadRulesPDF(
  rules: TournamentRuleItem[],
  tournamentName = "WASA Premier League 2026"
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryEmerald = [5, 150, 105]; // #059669
  const darkSlate = [15, 23, 42]; // #0f172a
  const accentAmber = [217, 119, 6]; // #d97706

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
  doc.text("6-a-Side Tape Ball Cricket  •  4 Overs League / 5 Overs Final  •  Askari XI Ground, Lahore", 60, 51.5);

  // 3. Build Categorized Table Body
  const tableData: (string | number)[][] = rules.map((r, index) => {
    return [index + 1, r.category, r.rule];
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
      `WASA Cricket Platform • Tournament Rules • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // Save the PDF
  const filename = `${tournamentName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-tournament-rules.pdf`;
  doc.save(filename);
}
