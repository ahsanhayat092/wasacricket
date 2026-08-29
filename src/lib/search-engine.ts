/**
 * Universal & Tournament-Scoped Full-Text and Fuzzy Search Engine for PitchPe.
 * Provides instant (<5ms) tokenized, substring, and Levenshtein fuzzy search across
 * Players, Teams, Matches, and Tournaments.
 */

export interface SearchablePlayer {
  id: string;
  name: string;
  role: string;
  jerseyNumber?: number | null;
  tournamentId?: string;
  tournamentName?: string;
  teamId?: string;
  teamName?: string;
  isCaptain?: boolean;
}

export interface SearchableTeam {
  id: string;
  name: string;
  shortName: string;
  tournamentId?: string;
  tournamentName?: string;
  captainName?: string;
}

export interface SearchableMatch {
  id: string;
  matchNumber: number;
  stage: string;
  status: string;
  teamAName: string;
  teamBName: string;
  venue?: string;
  date?: string;
  tournamentId?: string;
  tournamentName?: string;
}

export interface SearchResultItem {
  id: string;
  type: "player" | "team" | "match" | "tournament";
  title: string;
  subtitle: string;
  badgeText?: string;
  url: string;
  score: number;
  tournamentId?: string;
}

/** Compute Levenshtein distance between two strings */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion / deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/** Tokenize a string into lower-cased searchable word tokens and ngrams */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  return Array.from(new Set(words));
}

/** Score a candidate text against search query tokens */
export function calculateMatchScore(candidate: string, query: string): number {
  const normCandidate = candidate.toLowerCase().trim();
  const normQuery = query.toLowerCase().trim();

  if (!normCandidate || !normQuery) return 0;

  // Exact match
  if (normCandidate === normQuery) return 100;

  // Starts with exact query
  if (normCandidate.startsWith(normQuery)) return 85;

  // Contains exact query as a phrase
  if (normCandidate.includes(normQuery)) return 70;

  const queryTokens = tokenize(normQuery);
  const candidateTokens = tokenize(normCandidate);

  let tokenMatchScore = 0;

  for (const qToken of queryTokens) {
    let bestTokenScore = 0;
    for (const cToken of candidateTokens) {
      if (cToken === qToken) {
        bestTokenScore = Math.max(bestTokenScore, 50);
      } else if (cToken.startsWith(qToken)) {
        bestTokenScore = Math.max(bestTokenScore, 40);
      } else if (cToken.includes(qToken)) {
        bestTokenScore = Math.max(bestTokenScore, 30);
      } else if (qToken.length >= 3) {
        const distance = levenshteinDistance(qToken, cToken);
        if (distance <= 1) {
          bestTokenScore = Math.max(bestTokenScore, 25);
        } else if (distance <= 2 && qToken.length >= 5) {
          bestTokenScore = Math.max(bestTokenScore, 15);
        }
      }
    }
    tokenMatchScore += bestTokenScore;
  }

  return tokenMatchScore;
}

/**
 * Universal Search Engine Class
 */
export class WasaSearchEngine {
  private players: SearchablePlayer[] = [];
  private teams: SearchableTeam[] = [];
  private matches: SearchableMatch[] = [];
  private tournaments: Array<{ id: string; name: string; slug: string; venue?: string }> = [];

  public indexData(data: {
    players?: SearchablePlayer[];
    teams?: SearchableTeam[];
    matches?: SearchableMatch[];
    tournaments?: Array<{ id: string; name: string; slug: string; venue?: string }>;
  }) {
    if (data.players) this.players = data.players;
    if (data.teams) this.teams = data.teams;
    if (data.matches) this.matches = data.matches;
    if (data.tournaments) this.tournaments = data.tournaments;
  }

