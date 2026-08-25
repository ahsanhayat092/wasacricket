import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router";
import { getDoc, getDocs, query, where } from "firebase/firestore";
import {
  tournamentDoc,
  tournamentsCol,
  snapToDoc,
  TOURNAMENT_ID,
  type Tournament,
  type TournamentBranding,
  type TournamentFormatType,
} from "@/lib/firestore";
import { FORMAT_PRESETS, type FormatPresetConfig } from "@/lib/fixture-generator";

type TournamentContextType = {
  tournamentId: string;
  tournament: Tournament | null;
  isLoading: boolean;
  isFlagshipWasa: boolean;
  formatConfig: FormatPresetConfig;
  branding: TournamentBranding;
  activeTournamentSlug: string | null;
  setTournamentId: (id: string) => void;
};

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [overrideTournamentId, setOverrideTournamentId] = useState<string | null>(() => {
    return localStorage.getItem("wasa_active_tournament_id");
  });

  // Extract /t/:slug from URL if present
  const slugFromUrl = useMemo(() => {
    const match = location.pathname.match(/^\/t\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  // Fetch tournament by slug (if /t/:slug) or by ID
  const { data: tournamentBySlug, isLoading: isLoadingSlug } = useQuery({
    queryKey: ["tournament_by_slug", slugFromUrl],
    queryFn: async () => {
      if (!slugFromUrl) return null;
      // Search tournaments where slug == slugFromUrl
      const snap = await getDocs(query(tournamentsCol(), where("slug", "==", slugFromUrl)));
      if (!snap.empty) {
        return snapToDoc<Tournament>(snap.docs[0]);
      }
      // Also try by document ID directly
      const directSnap = await getDoc(tournamentDoc(slugFromUrl));
      if (directSnap.exists()) {
        return snapToDoc<Tournament>(directSnap);
      }
      return null;
    },
    enabled: !!slugFromUrl,
  });

  // Determine current active tournament ID
  const activeTournamentId = useMemo(() => {
    if (slugFromUrl && tournamentBySlug) {
      return tournamentBySlug.id;
    }
    if (overrideTournamentId) {
      return overrideTournamentId;
    }
    return TOURNAMENT_ID;
  }, [slugFromUrl, tournamentBySlug, overrideTournamentId]);

  // Fetch active tournament data
  const { data: activeTournamentData, isLoading: isLoadingActive } = useQuery({
    queryKey: ["tournament", activeTournamentId],
    queryFn: async () => {
      const snap = await getDoc(tournamentDoc(activeTournamentId));
      if (!snap.exists()) {
        if (activeTournamentId === TOURNAMENT_ID) {
          // Default fallback tournament object for main
          return {
            id: TOURNAMENT_ID,
            name: "WASA Premier League 2026",
            shortName: "WPL 2026",
            formatType: "TAPE_BALL_INDOOR" as TournamentFormatType,
            winPoints: 2,
            tiePoints: 1,
            noResultPoints: 1,
            lossPoints: 0,
            oversPerSide: 4,
            maxOverPerBowler: 1,
            playersPerTeam: 6,
            maxWickets: 6,
            allowLastManStanding: true,
            wideRuns: 1,
            noBallRuns: 1,
            freeHitEnabled: true,
            playoffFormat: "DIRECT_TOP2",
            venueName: "Askari XI, Lahore",
            venueMapsUrl: "https://maps.app.goo.gl/va7W9eD3MYWH2SyCA?g_st=ac",
            status: "COMPLETED",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Tournament;
        }
        return null;
      }
      return snapToDoc<Tournament>(snap);
    },
  });

  const tournament = tournamentBySlug || activeTournamentData || null;
  const isFlagshipWasa = tournament?.id === TOURNAMENT_ID || !tournament?.id;

  const formatConfig: FormatPresetConfig = useMemo(() => {
    const formatType = tournament?.formatType || "TAPE_BALL_INDOOR";
    const preset = FORMAT_PRESETS[formatType] || FORMAT_PRESETS.TAPE_BALL_INDOOR;

    return {
      ...preset,
      oversPerSide: tournament?.oversPerSide ?? preset.oversPerSide,
      maxOverPerBowler: tournament?.maxOverPerBowler ?? preset.maxOverPerBowler,
      playersPerTeam: tournament?.playersPerTeam ?? preset.playersPerTeam,
      maxWickets: tournament?.maxWickets ?? preset.maxWickets,
      allowLastManStanding: tournament?.allowLastManStanding ?? preset.allowLastManStanding,
      wideRuns: tournament?.wideRuns ?? preset.wideRuns,
      noBallRuns: tournament?.noBallRuns ?? preset.noBallRuns,
      freeHitEnabled: tournament?.freeHitEnabled ?? preset.freeHitEnabled,
      playoffFormat: tournament?.playoffFormat ?? preset.playoffFormat,
    };
  }, [tournament]);

  const branding: TournamentBranding = useMemo(() => {
    return {
      primaryColor: tournament?.branding?.primaryColor || "#10b981", // Emerald default
      accentColor: tournament?.branding?.accentColor || "#f59e0b", // Amber default
      logoUrl: tournament?.branding?.logoUrl || null,
      bannerUrl: tournament?.branding?.bannerUrl || null,
      sponsorLogos: tournament?.branding?.sponsorLogos || [],
    };
  }, [tournament]);

  // Apply dynamic branding theme colors if set
  useEffect(() => {
    if (tournament?.branding?.primaryColor) {
      document.documentElement.style.setProperty("--primary-theme", tournament.branding.primaryColor);
    }
  }, [tournament?.branding?.primaryColor]);

  const handleSetTournamentId = (id: string) => {
    setOverrideTournamentId(id);
    localStorage.setItem("wasa_active_tournament_id", id);
  };

  return (
    <TournamentContext.Provider
      value={{
        tournamentId: activeTournamentId,
        tournament,
        isLoading: isLoadingSlug || isLoadingActive,
        isFlagshipWasa,
        formatConfig,
        branding,
        activeTournamentSlug: slugFromUrl,
        setTournamentId: handleSetTournamentId,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) {
    throw new Error("useTournament must be used within a TournamentProvider");
  }
  return ctx;
}
