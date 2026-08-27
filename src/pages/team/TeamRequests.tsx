import React from "react";
import { useTeam } from "@/context/TeamContext";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { respondToTournamentInvite, withdrawTournamentRequest } from "@/lib/mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Inbox,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Send,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router";

export default function TeamRequests() {
  const { activeTeam, memberships, isLoadingMemberships } = useTeam();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["team_memberships", activeTeam?.id] });
  };

  // Respond to invitation mutation
  const respondInviteMutation = useMutation({
    mutationFn: (args: { membershipId: string; status: "ACCEPTED" | "DECLINED" }) =>
      respondToTournamentInvite({
        membershipId: args.membershipId,
        status: args.status,
      }),
    onSuccess: (data) => {
      toast.success(
        data.status === "ACCEPTED"
          ? "Invitation accepted! Your team is now a tournament participant."
          : "Tournament invitation declined.",
      );
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to respond to invitation."),
  });

  // Withdraw request mutation
  const withdrawMutation = useMutation({
    mutationFn: (membershipId: string) => withdrawTournamentRequest(membershipId),
    onSuccess: () => {
      toast.success("Participation request withdrawn.");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to withdraw request."),
  });

  // Categorize memberships
  const invitationsReceived = memberships.filter((m) => m.source === "ORGANIZER_INVITE" && m.status === "INVITED");
  const outgoingRequests = memberships.filter((m) => m.source === "TEAM_REQUEST" || (m.source === "ORGANIZER_INVITE" && m.status !== "INVITED"));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-2">
          <Inbox className="h-6 w-6 text-emerald-500" />
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Requests & Invitations
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Review tournament invitations received and outgoing team applications for <strong>{activeTeam?.name}</strong>.
        </p>
      </div>

      {/* 1. Invitations Received */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Tournament Invitations Received
            </h2>
            <p className="text-xs text-muted-foreground">
              Official invitations sent by tournament organizers
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-bold text-amber-500 border-amber-500/30">
            {invitationsReceived.length} Pending
          </Badge>
        </div>

        {invitationsReceived.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invitationsReceived.map((inv) => (
              <Card key={inv.id} className="border-2 border-amber-500/40 bg-amber-500/[0.02] shadow-md flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" /> INVITATION RECEIVED
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      Group {inv.groupName || "A"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-black pt-1">
                    {inv.tournament?.name || "Cricket Tournament"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Invited by: {inv.invitedBy || "Tournament Organizer"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <p className="text-xs text-muted-foreground">
                    Venue: {inv.tournament?.venueName || "Askari XI, Lahore"} · Format: {inv.tournament?.formatType || "Tape Ball"}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        respondInviteMutation.mutate({
                          membershipId: inv.id,
                          status: "DECLINED",
                        })
                      }
                      disabled={respondInviteMutation.isPending}
                      className="text-xs font-bold rounded-xl h-9 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        respondInviteMutation.mutate({
                          membershipId: inv.id,
                          status: "ACCEPTED",
                        })
                      }
                      disabled={respondInviteMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9 shadow-sm"
                    >
                      Accept Invitation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center space-y-2 border-dashed bg-muted/10">
            <p className="text-xs text-muted-foreground">
              No pending tournament invitations at the moment.
            </p>
          </Card>
        )}
      </section>

      {/* 2. Outgoing Team Applications & History */}
      <section className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Send className="h-5 w-5 text-sky-500" /> Outgoing Applications & History
            </h2>
            <p className="text-xs text-muted-foreground">
              Status of your requests to participate in tournaments
            </p>
          </div>
          <Link to="/team/tournaments">
            <Button variant="outline" size="sm" className="text-xs font-bold rounded-xl h-8">
              Find More Tournaments
            </Button>
          </Link>
        </div>

        {outgoingRequests.length > 0 ? (
          <div className="space-y-3">
            {outgoingRequests.map((req) => {
              const isPending = req.status === "PENDING";
              const isAccepted = req.status === "ACCEPTED";
              const isRejected = req.status === "REJECTED";
              const isWithdrawn = req.status === "WITHDRAWN";

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-foreground">
                        {req.tournament?.name || "Cricket Tournament"}
                      </h3>
                      <Badge
                        className={`text-[10px] font-bold ${
                          isAccepted
                            ? "bg-emerald-600 text-white"
                            : isPending
                            ? "bg-amber-500 text-white"
                            : isRejected
                            ? "bg-rose-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isPending
                        ? "Your request is awaiting tournament organizer review."
                        : isAccepted
                        ? "Accepted as an official participating club."
                        : isRejected
                        ? "Request declined by tournament organizer."
                        : "Request was cancelled."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Withdraw this tournament application?")) {
                            withdrawMutation.mutate(req.id);
                          }
                        }}
                        disabled={withdrawMutation.isPending}
                        className="text-xs font-bold text-muted-foreground hover:text-rose-500 h-8"
                      >
                        Withdraw Request
                      </Button>
                    )}
                    <Link to={req.tournament?.slug ? `/t/${req.tournament.slug}` : "/"}>
                      <Button size="sm" variant="outline" className="text-xs font-bold gap-1 rounded-xl h-8">
                        View Tournament <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center space-y-2 border-dashed bg-muted/10">
            <p className="text-xs text-muted-foreground">
              You haven't submitted any tournament applications yet.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
