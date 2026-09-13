import React, { useState, useMemo } from "react";
import { useTeam } from "@/context/TeamContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { upsertPlayer, removePlayerFromTeam, assignPlayerToTeam } from "@/lib/mutations";
import { getAllPlayers, getTeams } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/ImageUploader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { toast } from "sonner";

import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Crown,
  Search,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Check,
  X,
} from "lucide-react";
import type { Player } from "@/lib/firestore";

type PlayerFormState = {
  id?: string;
  name: string;
  jerseyNumber: string;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
  designation: "Captain" | "Vice Captain" | "Team Member";
  battingStyle: string;
  bowlingStyle: string;
  photoUrl: string;
};

const emptyForm: PlayerFormState = {
  name: "",
  jerseyNumber: "",
  role: "Batsman",
  designation: "Team Member",
  battingStyle: "Right-hand bat",
  bowlingStyle: "Right-arm medium",
  photoUrl: "",
};

export default function TeamPlayers() {
  const { activeTeam, players, isLoadingPlayers } = useTeam();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlayerFormState>(emptyForm);
  const [playerToRemove, setPlayerToRemove] = useState<Player | null>(null);

  // Add Mode: "search" (Search System Players - default) vs "new" (Create brand new player profile)
  const [addMode, setAddMode] = useState<"search" | "new">("search");
  const [systemSearch, setSystemSearch] = useState<string>("");
  const [systemRoleFilter, setSystemRoleFilter] = useState<string>("ALL");
  const [selectedPlayerForAdd, setSelectedPlayerForAdd] = useState<Player | null>(null);
  const [assignJersey, setAssignJersey] = useState<string>("");
  const [assignDesignation, setAssignDesignation] = useState<string>("Team Member");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team_players", activeTeam?.id] });
    queryClient.invalidateQueries({ queryKey: ["players"] });
    queryClient.invalidateQueries({ queryKey: ["all_players"] });
    queryClient.invalidateQueries({ queryKey: ["teams"] });
  };

  // Query all players registered across the entire system
  const { data: allSystemPlayers = [], isLoading: isLoadingAllPlayers } = useQuery({
    queryKey: ["all_players"],
    queryFn: () => getAllPlayers(),
  });

  // Query all teams to resolve current team badges for players
  const { data: allTeams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => getTeams(),
  });

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    allTeams.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [allTeams]);

  // Filtered system players for the search directory
  const filteredSystemPlayers = useMemo(() => {
    const q = systemSearch.trim().toLowerCase();
    return allSystemPlayers.filter((p) => {
      if (systemRoleFilter !== "ALL" && p.role !== systemRoleFilter) return false;
      if (!q) return true;

      if (p.name.toLowerCase().includes(q)) return true;
      if (p.jerseyNumber && p.jerseyNumber.toString().includes(q)) return true;
      if (p.battingStyle && p.battingStyle.toLowerCase().includes(q)) return true;
      if (p.bowlingStyle && p.bowlingStyle.toLowerCase().includes(q)) return true;

      const playerTeamIds = Array.isArray(p.teamIds)
        ? p.teamIds
        : p.teamId
        ? [p.teamId]
        : [];
      const hasMatchingTeam = playerTeamIds.some((tid) =>
        (teamNameById.get(tid) || "").toLowerCase().includes(q)
      );
      if (hasMatchingTeam) return true;

      return false;
    });
  }, [allSystemPlayers, systemSearch, systemRoleFilter, teamNameById]);

  // Upsert Player Mutation (for creating new profiles or editing)
  const upsertMutation = useMutation({
    mutationFn: (data: PlayerFormState) => {
      if (!activeTeam?.id) throw new Error("No active team selected.");
      return upsertPlayer({
        id: data.id,
        teamId: activeTeam.id,
        name: data.name.trim(),
        jerseyNumber: data.jerseyNumber ? parseInt(data.jerseyNumber, 10) : undefined,
        role: data.role,
        designation: data.designation,
        isCaptain: data.designation === "Captain",
        isViceCaptain: data.designation === "Vice Captain",
        battingStyle: data.battingStyle || undefined,
        bowlingStyle: data.bowlingStyle || undefined,
        photoUrl: data.photoUrl || undefined,
      });
    },
    onSuccess: () => {
      toast.success(form.id ? "Player profile updated!" : "Player added to roster!");
      setModalOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save player."),
  });

  // Remove Player from Team Mutation (Preserves historical stats)
  const removeMutation = useMutation({
    mutationFn: (playerId: string) => removePlayerFromTeam(playerId, activeTeam?.id),
    onSuccess: () => {
      toast.success(
        `${playerToRemove?.name || "Player"} removed from ${activeTeam?.name || "team"} roster. Stats preserved.`,
      );
      setPlayerToRemove(null);
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to remove player."),
  });

  // Assign existing player from system to active team roster
  const assignMutation = useMutation({
    mutationFn: async (playerToAdd: Player) => {
      if (!activeTeam?.id) throw new Error("No active team selected.");
      await assignPlayerToTeam(playerToAdd.id, activeTeam.id, {
        jerseyNumber: assignJersey ? parseInt(assignJersey, 10) : playerToAdd.jerseyNumber ?? undefined,
        designation: assignDesignation as any,
      });
    },
    onSuccess: (_data, playerToAdd) => {
      toast.success(`${playerToAdd.name} added to ${activeTeam?.name || "team"} roster!`);
      setSelectedPlayerForAdd(null);
      setAssignJersey("");
      setAssignDesignation("Team Member");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add player."),
  });

  const filteredPlayers = players.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.jerseyNumber && p.jerseyNumber.toString().includes(search));
    const matchRole = roleFilter === "ALL" || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleEdit = (p: Player) => {
    setForm({
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber ? p.jerseyNumber.toString() : "",
      role: p.role || "Batsman",
      designation: p.designation || (p.isCaptain ? "Captain" : p.isViceCaptain ? "Vice Captain" : "Team Member"),
      battingStyle: p.battingStyle || "Right-hand bat",
      bowlingStyle: p.bowlingStyle || "Right-arm medium",
      photoUrl: p.photoUrl || "",
    });
    setAddMode("new");
    setModalOpen(true);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Players & Roster
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage permanent player profiles for <strong>{activeTeam?.name}</strong>.
          </p>
        </div>

        <Button
          onClick={() => {
            setForm(emptyForm);
            setAddMode("search");
            setSelectedPlayerForAdd(null);
            setSystemSearch("");
            setModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 h-9 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Player to Roster
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player by name or jersey..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "Batsman", "Bowler", "All-rounder", "Wicketkeeper"].map((role) => (
            <Button
              key={role}
              size="sm"
              variant={roleFilter === role ? "default" : "outline"}
              className={`text-xs h-8 rounded-lg font-bold ${
                roleFilter === role ? "bg-emerald-600 text-white" : "text-muted-foreground"
              }`}
              onClick={() => setRoleFilter(role)}
            >
              {role === "ALL" ? "All Roles" : role}
            </Button>
          ))}
        </div>
      </div>

      {/* Players Table */}
      {isLoadingPlayers ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Loading player roster...
        </div>
      ) : filteredPlayers.length > 0 ? (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12 text-center text-xs font-bold">#</TableHead>
                <TableHead className="text-xs font-bold">Player Name</TableHead>
                <TableHead className="text-xs font-bold">Role</TableHead>
                <TableHead className="text-xs font-bold">Designation</TableHead>
                <TableHead className="text-xs font-bold">Batting / Bowling</TableHead>
                <TableHead className="text-xs font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlayers.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/20">
                  <TableCell className="text-center font-mono font-bold text-xs text-muted-foreground">
                    {p.jerseyNumber ? `#${p.jerseyNumber}` : "—"}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          {p.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>


                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {p.role}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {p.isCaptain || p.designation === "Captain" ? (
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-amber-400" /> Captain
                      </span>
                    ) : p.isViceCaptain || p.designation === "Vice Captain" ? (
                      <span className="text-xs font-bold text-sky-500 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-sky-400" /> Vice Captain
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Team Member</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    <span>{p.battingStyle || "Right-hand bat"}</span>
                    {p.bowlingStyle && <span> · {p.bowlingStyle}</span>}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(p)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Edit Player"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPlayerToRemove(p)}
                        className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        title="Remove Player from Team"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="p-12 text-center space-y-3 border-dashed">
          <Users className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-base">No Players in Roster</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Add players to your team roster to participate in tournament matches.
          </p>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setAddMode("search");
              setSelectedPlayerForAdd(null);
              setSystemSearch("");
              setModalOpen(true);
            }}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Player
          </Button>
        </Card>
      )}

      {/* Add / Edit Player Dialog */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setSelectedPlayerForAdd(null);
            setSystemSearch("");
            setAssignJersey("");
            setAssignDesignation("Team Member");
          }
        }}
      >
        <DialogContent
          className={`${
            form.id || addMode === "new" ? "max-w-md" : "max-w-2xl"
          } p-6 bg-card border-emerald-500/40 max-h-[90vh] flex flex-col`}
        >
          <DialogHeader className="space-y-1 pb-2 shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {form.id ? (
                <>
                  <Pencil className="h-5 w-5 text-emerald-500" />
                  Edit Player Profile
                </>
              ) : addMode === "search" ? (
                <>
                  <Search className="h-5 w-5 text-emerald-500" />
                  Add Registered Player to Roster
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-emerald-500" />
                  Create New Player Profile
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {form.id
                ? `Update player details and statistics for ${activeTeam?.name}.`
                : addMode === "search"
                ? `Search and add existing players across PitchPe to ${activeTeam?.name}. Profiles and stats are shared without duplicate entries.`
                : `Register a brand new player profile if they are not yet in the system.`}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher when adding a player */}
          {!form.id && (
            <div className="flex rounded-xl bg-muted/70 p-1 gap-1 text-xs mb-2 border border-border/50 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAddMode("search");
                  setSelectedPlayerForAdd(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  addMode === "search"
                    ? "bg-card text-emerald-500 shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                Search System Players ({allSystemPlayers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode("new");
                  setSelectedPlayerForAdd(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  addMode === "new"
                    ? "bg-card text-emerald-500 shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Profile
              </button>
            </div>
          )}

          {addMode === "search" && !form.id ? (
            <div className="flex flex-col flex-1 min-h-0 space-y-3 overflow-hidden">
              {/* Search input & role filters */}
              <div className="space-y-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={systemSearch}
                    onChange={(e) => setSystemSearch(e.target.value)}
                    placeholder="Search player by name, current team, role, or style..."
                    className="pl-9 pr-8 h-9 text-xs rounded-xl"
                    autoFocus
                  />
                  {systemSearch && (
                    <button
                      type="button"
                      onClick={() => setSystemSearch("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Role Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {["ALL", "Batsman", "Bowler", "All-rounder", "Wicketkeeper"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSystemRoleFilter(role)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                        systemRoleFilter === role
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Directory List */}
              <div className="flex-1 overflow-y-auto max-h-[300px] divide-y divide-border/60 border rounded-xl bg-card/50 p-1">
                {filteredSystemPlayers.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">
                      No players match your search.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAddMode("new")}
                      className="text-xs font-bold gap-1 mt-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Create new profile for this player
                    </Button>
                  </div>
                ) : (
                  filteredSystemPlayers.map((p) => {
                    const isAlreadyInActiveTeam =
                      p.teamId === activeTeam?.id ||
                      (Array.isArray(p.teamIds) && p.teamIds.includes(activeTeam?.id || "")) ||
                      players.some((tp) => tp.id === p.id);

                    const playerTeamIds = Array.isArray(p.teamIds)
                      ? p.teamIds
                      : p.teamId
                      ? [p.teamId]
                      : [];

                    const teamBadges = playerTeamIds
                      .map((tid) => teamNameById.get(tid))
                      .filter(Boolean);

                    const isSelected = selectedPlayerForAdd?.id === p.id;

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                          isSelected
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-foreground truncate">
                                {p.name}
                              </span>
                              <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold">
                                {p.role}
                              </Badge>
                              {p.jerseyNumber && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  #{p.jerseyNumber}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {teamBadges.length > 0 ? (
                                teamBadges.map((tName) => (
                                  <Badge
                                    key={tName}
                                    variant="secondary"
                                    className="text-[9px] py-0 px-1.5 bg-muted text-muted-foreground font-medium"
                                  >
                                    {tName}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-muted-foreground/80 italic">
                                  Free Agent
                                </span>
                              )}
                              {p.battingStyle && (
                                <span className="text-[10px] text-muted-foreground/70">
                                  · {p.battingStyle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isAlreadyInActiveTeam ? (
                            <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 border border-emerald-500/30 text-[10px] gap-1 px-2 py-1 font-bold">
                              <Check className="h-3 w-3" /> In Roster
                            </Badge>
                          ) : isSelected ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedPlayerForAdd(null)}
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setSelectedPlayerForAdd(p);
                                setAssignJersey(p.jerseyNumber ? String(p.jerseyNumber) : "");
                                setAssignDesignation(p.designation || "Team Member");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-7 px-2.5 rounded-lg gap-1 shadow-sm"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Active Player Configuration Drawer when a player is selected */}
              {selectedPlayerForAdd && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 space-y-2.5 shrink-0 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar
                        name={selectedPlayerForAdd.name}
                        photoUrl={selectedPlayerForAdd.photoUrl}
                        size="xs"
                      />
                      <span className="text-xs font-bold text-foreground">
                        Add <strong>{selectedPlayerForAdd.name}</strong> to {activeTeam?.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerForAdd(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">Jersey # in {activeTeam?.name}</Label>
                      <Input
                        type="number"
                        value={assignJersey}
                        onChange={(e) => setAssignJersey(e.target.value)}
                        placeholder="e.g. 10"
                        className="h-8 text-xs font-mono font-bold rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">Squad Designation</Label>
                      <Select
                        value={assignDesignation}
                        onValueChange={setAssignDesignation as any}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-lg font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Team Member" className="text-xs">
                            Team Member
                          </SelectItem>
                          <SelectItem value="Captain" className="text-xs font-bold text-amber-500">
                            👑 Captain
                          </SelectItem>
                          <SelectItem value="Vice Captain" className="text-xs font-bold text-sky-500">
                            🛡️ Vice Captain
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPlayerForAdd(null)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={assignMutation.isPending}
                      onClick={() => assignMutation.mutate(selectedPlayerForAdd)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-7 px-3 rounded-lg shadow-sm"
                    >
                      {assignMutation.isPending ? "Adding..." : "Confirm & Add to Team"}
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2 border-t flex items-center justify-between shrink-0">
                <span className="text-[11px] text-muted-foreground">
                  Can't find a player? Switch to <strong>Create New Profile</strong>.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.name.trim()) {
                  toast.error("Player name is required.");
                  return;
                }
                upsertMutation.mutate(form);
              }}
              className="space-y-4 pt-1"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Player Full Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Babar Azam"
                  className="h-10 text-xs rounded-xl"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Jersey Number</Label>
                  <Input
                    type="number"
                    value={form.jerseyNumber}
                    onChange={(e) => setForm({ ...form, jerseyNumber: e.target.value })}
                    placeholder="e.g. 56"
                    className="h-10 text-xs rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Playing Role *</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as any })}
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Batsman" className="text-xs font-bold">Batsman</SelectItem>
                      <SelectItem value="Bowler" className="text-xs font-bold">Bowler</SelectItem>
                      <SelectItem value="All-rounder" className="text-xs font-bold">All-rounder</SelectItem>
                      <SelectItem value="Wicketkeeper" className="text-xs font-bold">Wicketkeeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Team Designation</Label>
                <Select
                  value={form.designation}
                  onValueChange={(v) => setForm({ ...form, designation: v as any })}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Team Member" className="text-xs">Team Member</SelectItem>
                    <SelectItem value="Captain" className="text-xs font-bold text-amber-500">👑 Captain</SelectItem>
                    <SelectItem value="Vice Captain" className="text-xs font-bold text-sky-500">🛡️ Vice Captain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Batting Style</Label>
                  <Select
                    value={form.battingStyle}
                    onValueChange={(v) => setForm({ ...form, battingStyle: v })}
                  >
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Right-hand bat" className="text-xs">Right-hand bat</SelectItem>
                      <SelectItem value="Left-hand bat" className="text-xs">Left-hand bat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Bowling Style</Label>
                  <Input
                    value={form.bowlingStyle}
                    onChange={(e) => setForm({ ...form, bowlingStyle: e.target.value })}
                    placeholder="e.g. Right-arm fast"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <ImageUploader
                value={form.photoUrl}
                onChange={(url) => {
                  setForm((prev) => ({ ...prev, photoUrl: url }));
                  if (form.id && activeTeam?.id) {
                    upsertPlayer({
                      id: form.id,
                      teamId: activeTeam.id,
                      name: form.name,
                      photoUrl: url,
                      role: form.role,
                      designation: form.designation,
                      jerseyNumber: form.jerseyNumber ? parseInt(form.jerseyNumber, 10) : undefined,
                    })
                      .then(() => invalidate())
                      .catch((err) => console.warn("Auto-save photo error:", err));
                  }
                }}
                folder="players"
                label="Player Photo (Optional)"
                placeholderText="Upload photo or enter URL"
              />



              <DialogFooter className="pt-4 border-t gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={upsertMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  {upsertMutation.isPending ? "Saving..." : "Save Player"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Player from Team Confirmation Dialog */}
      <AlertDialog
        open={!!playerToRemove}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) {
            setPlayerToRemove(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-500">
              <ShieldAlert className="h-5 w-5" />
              Remove Player from Team?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-xs text-left">
              <p className="text-foreground">
                Are you sure you want to remove{" "}
                <span className="font-bold text-foreground">{playerToRemove?.name}</span> from{" "}
                <span className="font-bold text-foreground">{activeTeam?.name}</span>'s active roster?
              </p>
              <div className="rounded-xl bg-muted/60 p-3.5 text-xs space-y-1.5 border border-border">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 shrink-0" />
                  Past Stats & Scores are Preserved
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Removing this player only removes them from this team's active squad for future matches. Their profile, batting/bowling statistics, and scorecard history with this team will <strong>not</strong> be deleted from the database.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
            <AlertDialogCancel disabled={removeMutation.isPending} className="text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (playerToRemove) {
                  removeMutation.mutate(playerToRemove.id);
                }
              }}
              disabled={removeMutation.isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              {removeMutation.isPending ? "Removing..." : "Remove from Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
