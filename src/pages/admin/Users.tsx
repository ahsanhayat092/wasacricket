import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getUsers } from "@/lib/queries";
import { upsertUser, deleteUser } from "@/lib/mutations";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, UserCheck, Plus, Trash2, Pencil, ShieldAlert, KeyRound } from "lucide-react";
import type { UserAccount, UserRole } from "@/lib/firestore";

type UserForm = {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
};

const emptyForm: UserForm = {
  email: "",
  name: "",
  role: "scorer",
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const save = useMutation({
    mutationFn: (args: UserForm) =>
      upsertUser({
        ...args,
        createdBy: currentUser?.email ?? "admin",
      }),
    onSuccess: () => {
      toast.success(form.id ? "User updated" : "User invited / registered");
      setOpen(false);
      setForm(emptyForm);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success("User removed");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">User Roles & Access Control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who can administer the tournament and who can enter live match scores.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Add User / Scorer
        </Button>
      </div>

      {/* Role Explainers */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-emerald-500 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Administrator Role
            </CardTitle>
            <CardDescription className="text-xs">
              Full control over all aspects of the tournament.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <p>✓ Create, edit, and delete Teams and Squad Players.</p>
            <p>✓ Create and auto-generate Match Schedules and timings.</p>
            <p>✓ Adjust tournament rules (points system, overs per side).</p>
            <p>✓ Manage user roles, invite new Admins and Official Scorers.</p>
            <p>✓ Full scorekeeping and match management privileges.</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-amber-500 flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Official Scorer Role
            </CardTitle>
            <CardDescription className="text-xs">
              Dedicated scorekeeping access during matches.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <p>✓ Access to <strong>Matches & Match Control</strong> workspace.</p>
            <p>✓ Conduct Toss and start matches (Go Live).</p>
            <p>✓ Enter ball-by-ball batting and bowling scorecards.</p>
            <p>✓ Finalize matches with winning result and Player of the Match.</p>
            <p>✗ Cannot edit team rosters, schedule dates, or system settings.</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>User / Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Assigned Role</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading user permissions…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (!users || users.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No additional users registered yet. Click <strong>"Add User / Scorer"</strong> to grant scoring or administrative permissions.
                </TableCell>
              </TableRow>
            )}
            {users?.map((u) => {
              const isSelf = u.email === currentUser?.email;
              return (
                <TableRow key={u.id} className="hover:bg-muted/40">
                  <TableCell className="font-semibold">
                    {u.email}
                    {isSelf && (
                      <Badge variant="outline" className="ml-2 text-[10px] py-0 border-emerald-500 text-emerald-500">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.name || "—"}
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-xs">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-600 hover:bg-amber-600 text-white gap-1 text-xs">
                        <UserCheck className="h-3 w-3" /> Scorer
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setForm({
                            id: u.id,
                            email: u.email,
                            name: u.name ?? "",
                            role: u.role,
                          });
                          setOpen(true);
                        }}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!isSelf && (
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={del.isPending}
                          onClick={() => {
                            if (confirm(`Remove access for ${u.email}?`)) {
                              del.mutate(u.id);
                            }
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit User Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit User Role" : "Grant User Access"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Google Email Address</Label>
              <Input
                type="email"
                disabled={!!form.id}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@gmail.com"
              />
              <p className="text-[11px] text-muted-foreground">
                The user will sign in using this Google account.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Full Name (Optional)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ali Ahmed"
              />
            </div>

            <div className="space-y-2">
              <Label>Assigned Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scorer">
                    Official Scorer (Match Control & Scorecards only)
                  </SelectItem>
                  <SelectItem value="admin">
                    Administrator (Full Tournament Management)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={save.isPending || !form.email}
              onClick={() => save.mutate(form)}
            >
              {form.id ? "Update Role" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
