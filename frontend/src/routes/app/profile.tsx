import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Building, Mail, FileText, Key, ShieldCheck, Save, Edit3 } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "CENTINELA — CISO Security Profile" },
      { name: "description", content: "Manage your CENTINELA profile and audit history." },
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
  fullName: "Sarah Chen",
  organization: "Northwind Health",
  role: "CISO",
  email: "sarah.chen@northwind.health",
  bio: "Chief Information Security Officer leading adversarial AI safety and automated LLM red-teaming audits.",
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
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            CISO Workspace &amp; Credentials
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Cryptographic identity, organizational governance profile, and audit certification
            signature keys.
          </p>
        </div>

        <div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-white/60" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate(draft)}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-600/30"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saveMutation.isPending ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-2xl border border-white/5 bg-[#090b10] p-6 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-white/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-blue-600/20">
            {profile.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{profile.fullName}</h2>
            <p className="text-xs text-white/50">
              {profile.role} • {profile.organization}
            </p>
            <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Authorized Security Lead</span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Full Name</label>
            <input
              type="text"
              disabled={!editing}
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white disabled:opacity-60 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Organization</label>
            <input
              type="text"
              disabled={!editing}
              value={draft.organization}
              onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white disabled:opacity-60 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              Security Role / Title
            </label>
            <input
              type="text"
              disabled={!editing}
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white disabled:opacity-60 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Email Address</label>
            <input
              type="email"
              disabled={!editing}
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white disabled:opacity-60 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-white/60 mb-1">
              Bio / Security Mandate
            </label>
            <textarea
              rows={3}
              disabled={!editing}
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white disabled:opacity-60 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
