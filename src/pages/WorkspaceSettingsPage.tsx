import { useState } from "react";
import { addWorkspaceMember, removeWorkspaceMember } from "../api/workspace";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";

const WorkspaceSettingsPage = () => {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const { user } = useAuth();

  const [memberEmail, setMemberEmail] = useState("");

  const [memberRole, setMemberRole] = useState<
    "MEMBER" | "MANAGER" | "ADMIN" | "VIEWER"
  >("MEMBER");

  const [saving, setSaving] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!currentWorkspace) {
    return (
      <div className="w-full p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="text-xl font-semibold text-slate-900">
            No workspace selected
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create or select a workspace first.
          </p>
        </div>
      </div>
    );
  }

  const currentMember = currentWorkspace.members.find((member: any) =>
    typeof member.user === "string"
      ? member.user === user?._id
      : member.user?._id === user?._id,
  );

  const canManageMembers =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  const handleRemoveMember = async (userId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the workspace?",
    );

    if (!confirmed) return;

    try {
      setRemovingUserId(userId);
      setError("");

      await removeWorkspaceMember(currentWorkspace._id, userId);

      await refreshWorkspaces();
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Failed to remove workspace member",
      );
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await addWorkspaceMember(
        currentWorkspace._id,
        memberEmail.trim(),
        memberRole,
      );

      await refreshWorkspaces();

      setMemberEmail("");
      setMemberRole("MEMBER");
    } catch (error: any) {
      setError(
        error.response?.data?.message || "Failed to add workspace member",
      );
    } finally {
      setSaving(false);
    }
  };

  const getRoleClass = (role: string) => {
    switch (role) {
      case "OWNER":
        return "border-indigo-100 bg-indigo-50 text-indigo-700";

      case "ADMIN":
        return "border-blue-100 bg-blue-50 text-blue-700";

      case "MANAGER":
        return "border-amber-100 bg-amber-50 text-amber-700";

      case "VIEWER":
        return "border-slate-200 bg-slate-100 text-slate-600";

      default:
        return "border-green-100 bg-green-50 text-green-700";
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-7">
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Workspace Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage members and access for {currentWorkspace.name}
        </p>
      </div>

      {/* Members Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold text-slate-900">
            Workspace Members
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            People who currently have access to this workspace.
          </p>
        </div>

        {/* Members List */}
        <div className="divide-y divide-slate-100">
          {currentWorkspace.members.map((member: any) => {
            const memberId =
              typeof member.user === "string" ? member.user : member.user?._id;

            const memberName =
              typeof member.user === "string"
                ? "Workspace Member"
                : member.user?.name || "Workspace Member";

            const memberEmail =
              typeof member.user === "string" ? "" : member.user?.email || "";

            const isCurrentUser = memberId === user?._id;
            const isOwner = member.role === "OWNER";
            const isRemoving = removingUserId === memberId;

            return (
              <div
                key={memberId}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-medium text-indigo-600">
                    {memberName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {memberName}
                      </p>

                      {isCurrentUser && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          You
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {memberEmail || memberId}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {canManageMembers && !isOwner && !isCurrentUser && (
                    <button
                      type="button"
                      disabled={removingUserId !== null}
                      onClick={() => handleRemoveMember(memberId)}
                      style={{
                        padding: "6px 8px",
                        fontSize: "12px",
                        lineHeight: "14px",
                        borderRadius: "4px",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                        backgroundColor: "transparent",
                        fontWeight: 500,
                      }}
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </button>
                  )}

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getRoleClass(
                      member.role,
                    )}`}
                  >
                    {member.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Member */}
        {canManageMembers && (
          <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-5">
            <h3 className="text-sm font-semibold text-slate-900">
              Add Workspace Member
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add an existing user using their registered email.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="user@example.com"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <select
                value={memberRole}
                onChange={(e) =>
                  setMemberRole(
                    e.target.value as "MEMBER" | "MANAGER" | "ADMIN" | "VIEWER",
                  )
                }
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="MEMBER">Member</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>

              <button
                type="button"
                onClick={handleAddMember}
                disabled={saving}
                className="h-10 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border-t border-red-100 bg-red-50 px-5 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSettingsPage;
