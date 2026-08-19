import { Routes, Route, Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AuthLayout from "@/components/AuthLayout";
import { PublicLayout } from "@/components/PublicLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Schedule from "./pages/Schedule";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import PointsTable from "./pages/PointsTable";
import Results from "./pages/Results";
import Statistics from "./pages/Statistics";
import MatchDetail from "./pages/MatchDetail";
import LiveMatch from "./pages/LiveMatch";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTeams from "./pages/admin/Teams";
import AdminPlayers from "./pages/admin/Players";
import AdminSchedule from "./pages/admin/Schedule";
import AdminMatches from "./pages/admin/Matches";
import AdminMatchControl from "./pages/admin/MatchControl";
import AdminPointsTable from "./pages/admin/PointsTable";
import AdminUsers from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/points-table" element={<PointsTable />} />
          <Route path="/results" element={<Results />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/live/:id" element={<LiveMatch />} />
        </Route>

        {/* Admin & Scorers Workspace (Auth required) */}
        <Route
          path="/admin"
          element={
            <AuthLayout>
              <Outlet />
            </AuthLayout>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="schedule" element={<AdminSchedule />} />
          <Route path="matches" element={<AdminMatches />} />
          <Route path="matches/:id" element={<AdminMatchControl />} />
          <Route path="points-table" element={<AdminPointsTable />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}
