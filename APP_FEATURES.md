# Cricket Management & Live Scoring Platform — Master Feature Matrix
## Comprehensive Platform Architecture & Capabilities Guide

The **WasaCricket Platform** is a full-stack, real-time, multi-tenant Cricket Tournament Management & Live Scoring ecosystem. It serves three distinct user personas: **General Public & Fans**, **Tournament Organizers**, and **Ground Scorers**.

---

## 👥 1. Three-Persona Onboarding & Navigation UX

```
                               ┌────────────────────────────────┐
                               │     WasaCricket Platform       │
                               └────────────────┬───────────────┘
                     ┌──────────────────────────┼──────────────────────────┐
                     ▼                          ▼                          ▼
           [ 1. General Public ]     [ 2. Tournament Organizer ]   [ 3. Ground Scorer ]
           • Zero login required     • 2-minute setup wizard       • 4-digit Match PIN access
           • Live scores & tickers   • Custom rules & formats      • Dedicated Scorer Dashboard
           • Public tournament hubs  • Auto-fixture generator      • Rapid ball-by-ball console
           • Universal player search • Multi-tournament switcher   • Instant Undo/Redo
```

### A. General Public & Fan Experience
- **Zero Login Required**: Fans and players can view all live matches, tournament standings, complete ball-by-ball scorecards, player career statistics, and rulebooks without creating an account.
- **Top-Level Public Navigation**:
  - **Home (`/`)**: Dynamic sports landing page with live match pulse badges, hero stats, and featured tournaments.
  - **Live Scores (`/live-scores`)**: Auto-refreshing feed of all active, upcoming, and completed matches across tournaments with filter tabs (*All, Live, Upcoming, Completed*).
  - **Tournaments Catalog (`/tournaments`)**: Search and filter public tournaments by format (*Tape-Ball/Indoor, T10, T20, ODI*).
  - **About (`/about`)**: Complete platform capability overview and tournament organizer guides.
- **Public Tournament Micro-Sites (`/t/:tournamentSlug`)**: Dedicated branding, custom colors, and contextual sub-navigation (*Overview, Schedule, Teams, Points Table, Results, Statistics, Rules*).
- **Universal Player Search Modal**: Search any player across all teams by name, role, or jersey number from the header.

### B. Tournament Organizer Experience
- **Dedicated Entry**: Header button **"Create Tournament"**.
- **Organizer Onboarding (`/organizer/signup` & `/organizer/login`)**:
  - Clear messaging: *"Create and manage your own cricket tournaments."*
  - Automatically designates the creator as the Owner of the tournament.
  - Redirects immediately into the **5-Step Tournament Creation Wizard**.
- **Tournaments Hub & Workspace Switcher (`/admin/tournaments`)**:
  - Manage multiple simultaneous tournaments.
  - 1-click active tournament workspace switcher.
  - Direct links to public fan micro-portals and one-tap link sharing.
- **Role Permissions**: Tournament Owners can invite and manage additional tournament administrators and designated match scorers.

### C. Match Scorer Experience
- **Dedicated Entry**: Header button **"Scorer Login"**.
- **Scorer Portal (`/scorer/login`)**:
  - **Option 1: Quick 4-Digit Match PIN**: Ground scorers and casual match volunteers enter the tournament PIN for instant live score access without needing full admin credentials.
  - **Option 2: Scorer Account Login**: For designated registered scorers.
- **Scorer Dashboard (`/scorer/dashboard`)**:
  - Ground-focused workspace categorized into **Live Matches**, **Upcoming Matches** (ready for Toss & Lineups), and **Completed Matches**.
  - 1-click launch into the live ball-by-ball scoring console.

---

## 🏢 2. Multi-Tenant Architecture & Custom Branding

- **Tenant Data Isolation**: Teams, players, matches, innings deliveries, standings, and tournament rules are scoped per `tournamentId`.
- **Flagship Showcase Tournament**: The WASA Premier League (`tournamentId = 'main'`) is preserved as the default flagship showcase tournament.
- **Custom Brand Theming**:
  - Dynamic primary and accent color pickers.
  - Custom tournament logo and banner URLs.
  - Unique public URL slug for every event (e.g. `wasacricket.vercel.app/t/lahore-corporate-cup-2026`).

---

## ⚡ 3. 5-Step Interactive Tournament Wizard (`/admin/tournaments/new`)

```
[1. Identity & Branding] ➔ [2. Format & Rules] ➔ [3. Playoff Structure] ➔ [4. Teams & Rosters] ➔ [5. Fixtures Auto-Gen]
```

### Step 1: Identity & Custom Branding
- Tournament Name, Short Code (3–4 letters), URL Slug, Venue Name, and Google Maps venue link.
- Organizer notes/description.
- Primary and Accent theme colors.
- 4-Digit Scorer PIN configuration.

