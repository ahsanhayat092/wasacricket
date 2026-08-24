# WASA Premier League — Cricket Scoring & Tournament Platform
## Comprehensive Feature Documentation

The **WASA Premier League (WPL)** platform is a full-stack, real-time cricket tournament management and live-scoring ecosystem designed for WASA Lahore. It connects a **Live Android Scoring Application** used by on-field scorers with a **High-Performance Public Web Portal** for players, officials, and fans.

---

## 📱 Live Android Mobile App Scoring Integration

A dedicated **Live Android Application** is linked in real-time with the web platform:

- **Sub-Second Cloud Sync**: Scorers at the Askari XI ground input ball-by-ball actions on Android, which instantly update the web scoreboard, graphs, partnerships, and leaderboards via cloud Firestore sync.
- **On-Field Match Scorer Console**:
  - Live toss recording (Batting / Bowling election).
  - Playing VI (6) & Match Reserve (1) selection before toss.
  - Delivery recording with extras (Wides, No Balls, Byes, Leg Byes, Penalties).
  - Dismissal modes (Bowled, Caught, Run Out, Stumped, LBW, Hit Wicket).
  - Real-time striker & non-striker rotation and end-of-over bowler transitions.
  - Undo ball functionality for instant scoring correction.
  - Instant Player of the Match (POTM) nomination upon match completion.

---

## 🌟 Core Features & Modules

### 1. ⚡ Live Match Center & Real-Time Scorecard
- **Real-Time Live Scoreboard**:
  - Team scores, wickets, overs, current run rate (CRR), and required run rate (RRR) in chase scenarios.
  - Remaining runs needed and balls remaining calculations.
- **At the Crease (Live Batsmen)**:
  - Displays the active striker with `*` indicator and non-striker with runs, balls, 4s, 6s, and strike rates.
- **Current Bowling (Single Active Bowler)**:
  - Live bowler card showing exact spell figures (`W-R`), overs bowled, and current over economy.
- **Over-by-Over Live Delivery Feed**:
  - Visual ball-by-ball breakdown badge chips (`0`, `1`, `2`, `4`, `6`, `W`, `Wd`, `Nb`) separated clearly by completed overs.
- **Celebration & Milestone Animations**:
  - Dynamic on-screen overlay animations for **4s**, **6s**, **Wickets**, **50s**, **Centuries**, and **Match Victories**.
- **Interactive Manhattan Over Graphs**:
  - Side-by-side comparative bar chart comparing Innings 1 vs. Innings 2 run progression and wicket dots.
- **Dedicated Batting Partnerships Section**:
  - Separate tab with visual split progress bars showing run and ball contributions for each wicket partnership.
- **Fall of Wickets (FOW)**:
  - Summary text banner and individual wicket milestone cards with exact score and over of dismissal.
- **Squad & Playing Lineup Confirmations**:
  - Pre-match rosters and official Starting Playing VI (6) + Match Reserve (1) confirmed at toss.

---

### 2. 👤 Universal Player Profiles & Global Search
- **Universal Click-to-Profile**:
  - **Every player name anywhere in the app is interactive** — in scorecards, live crease, bowling cards, partnerships, fall of wickets, squad rosters, leaderboards, top performer cards, and search results.
- **Player Performance Modal**:
  - **Hero Header**: Player avatar, jersey number (`#`), official role (Batter, Bowler, All-Rounder, Wicket-Keeper), Captain `(C)` and Wicket-Keeper `(WK)` badges, and Player of the Match awards counter.
  - **Tournament Batting Summary**: Matches, Innings, Total Runs, Balls Faced, Highest Score (`*` for not out), Batting Average, Strike Rate, 4s, 6s, 30+ scores, 50+ scores, and Ducks.
  - **Tournament Bowling Summary**: Innings, Overs, Maidens, Runs Conceded, Total Wickets, Best Bowling Figures (`W/R`), Economy Rate, Bowling Average, Strike Rate, 3-Wicket Hauls, and Extras (Wides/No-Balls).
  - **Match-by-Match History Log**: Chronological breakdown of every tournament fixture played, opponent badge/name, date & time, player's individual batting figures, bowling figures, match result, and POTM badge.
  - **Squad Teammates Browser**: View teammates and jump directly to their performance records.
- **Global Player Search (`Search Players`)**:
  - Instant searchable modal in the navbar and mobile drawer.
  - Search by **Player Name**, **Team Name** (e.g., *Wolves*, *Lions*), **Playing Role**, or **Jersey Number**.
  - Quick filter chips: *All Roles*, *🏏 Batters*, *🎯 Bowlers*, *⚡ All-Rounders*, *🧤 Wicket-Keepers*.
  - Live tournament stats (Runs & Wickets) displayed right on search cards.

---

