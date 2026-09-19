import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

import { createProject, getProjects } from "../api/project";
import type { Project } from "../api/project";
import { useWorkspace } from "../context/WorkspaceContext";

const ProjectsPage = () => {
  const {
    currentWorkspace,
    loading: workspaceLoading,
    addWorkspace,
  } = useWorkspace();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [workspaceName, setWorkspaceName] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  const loadProjects = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await getProjects(currentWorkspace._id);

      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!workspaceLoading) {
      loadProjects();
    }
  }, [currentWorkspace, workspaceLoading]);

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      setWorkspaceError("Workspace name is required");
      return;
    }

    try {
      setCreatingWorkspace(true);
      setWorkspaceError("");

      await addWorkspace(workspaceName.trim());

      setWorkspaceName("");
    } catch (error: any) {
      console.error("Failed to create workspace", error);

      setWorkspaceError(
        error.response?.data?.message || "Failed to create workspace",
      );
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const handleCreateProject = async () => {
    if (!currentWorkspace) return;

    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const project = await createProject(currentWorkspace._id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
      });

      setProjects((prev) => [project, ...prev]);

      setFormData({
        name: "",
        description: "",
      });

      setOpen(false);
    } catch (error: any) {
      console.error("Failed to create project", error);

      setError(error.response?.data?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (workspaceLoading || loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />

          <p className="mt-3 text-sm text-slate-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="w-full p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="text-xl font-semibold text-slate-900">
            Create your workspace
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            You need a workspace before you can create projects.
          </p>

          <div className="mt-6 flex max-w-lg gap-3">
            <TextField
              label="Workspace Name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              size="small"
              fullWidth
            />

            <Button
              variant="contained"
              onClick={handleCreateWorkspace}
              disabled={creatingWorkspace}
              sx={{
                minWidth: 100,
                textTransform: "none",
              }}
            >
              {creatingWorkspace ? "Creating..." : "Create"}
            </Button>
          </div>

          {workspaceError && (
            <p className="mt-3 text-sm text-red-600">{workspaceError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Page Header */}
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>

          <p className="mt-1 text-sm text-slate-500">
            Projects in {currentWorkspace.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          + New Project
        </button>
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">
            No projects yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create your first project to get started.
          </p>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project._id}
              to={`/projects/${project._id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 truncate text-base font-semibold text-slate-900 group-hover:text-indigo-600">
                  {project.name}
                </h2>

                <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
                  {project.status.replace("_", " ")}
                </span>
              </div>

              <p className="mt-4 min-h-[40px] text-sm leading-5 text-slate-500">
                {project.description || "No description"}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm text-slate-500">
                  {project.members.length}{" "}
                  {project.members.length === 1 ? "member" : "members"}
                </span>

                <span className="text-sm font-medium text-indigo-600 transition group-hover:text-indigo-700">
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog
        open={open}
        onClose={() => {
          if (!creating) {
            setOpen(false);
            setError("");
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#0f172a",
          }}
        >
          Create Project
        </DialogTitle>

        <DialogContent>
          <div className="flex flex-col gap-4 pt-2">
            <TextField
              label="Project Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              fullWidth
              autoFocus
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              fullWidth
              multiline
              rows={3}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setOpen(false);
              setError("");
            }}
            disabled={creating}
            sx={{
              textTransform: "none",
              color: "#475569",
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleCreateProject}
            disabled={creating}
            sx={{
              textTransform: "none",
              backgroundColor: "#4f46e5",
              "&:hover": {
                backgroundColor: "#4338ca",
              },
            }}
          >
            {creating ? "Creating..." : "Create Project"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