### Step 2: Format Presets & Match Rules Engine
- **Pre-Configured Format Presets**:
  - **Tape-Ball / Indoor Cricket**: 4–8 Overs, 1 over/bowler limit, 6 players per team, Last-Man-Standing option, Box Cricket rules.
  - **T10 League**: 10 Overs, 2 overs/bowler, 11 players per team.
  - **T20 Standard**: 20 Overs, 4 overs/bowler, ICC T20 rules.
  - **ODI Standard**: 50 Overs, 10 overs/bowler, 11 players per team.
  - **Custom Engine**: Configure overs (1–50), bowler over quotas (1–10), squad sizes (2–11), and max dismissals.
- **Granular Match Parameters**:
  - Last-Man-Standing (LMS) toggle.
  - Free hit on no-ball toggle.
  - Penalty runs for wides and no-balls (+1 run or custom).

### Step 3: Playoff & Knockout Structures
- 🥇 **Direct Top 2 Final**: Top 2 teams from league play advance straight to the Grand Final.
- ⚔️ **Top 3 Page Playoff**: Rank 1 qualifies for Final. Rank 2 vs Rank 3 play a Playoff Match for the 2nd finalist spot.
- 🏆 **IPL-Style Top 4**: Qualifier 1 (1 vs 2), Eliminator (3 vs 4), Qualifier 2, and Grand Final.
- 🎯 **Top 4 Semi-Finals**: Semi 1 (1 vs 4), Semi 2 (2 vs 3), and Grand Final.

### Step 4: Participating Teams & Squad Builder
- Quick Add teams with custom colors and short codes.
- Automatic division into Group A and Group B for multi-group tournaments.

### Step 5: Automated Schedule & Fixture Generator
- Polygon round-robin pairing algorithm (single or double round-robin).
- Configurable start date, daily start times, match durations, and matches per day.
- Automatic time-slot and rest-day calculation.
- Instant 1-click publish of the full tournament fixture schedule.

---

## 🏏 4. Live Match Center & Scoring Engine

### On-Field Live Scoring Console (`/admin/matches/:id`)
- **Toss & Lineup Selection**: Record toss winner, toss decision (Batting/Bowling), and starting lineups.
- **Ball-by-Ball Live Scoring Grid**:
  - Quick run buttons (`0`, `1`, `2`, `3`, `4`, `6`).
  - Extras tracking: Wides (`+1 Wd`), No-Balls (`+1 Nb`), Byes (`B`), Leg Byes (`LB`), Penalty runs.
  - Free hit tracking with visual banner indicators.
  - Dismissal types: Bowled, Caught, Run Out (striker/non-striker selection), Stumped, LBW, Hit Wicket.
- **Instant Strike Rotation & Bowler Quota Enforcement**:
  - Automatic striker rotation on odd singles and end of overs.
  - Bowler quota tracking (prevents exceeding maximum overs per bowler).
- **Undo / Redo Engine**:
  - Instant one-click **Undo Ball** with automatic rollback of runs, wickets, bowler stats, and batsman scores.
- **Match Finalization & POTM**:
  - Automated winner determination, margin calculation (e.g. *"Won by 14 runs"* or *"Won by 4 wickets"*).
  - Player of the Match (POTM) nomination.

### Public Live Broadcast Experience (`/live/:id`)
- **Real-Time Scoreboard**: Team scores, wickets, overs, current run rate (CRR), required run rate (RRR), runs needed, and balls remaining.
- **At the Crease (Live Batsmen)**: Active striker indicator (`*`), non-striker, runs, balls, 4s, 6s, and strike rate.
- **Current Bowling**: Live bowler card with exact spell figures (`W-R`), overs, and economy rate.
- **Over-by-Over Delivery Badges**: Colored visual ball chips (`0`, `1`, `2`, `4`, `6`, `W`, `Wd`, `Nb`).
- **Interactive Manhattan Over Graphs**: Comparative bar charts comparing Innings 1 vs. Innings 2 run progression and wicket fall.
- **Batting Partnerships**: Visual progress bars showing run and ball contributions for each wicket partnership.
- **Fall of Wickets (FOW)**: Score and over of dismissal for every wicket.
- **Milestone Animations**: Dynamic on-screen overlays for **4s**, **6s**, **Wickets**, **50s**, **100s**, and **Match Victories**.

---

## 📐 5. Mathematical Scenario & Net Run Rate (NRR) Engine

- **Automated Standings Computation**: Matches Played (`P`), Won (`W`), Lost (`L`), Tied/No Result (`NR`), Points (`Pts`), and Net Run Rate (`NRR`) computed to 3 decimal places.
- **16-Scenario Mathematical Qualification Matrix**:
  - Evaluates all remaining permutations across upcoming fixtures.
  - Categorizes teams into:
    - 🟢 **Top 3 Qualified** / **Top 2 Qualified**
    - 🔵 **Grand Final Contender**
    - 🟣 **Playoff Contender**
    - 🔴 **Mathematically Eliminated**

