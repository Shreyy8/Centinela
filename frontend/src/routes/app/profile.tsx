import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Building, Mail, FileText, Key, ShieldCheck, Save, Edit3 } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Centinela — Profile & Settings" },
      { name: "description", content: "Manage your Centinela workspace profile and credentials." },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  fullName: string;
  organization: string;
  role: string;
  email: string;
  bio: string;
};

const INITIAL: Profile = {
  fullName: "Ayush Kumar",
  organization: "Centinela Platform",
  role: "Lead Security Evaluator",
  email: "ayush47brohaiking@gmail.com",
  bio: "Lead Evaluator overseeing automated agentic AI red teaming, policy enforcement and compliance certificates.",
};

function ProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Profile>(INITIAL);

  const { data: profile = INITIAL } = useQuery<Profile>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      try {
        const res = await api.get("/auth/profile");
        return {
          fullName: res.fullName || INITIAL.fullName,
          organization: res.organization || INITIAL.organization,
          role: res.role || INITIAL.role,
          email: res.email || INITIAL.email,
          bio: res.bio || INITIAL.bio,
        };
      } catch {
        return INITIAL;
      }
    },
  });

  React.useEffect(() => {
    if (profile) setDraft(profile);
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (updated: Profile) => {
      return await api.put("/auth/profile", updated);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["userProfile"], data);
      setEditing(false);
      toast.success("Profile saved successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not save profile");
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Main Profile Card */}
      <div className="rounded-[2rem] bg-white border border-zinc-200/70 p-8 sm:p-10 shadow-[0_4px_25px_rgb(0,0,0,0.02)] space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {draft.fullName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                {draft.fullName}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                {draft.role} • {draft.organization}
              </p>
            </div>
          </div>

          <div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white hover:bg-zinc-50 px-5 py-2 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-zinc-200/80 bg-white px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveMutation.mutate(draft)}
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 hover:bg-black text-white px-5 py-2 text-xs font-semibold shadow-2xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saveMutation.isPending ? "Saving..." : "Save"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Full Name
            </label>
            <input
              type="text"
              disabled={!editing}
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              className="w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2.5 text-xs font-semibold text-zinc-900 disabled:opacity-80 focus:border-zinc-800 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              disabled={!editing}
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2.5 text-xs font-semibold text-zinc-900 disabled:opacity-80 focus:border-zinc-800 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Organization
            </label>
            <input
              type="text"
              disabled={!editing}
              value={draft.organization}
              onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
              className="w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2.5 text-xs font-semibold text-zinc-900 disabled:opacity-80 focus:border-zinc-800 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Role / Designation
            </label>
            <input
              type="text"
              disabled={!editing}
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              className="w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2.5 text-xs font-semibold text-zinc-900 disabled:opacity-80 focus:border-zinc-800 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Bio &amp; Scope
            </label>
            <textarea
              rows={3}
              disabled={!editing}
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              className="w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2.5 text-xs text-zinc-800 disabled:opacity-80 focus:border-zinc-800 focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Security Credentials Card */}
        <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/40 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Cryptographic Audit Key</span>
          </div>
          <p className="text-xs text-zinc-500">
            Audit certificates issued under your authority are signed using Ed25519 asymmetric
            cryptography.
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-zinc-200/80 text-xs font-mono text-zinc-700">
            <span className="truncate">ed25519_pk_0x98f4...b7c2</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