### 3. 📸 Shareable Story & Highlight Cards Generator
- **Auto-Generated Instagram Story Cards (9:16) & Square Posts (1:1)**:
  - **Match Result & Final Scorecard Story**: Team head-to-head showdown, team logos, match scores/wickets/overs, official match result banner, and top batter/bowler micro-cards.
  - **Player of the Match (POTM) Tribute Card**: Big spotlight player avatar with glowing MVP badge, player role, team badge, batting figures, and bowling figures.
  - **Big Moment Highlight Cards**: One-click generation for **💥 MAXIMUM 6!**, **🎯 TIMBER! WICKET!**, **🏏 SMASHING 50!**, and **🏆 VICTORY MOMENT**.
  - **Player Spotlight Story Card**: Instant social share card from any player's profile with their tournament runs, wickets, high score, and strike rate.
- **Direct Export & Sharing**:
  - **Download High-Resolution PNG**: Crisp 2.5x retina-rendered image download.
  - **One-Tap Social Share**: Uses Web Share API on mobile to share directly to Instagram Stories, WhatsApp Status, Twitter, or Facebook.
  - **Copy Image to Clipboard**: Direct one-click clipboard copy.

---

### 4. 📅 Interactive Calendar & Clock Fixture Scheduler
- **Interactive Popover Calendar Picker**:
  - Date selection using a graphical calendar with automatic day-of-the-week calculation (Monday, Tuesday, etc.).
- **Interactive Clock Time Picker**:
  - Hour grid (1–12), minute grid (`:00`, `:15`, `:30`, `:45`), AM/PM toggle, and quick-select presets (`9:00 PM`, `9:45 PM`, `10:30 PM`, `11:15 PM`, `12:00 AM`).
- **Dynamic Universal Date & Time Propagation**:
  - Selected date and time dynamically update across Match Cards, Header Badges, Match Schedule, Match Detail, Live Match screens, and Admin tables.
- **Schedule Grouping**:
  - Fixtures grouped dynamically by tournament days with time span chips and venue tags.

---

### 4. 🏆 Standings & Automatic Net Run Rate (NRR) Table
- **Group Stage Division**: Group A and Group B standings tables.
- **Automated Calculation**: Matches Played (`P`), Won (`W`), Lost (`L`), Tied/No Result (`NR`), Points (`Pts`), and Net Run Rate (`NRR`) calculated to 3 decimal places.
- **Qualification Tracking**: Highlights top-ranked teams advancing to the Grand Championship Final.

---

### 5. 📊 Tournament Statistics & Leaderboards
- **Individual Honors**:
  - 🟠 **Top Run Scorer** (Tournament Orange Cap / Golden Bat).
  - 🟣 **Top Wicket Taker** (Tournament Purple Cap / Golden Ball).
  - ⚡ **Boundary King** (Most 4s & 6s combined).
  - 🛡️ **Best Economy Rate** (Lowest runs conceded per over).
- **Comprehensive Leaderboard Tables**:
  - Full sortable batting leaderboard (Runs, Inns, Balls, Avg, SR, HS, 4s, 6s).
  - Full sortable bowling leaderboard (Wickets, Inns, Overs, Maidens, Runs, Econ, Avg, Best Figures).
- **Team-by-Team Filtering**:
  - Filter stats by specific team to view internal team top performers.
- **Tournament High-Level KPIs**:
  - Total runs scored, total wickets taken, highest team total, and match completion progress.

---

### 6. 🛡️ Teams & Squad Roster
- **6 Competing Teams**:
  - **Group A**: Ravi Raptors (RR), Shalimar Strikers (SS), Badshahi Blasters (BB)
  - **Group B**: Gulberg Gladiators (GG), Iqbal Inswingers (II), Lahore Lions (LL)
- **Team Profile Pages**:
  - Team logo, group details, points standing, tournament matches, and 7-member player rosters with playing roles, batting/bowling styles, Captain `(C)`, and Vice Captain `(VC)` indicators.
- **Dynamic Pre-Match & Live Squad Additions**:
  - Players can be added to any squad directly before the match (at Toss & Lineup confirmation) or during the match via the quick-add player modal in Match Control.
  - Direct 1-click **Add Player** shortcuts on Team and Player management consoles.

---

### 7. 🔒 Admin Portal & Scorer Management
- **Role-Based Access Control (RBAC)**:
  - **Administrators**: Full system control (tournaments, teams, players, schedule, standings overrides, user accounts, system settings).
  - **Scorers**: Direct access to match scoring console to conduct live games.
- **Match Management & Reset**:
  - Create, reschedule, edit venue, and set match status (Upcoming, Live, Completed, Abandoned).
  - Full match reset function to roll back test matches to fresh state.
  - Pre-match Playing VI (6 starters) and 1 Reserve player configuration with instant squad expansion.
- **User Account Management**:
  - Create scorer and admin accounts, assign roles, and manage credentials.

---

### 8. 🎨 Design Aesthetics & Performance
- **Modern Responsive Design**:
  - Dark Mode & Light Mode support with smooth theme toggle.
  - Tailored color palette: Emerald (`#10b981`), Amber Gold (`#f59e0b`), Sky Blue (`#0ea5e9`), and Slate Dark theme.
  - Mobile-first responsive navigation with drawer and touch gestures.
- **Optimized Performance**:
  - Fast client-side routing with optimistic caching via TanStack React Query.
  - Cloud Firestore real-time listeners for live updates without manual page refreshes.
