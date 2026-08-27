import { Routes, Route, Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TournamentProvider } from "@/context/TournamentContext";
import { PlayerModalProvider } from "@/context/PlayerModalContext";
import AuthLayout from "@/components/AuthLayout";
import { PublicLayout } from "@/components/PublicLayout";

// Public Pages
import LandingHome from "./pages/public/LandingHome";
import PublicLiveScores from "./pages/public/PublicLiveScores";
import PublicTournamentsList from "./pages/public/PublicTournamentsList";
import AboutPage from "./pages/public/AboutPage";
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import PointsTable from "./pages/PointsTable";
import Results from "./pages/Results";
import Statistics from "./pages/Statistics";
import LiveMatch from "./pages/LiveMatch";
import TournamentRules from "./pages/TournamentRules";
import NotFound from "./pages/NotFound";

// Auth & Role Portals
import Login from "./pages/Login";
import OrganizerAuth from "./pages/auth/OrganizerAuth";
import ScorerAuth from "./pages/auth/ScorerAuth";
import ScorerPinEntry from "./pages/ScorerPinEntry";
import ScorerDashboard from "./pages/scorer/ScorerDashboard";
import TeamManagerAuth from "./pages/auth/TeamManagerAuth";

// Team Manager Pages & Layout
import TeamLayout from "./components/TeamLayout";
import TeamDashboard from "./pages/team/TeamDashboard";
import TeamPlayers from "./pages/team/TeamPlayers";
import TeamTournaments from "./pages/team/TeamTournaments";
import TeamRequests from "./pages/team/TeamRequests";

// Organizer / Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTeams from "./pages/admin/Teams";
import AdminPlayers from "./pages/admin/Players";
import AdminSchedule from "./pages/admin/Schedule";
import AdminMatches from "./pages/admin/Matches";
import AdminMatchControl from "./pages/admin/MatchControl";
import AdminPointsTable from "./pages/admin/PointsTable";
import AdminRules from "./pages/admin/Rules";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";
import TournamentsList from "./pages/admin/TournamentsList";
import TournamentWizard from "./pages/admin/TournamentWizard";
import BroadcastOverlay from "./pages/broadcast/BroadcastOverlay";

export default function App() {
  return (
    <ErrorBoundary>
      <TournamentProvider>
        <PlayerModalProvider>
          <Routes>
            {/* Dedicated Transparent OBS Live Broadcast Overlay */}
            <Route path="/broadcast/:id" element={<BroadcastOverlay />} />

            {/* Scorer Auth & Quick PIN */}
            <Route path="/scorer/login" element={<ScorerAuth />} />
            <Route path="/scorer/:id" element={<ScorerPinEntry />} />
            <Route path="/scorer/dashboard" element={<ScorerDashboard />} />

            {/* Organizer Auth */}
            <Route path="/organizer/login" element={<OrganizerAuth />} />
            <Route path="/organizer/signup" element={<OrganizerAuth />} />

            {/* Team Manager Auth & Workspace */}
            <Route path="/team/login" element={<TeamManagerAuth />} />
            <Route path="/team/signup" element={<TeamManagerAuth />} />
            <Route
              path="/team"
              element={<TeamLayout />}
            >
              <Route index element={<TeamDashboard />} />
              <Route path="dashboard" element={<TeamDashboard />} />
              <Route path="players" element={<TeamPlayers />} />
              <Route path="tournaments" element={<TeamTournaments />} />
              <Route path="requests" element={<TeamRequests />} />
            </Route>

            {/* Public tenant micro-portal (/t/:slug/...) */}
            <Route path="/t/:slug" element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="teams" element={<Teams />} />
              <Route path="teams/:id" element={<TeamDetail />} />
              <Route path="points-table" element={<PointsTable />} />
              <Route path="results" element={<Results />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="rules" element={<TournamentRules />} />
              <Route path="matches/:id" element={<LiveMatch />} />
              <Route path="live/:id" element={<LiveMatch />} />
            </Route>

            {/* Main Public Sports Experience (Zero login required) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingHome />} />
              <Route path="/live-scores" element={<PublicLiveScores />} />
              <Route path="/tournaments" element={<PublicTournamentsList />} />
              <Route path="/about" element={<AboutPage />} />

              {/* Direct access to flagship WASA subpages */}
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
              <Route path="/points-table" element={<PointsTable />} />
              <Route path="/results" element={<Results />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/rules" element={<TournamentRules />} />
              <Route path="/matches/:id" element={<LiveMatch />} />
              <Route path="/live/:id" element={<LiveMatch />} />
            </Route>

            {/* Organizer / Admin Workspace (Auth required) */}
            <Route
              path="/admin"
              element={
                <AuthLayout>
                  <Outlet />
                </AuthLayout>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="tournaments" element={<TournamentsList />} />
              <Route path="tournaments/new" element={<TournamentWizard />} />
              <Route path="teams" element={<AdminTeams />} />
              <Route path="players" element={<AdminPlayers />} />
              <Route path="schedule" element={<AdminSchedule />} />
              <Route path="matches" element={<AdminMatches />} />
              <Route path="matches/:id" element={<AdminMatchControl />} />
              <Route path="points-table" element={<AdminPointsTable />} />
              <Route path="rules" element={<AdminRules />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </PlayerModalProvider>
      </TournamentProvider>
    </ErrorBoundary>
  );
}