---

## 📲 6. WhatsApp Sharing & Matchday QR Growth Suite

- **1-Click WhatsApp Direct Share**:
  - Pre-formatted rich WhatsApp message generator with tournament name, live score links, and schedule.
  - Integrated into tournament headers, hero banners, and match scorecards.
- **High-Res Printable Matchday QR Poster (PNG)**:
  - Generates a branded printable flyer with tournament name, venue, high-contrast QR code, and tagline (*"Scan to Follow Live Scores & Standings"*).
  - Designed for clubhouse notice boards, pavilion stalls, and ground banners.
- **Viral Referral Hook**:
  - Embedded *"Host Your Own Tournament Free"* badge inside share dialogs directing new organizers to the setup wizard.

---

## 👤 7. Universal Player Profiles & Statistics

- **Universal Click-to-Profile**: Every player name anywhere in the app is clickable.
- **Career & Tournament Batting**: Total runs, balls faced, high score, batting average, strike rate, 4s, 6s, 30+ scores, 50+ scores, ducks.
- **Career & Tournament Bowling**: Overs, maidens, runs conceded, wickets, best bowling figures (`W/R`), economy rate, bowling average, 3-wicket hauls.
- **Match-by-Match Log**: Historical breakdown of every tournament fixture played, opponent name, date, player's individual score/figures, and POTM badges.

---

## 🎨 8. Media & Certificate Export Suite

- **Instagram Story (9:16) & Square (1:1) Cards**:
  - Auto-generated graphics for Final Match Results, POTM Tributes, and Big Moments (Maximum 6, Timber Wicket, Smashing 50).
- **Printable Tournament Rulebook PDF**: Clean PDF export of all tournament rules, bowler limits, and scoring guidelines.
- **Printable Match Schedule PDF**: Formatted schedule sheet with date, time, teams, and venue details.
- **Champion & Runner-Up Certificates**: Printable certificates for winning teams and tournament MVPs.
- **Confetti Celebration**: Dynamic canvas confetti animation upon tournament completion.

---

## 🔐 9. Scalable Multi-Tenant RBAC: `User -> Tournament Membership -> Role`

The platform uses a **Tournament-Scoped Role-Based Access Control (RBAC)** architecture instead of rigid global roles:

```
                            ┌────────────────────────┐
                            │      User Account      │
                            │   (Firebase Auth ID)   │
                            └───────────┬────────────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
       [ Tournament A ]          [ Tournament B ]       [ Tournament C ]
       Role: OWNER               Role: ADMIN            Role: SCORER
       • Full Control            • Manage Teams         • Live Match Console
       • Delete Event            • Manage Schedule      • Toss & Playing XI
       • Manage Admins           • Record Scores        • Ball-by-ball Entry
```

### Role Matrix by Tournament Scope:

| Permission / Capability | `OWNER` | `ADMIN` | `SCORER` | `PUBLIC` |
| :--- | :---: | :---: | :---: | :---: |
| **View Live Scores, Scorecards & Standings** | ✅ | ✅ | ✅ | ✅ |
| **Universal Player Search & Statistics** | ✅ | ✅ | ✅ | ✅ |
| **Share on WhatsApp & Download QR Posters** | ✅ | ✅ | ✅ | ✅ |
| **Export PDFs, Story Cards & Certificates** | ✅ | ✅ | ✅ | ✅ |
| **Input Ball-by-Ball Live Scoring Console** | ✅ | ✅ | ✅ | ❌ |
| **Record Toss, Set Starting Lineup & PotM** | ✅ | ✅ | ✅ | ❌ |
| **Undo / Redo Delivery Errors** | ✅ | ✅ | ✅ | ❌ |
| **Create & Edit Teams, Players, Rosters** | ✅ | ✅ | ❌ | ❌ |
| **Generate & Reschedule Match Fixtures** | ✅ | ✅ | ❌ | ❌ |
| **Assign / Invite Tournament Scorers** | ✅ | ✅ | ❌ | ❌ |
| **Invite Additional Tournament Admins** | ✅ | ❌ | ❌ | ❌ |
| **Configure Overs, Rules & Branding / Colors** | ✅ | ❌ | ❌ | ❌ |
| **Delete / Archive Tournament** | ✅ | ❌ | ❌ | ❌ |

---

## 🛠️ 10. Technology Stack & Performance

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Radix UI, Lucide Icons, Recharts.
- **Backend & Database**: Firebase Firestore with sub-second real-time snapshot listeners.
- **QR Engine**: `qrcode` canvas rendering.
- **Automated Testing**: `vitest` unit test suite (47 tests passing).