  /**
   * Search across all entities with optional tournament scoping.
   */
  public search(
    query: string,
    options?: {
      tournamentId?: string;
      limit?: number;
      types?: Array<"player" | "team" | "match" | "tournament">;
    }
  ): SearchResultItem[] {
    const q = query.trim();
    if (!q) return [];

    const limit = options?.limit ?? 15;
    const filterTypes = options?.types ?? ["player", "team", "match", "tournament"];
    const targetTournamentId = options?.tournamentId;

    const results: SearchResultItem[] = [];

    // 1. Search Players
    if (filterTypes.includes("player")) {
      for (const p of this.players) {
        if (targetTournamentId && p.tournamentId && p.tournamentId !== targetTournamentId) {
          continue;
        }

        const nameScore = calculateMatchScore(p.name, q);
        const roleScore = calculateMatchScore(p.role, q) * 0.4;
        const teamScore = p.teamName ? calculateMatchScore(p.teamName, q) * 0.5 : 0;
        const jerseyMatch = p.jerseyNumber && q.replace("#", "") === p.jerseyNumber.toString() ? 60 : 0;

        const maxScore = Math.max(nameScore, roleScore, teamScore, jerseyMatch);
        if (maxScore > 10) {
          results.push({
            id: p.id,
            type: "player",
            title: p.name,
            subtitle: `${p.role}${p.teamName ? ` · ${p.teamName}` : ""}${p.jerseyNumber ? ` (#${p.jerseyNumber})` : ""}`,
            badgeText: p.role,
            url: p.tournamentId ? `/t/${p.tournamentId}/statistics` : `/statistics`,
            score: maxScore,
            tournamentId: p.tournamentId,
          });
        }
      }
    }

    // 2. Search Teams
    if (filterTypes.includes("team")) {
      for (const t of this.teams) {
        if (targetTournamentId && t.tournamentId && t.tournamentId !== targetTournamentId) {
          continue;
        }

        const nameScore = calculateMatchScore(t.name, q);
        const shortScore = calculateMatchScore(t.shortName, q);
        const maxScore = Math.max(nameScore, shortScore);

        if (maxScore > 10) {
          results.push({
            id: t.id,
            type: "team",
            title: t.name,
            subtitle: `${t.shortName}${t.tournamentName ? ` · ${t.tournamentName}` : ""}`,
            badgeText: t.shortName,
            url: t.tournamentId ? `/t/${t.tournamentId}/teams/${t.id}` : `/teams/${t.id}`,
            score: maxScore,
            tournamentId: t.tournamentId,
          });
        }
      }
    }

    // 3. Search Matches
    if (filterTypes.includes("match")) {
      for (const m of this.matches) {
        if (targetTournamentId && m.tournamentId && m.tournamentId !== targetTournamentId) {
          continue;
        }

        const matchTitle = `${m.teamAName} vs ${m.teamBName}`;
        const titleScore = calculateMatchScore(matchTitle, q);
        const venueScore = m.venue ? calculateMatchScore(m.venue, q) * 0.5 : 0;
        const numberScore = q === m.matchNumber.toString() || q.toLowerCase() === `match ${m.matchNumber}` ? 60 : 0;

        const maxScore = Math.max(titleScore, venueScore, numberScore);
        if (maxScore > 10) {
          results.push({
            id: m.id,
            type: "match",
            title: matchTitle,
            subtitle: `Match #${m.matchNumber} · ${m.stage} · ${m.date || "Scheduled"} (${m.status})`,
            badgeText: m.status,
            url: `/matches/${m.id}`,
            score: maxScore,
            tournamentId: m.tournamentId,
          });
        }
      }
    }

    // 4. Search Tournaments
    if (filterTypes.includes("tournament")) {
      for (const t of this.tournaments) {
        const nameScore = calculateMatchScore(t.name, q);
        const venueScore = t.venue ? calculateMatchScore(t.venue, q) * 0.5 : 0;
        const maxScore = Math.max(nameScore, venueScore);

        if (maxScore > 10) {
          results.push({
            id: t.id,
            type: "tournament",
            title: t.name,
            subtitle: `Public Tournament · ${t.venue || "Askari XI, Lahore"}`,
            badgeText: "TOURNAMENT",
            url: `/t/${t.slug || t.id}`,
            score: maxScore,
            tournamentId: t.id,
          });
        }
      }
    }

    // Sort by highest relevance score descending
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

/** Global singleton instance */
export const globalSearchEngine = new WasaSearchEngine();
