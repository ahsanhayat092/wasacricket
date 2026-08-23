import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { TOURNAMENT_ID } from "./firestore";

export type RuleCategory =
  | "General Rules"
  | "Boundaries & Ground"
  | "Bowling & Deliveries"
  | "Last Man Standing"
  | "Fielding & Substitutions"
  | "Tie-Breaker Format";

export interface TournamentRuleItem {
  id: string;
  category: RuleCategory;
  rule: string;
  order: number;
  createdAt?: number;
  updatedAt?: number;
}

export const DEFAULT_TOURNAMENT_RULES: TournamentRuleItem[] = [
  // 1. General Rules
  {
    id: "rule-1",
    category: "General Rules",
    rule: "Umpire decision will be final in all circumstances.",
    order: 1,
  },
  {
    id: "rule-2",
    category: "General Rules",
    rule: "Benefit of doubt always goes to the batsman.",
    order: 2,
  },
  {
    id: "rule-3",
    category: "General Rules",
    rule: "ICC standard laws of cricket shall apply for all run-out scenarios.",
    order: 3,
  },

  // 2. Boundaries & Ground Rules
  {
    id: "rule-4",
    category: "Boundaries & Ground",
    rule: "Boundary is strictly the Straight Wall only.",
    order: 4,
  },
  {
    id: "rule-5",
    category: "Boundaries & Ground",
    rule: "Deflected catch off walls/roof is Not Out.",
    order: 5,
  },
  {
    id: "rule-6",
    category: "Boundaries & Ground",
    rule: "Deflected Six off roof/fixtures is counted as a Six.",
    order: 6,
  },
  {
    id: "rule-7",
    category: "Boundaries & Ground",
    rule: "Hitting into the Back Balcony is awarded 2 runs.",
    order: 7,
  },
  {
    id: "rule-8",
    category: "Boundaries & Ground",
    rule: "Ball stuck in the roof without crossing boundary = 1 Run awarded, with crossing batsmen allowed to complete runs if crossed.",
    order: 8,
  },

  // 3. Bowling & Deliveries
  {
    id: "rule-9",
    category: "Bowling & Deliveries",
    rule: "Over-limit per Bowler in group match: Strictly 1 over per bowler (4 bowlers for 4 overs).",
    order: 9,
  },
  {
    id: "rule-10",
    category: "Bowling & Deliveries",
    rule: "Over-limit per Bowler in Final match: 2, 1, 1, 1 (one bowler may bowl maximum 2 overs, remaining 3 bowlers 1 over each for 5 overs).",
    order: 10,
  },
  {
    id: "rule-11",
    category: "Bowling & Deliveries",
    rule: "All extras apply (Wides, No-Balls, Byes, Leg-Byes count as 1 penalty run).",
    order: 11,
  },
  {
    id: "rule-12",
    category: "Bowling & Deliveries",
    rule: "Full Toss above waist height of the batsman is called a No-Ball.",
    order: 12,
  },
  {
    id: "rule-13",
    category: "Bowling & Deliveries",
    rule: "Free Hit awarded after every No-Ball (Batter cannot be out except for Run Out).",
    order: 13,
  },
  {
    id: "rule-14",
    category: "Bowling & Deliveries",
    rule: "Over the head delivery is called a Wide Ball.",
    order: 14,
  },
  {
    id: "rule-15",
    category: "Bowling & Deliveries",
    rule: "One delivery per over above shoulder height is a legal delivery. The 2nd short-pitched delivery above shoulder height in the same over is called a No-Ball.",
    order: 15,
  },
  {
    id: "rule-16",
    category: "Bowling & Deliveries",
    rule: "In case of a retired hurt bowler: 5th player in group match / Reserve player in final match will complete the ongoing over.",
    order: 16,
  },

  // 4. Last Man Standing
  {
    id: "rule-17",
    category: "Last Man Standing",
    rule: "Last Man Standing format: When 5 wickets fall, the 6th batsman bats alone until dismissed. An innings is concluded as All-Out only when all 6 players are out.",
    order: 17,
  },
  {
    id: "rule-18",
    category: "Last Man Standing",
    rule: "Last Man stands with Double Run condition for running between wickets.",
    order: 18,
  },
  {
    id: "rule-19",
    category: "Last Man Standing",
    rule: "Runner is not allowed for the last standing batsman.",
    order: 19,
  },

  // 5. Fielding & Substitutions
  {
    id: "rule-20",
    category: "Fielding & Substitutions",
    rule: "A total of 6 players will take the field for each team (6-a-side).",
    order: 20,
  },
  {
    id: "rule-21",
    category: "Fielding & Substitutions",
    rule: "Fielding Restriction: Maximum 3 fielders can be placed between the boundary and bowling wicket.",
    order: 21,
  },
  {
    id: "rule-22",
    category: "Fielding & Substitutions",
    rule: "No substitution for batting is allowed under any circumstances.",
    order: 22,
  },
  {
    id: "rule-23",
    category: "Fielding & Substitutions",
    rule: "Designated reserve player can act as a substitute fielder.",
    order: 23,
  },

  // 6. Tie-Breaker Format
  {
    id: "rule-24",
    category: "Tie-Breaker Format",
    rule: "In Case of Tie in Group Match: 1 point awarded to each Team (no Super Over).",
    order: 24,
  },
  {
    id: "rule-25",
    category: "Tie-Breaker Format",
    rule: "In Case of Tie in Grand Final: Continuous Super Overs will be played until a winner is decided.",
    order: 25,
  },
];

const RULES_DOC_ID = "tournament_rules";

/** Fetch all tournament rules from Firestore (or initialize with defaults) */
export async function getTournamentRules(): Promise<TournamentRuleItem[]> {
  try {
    const rulesDocRef = doc(db, "tournaments", TOURNAMENT_ID, "settings", RULES_DOC_ID);
    const snap = await getDoc(rulesDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.rules) && data.rules.length > 0) {
        return (data.rules as TournamentRuleItem[]).sort((a, b) => a.order - b.order);
      }
    }
  } catch (err) {
    console.warn("Could not fetch rules from Firestore, using default rules:", err);
  }
  return DEFAULT_TOURNAMENT_RULES;
}

/** Save updated rules array to Firestore */
export async function saveTournamentRules(rules: TournamentRuleItem[]): Promise<void> {
  const sorted = [...rules].map((r, idx) => ({ ...r, order: idx + 1, updatedAt: Date.now() }));
  const rulesDocRef = doc(db, "tournaments", TOURNAMENT_ID, "settings", RULES_DOC_ID);
  await setDoc(rulesDocRef, {
    rules: sorted,
    updatedAt: Date.now(),
  }, { merge: true });
}

/** Reset rules to the official tournament defaults */
export async function resetTournamentRules(): Promise<TournamentRuleItem[]> {
  const rulesDocRef = doc(db, "tournaments", TOURNAMENT_ID, "settings", RULES_DOC_ID);
  await setDoc(rulesDocRef, {
    rules: DEFAULT_TOURNAMENT_RULES,
    updatedAt: Date.now(),
  });
  return DEFAULT_TOURNAMENT_RULES;
}
