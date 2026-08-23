import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { HydratedMatch } from "@/components/MatchCard";
import { formatMatchDay } from "@/lib/cricket";

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

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 44, pageWidth - 28, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("VENUE:", 18, 51);
  doc.text("DATES:", 18, 56);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(venueText, 34, 51);
  doc.text(dateText, 34, 56);

  // 3. Prepare Table Data
  const sortedMatches = matches.slice().sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

  const tableBody = sortedMatches.map((m) => {
    const isFinal = m.stage === "FINAL" || m.stage?.toUpperCase() === "FINAL";
    const matchLabel = isFinal ? `Final (Match ${m.matchNumber})` : `Match ${m.matchNumber}`;
    const dayDate = m.date || formatMatchDay(m.day, m.date);
    const time = m.time ? m.time.trim() : "TBA";
    
    const teamAName = m.teamA?.name ?? (isFinal ? "Rank 1 Team" : "Team A");
    const teamBName = m.teamB?.name ?? (isFinal ? "Rank 2 Team" : "Team B");
    const matchup = `${teamAName} vs ${teamBName}`;

    let statusText = "Upcoming";
    if (m.status === "COMPLETED") {
      statusText = m.resultText || "Completed";
    } else if (m.status === "LIVE") {
      statusText = "LIVE NOW";
    } else if (m.status === "ABANDONED" || m.status === "NO_RESULT") {
      statusText = "No Result";
    }

    return [
      matchLabel,
      isFinal ? "GRAND FINAL" : "LEAGUE",
      dayDate,
      time,
      matchup,
      m.venue || "Askari XI, Lahore",
      statusText,
    ];
  });

  // 4. Generate AutoTable
  autoTable(doc, {
    startY: 65,
    head: [["Match", "Stage", "Date / Day", "Time", "Matchup", "Venue", "Status / Result"]],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      cellPadding: 3,
    },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: "bold" },
      1: { cellWidth: 20 },
      2: { cellWidth: 26 },
      3: { cellWidth: 18 },
      4: { cellWidth: 46, fontStyle: "bold" },
      5: { cellWidth: 26 },
      6: { cellWidth: 22 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Highlight Grand Final row
      const isFinalRow = data.row.raw && String(data.row.raw[1]).includes("FINAL");
      if (isFinalRow && data.section === "body") {
        data.cell.styles.fillColor = [254, 243, 199]; // light amber gold
        data.cell.styles.textColor = [120, 53, 15]; // dark amber
        data.cell.styles.fontStyle = "bold";
      }

      // Highlight LIVE status
      if (data.column.index === 6 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val === "LIVE NOW") {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        } else if (val.includes("won by") || val === "Completed") {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Tournament Notes & Rules Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  
  if (finalY + 32 < pageHeight) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, finalY + 8, pageWidth - 28, 22, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("TOURNAMENT GUIDELINES & FORMAT:", 18, finalY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("• All league matches are 4 overs per side. Final Match is 5 overs per side (Tape Ball Cricket format).", 18, finalY + 19.5);
    doc.text("• Top 2 teams from league stage standings qualify directly for the Grand Final.", 18, finalY + 24.5);
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
