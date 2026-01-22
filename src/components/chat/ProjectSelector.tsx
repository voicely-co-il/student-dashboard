import { useState } from "react";
import {
  FolderOpen,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ChatProject, CreateProjectInput } from "@/hooks/useChatProjects";

interface ProjectSelectorProps {
  projects: ChatProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: (input: CreateProjectInput) => Promise<string | null>;
  onDeleteProject: (projectId: string) => Promise<boolean>;
  onTogglePin: (projectId: string) => Promise<boolean>;
  isLoading?: boolean;
}

const PROJECT_COLORS = [
  { name: "slate", class: "bg-slate-500" },
  { name: "red", class: "bg-red-500" },
  { name: "orange", class: "bg-orange-500" },
  { name: "amber", class: "bg-amber-500" },
  { name: "emerald", class: "bg-emerald-500" },
  { name: "cyan", class: "bg-cyan-500" },
  { name: "blue", class: "bg-blue-500" },
  { name: "violet", class: "bg-violet-500" },
  { name: "pink", class: "bg-pink-500" },
];

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onTogglePin,
  isLoading,
}: ProjectSelectorProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState<CreateProjectInput>({
    name: "",
    description: "",
    system_prompt: "",
    color: "slate",
  });
  const [isCreating, setIsCreating] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    setIsCreating(true);
    const projectId = await onCreateProject(newProject);
    setIsCreating(false);

    if (projectId) {
      setCreateDialogOpen(false);
      setNewProject({
        name: "",
        description: "",
        system_prompt: "",
        color: "slate",
      });
      onSelectProject(projectId);
    }
  };

  const pinnedProjects = projects.filter((p) => p.is_pinned);
  const unpinnedProjects = projects.filter((p) => !p.is_pinned);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 max-w-[200px]"
            disabled={isLoading}
          >
            {selectedProject ? (
              <>
                <div
                  className={`w-3 h-3 rounded-full bg-${selectedProject.color}-500`}
                />
                <span className="truncate">{selectedProject.name}</span>
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4" />
                <span>כל השיחות</span>
              </>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64" dir="rtl">
          {/* All Chats option */}
          <DropdownMenuItem
            onClick={() => onSelectProject(null)}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            <span>כל השיחות</span>
            {!selectedProjectId && <Badge variant="secondary">נבחר</Badge>}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Pinned Projects */}
          {pinnedProjects.length > 0 && (
            <>
              {pinnedProjects.map((project) => (
                <ProjectMenuItem
                  key={project.id}
                  project={project}
                  isSelected={project.id === selectedProjectId}
                  onSelect={() => onSelectProject(project.id)}
                  onTogglePin={() => onTogglePin(project.id)}
                  onDelete={() => onDeleteProject(project.id)}
                />
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Unpinned Projects */}
          {unpinnedProjects.map((project) => (
            <ProjectMenuItem
              key={project.id}
              project={project}
              isSelected={project.id === selectedProjectId}
              onSelect={() => onSelectProject(project.id)}
              onTogglePin={() => onTogglePin(project.id)}
              onDelete={() => onDeleteProject(project.id)}
            />
          ))}

          {projects.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              אין פרויקטים עדיין
            </div>
          )}

          <DropdownMenuSeparator />

          {/* Create New Project */}
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 text-emerald-600 dark:text-emerald-400"
          >
            <Plus className="h-4 w-4" />
            <span>פרויקט חדש</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>יצירת פרויקט חדש</DialogTitle>
            <DialogDescription>
              פרויקט מאפשר לך להגדיר הנחיות מותאמות אישית לכל השיחות בתוכו.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">שם הפרויקט</Label>
              <Input
                id="name"
                value={newProject.name}
                onChange={(e) =>
                  setNewProject((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="למשל: תלמידים חדשים"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">תיאור (אופציונלי)</Label>
              <Input
                id="description"
                value={newProject.description}
                onChange={(e) =>
                  setNewProject((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="תיאור קצר של הפרויקט"
              />
            </div>

            <div className="grid gap-2">
              <Label>צבע</Label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    className={`w-8 h-8 rounded-full ${color.class} transition-transform ${
                      newProject.color === color.name
                        ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110"
                        : "hover:scale-105"
                    }`}
                    onClick={() =>
                      setNewProject((prev) => ({ ...prev, color: color.name }))
                    }
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="system_prompt">
                הנחיות לעוזר (System Prompt)
              </Label>
              <Textarea
                id="system_prompt"
                value={newProject.system_prompt}
                onChange={(e) =>
                  setNewProject((prev) => ({
                    ...prev,
                    system_prompt: e.target.value,
                  }))
                }
                placeholder="הנחיות מיוחדות שהעוזר יקבל בכל שיחה בפרויקט זה..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                למשל: &quot;אתה עוזר לקליטת תלמידים חדשים. התמקד באיסוף מידע על
                הניסיון הקודם שלהם...&quot;
              </p>
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              ביטול
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProject.name.trim() || isCreating}
            >
              {isCreating ? "יוצר..." : "צור פרויקט"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectMenuItem({
  project,
  isSelected,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  project: ChatProject;
  isSelected: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className="gap-2 group cursor-pointer"
    >
      <div className={`w-3 h-3 rounded-full bg-${project.color}-500`} />
      <span className="truncate flex-1">{project.name}</span>
      {project.is_pinned && <Pin className="h-3 w-3 text-muted-foreground" />}
      {isSelected && <Badge variant="secondary">נבחר</Badge>}

      {/* Action buttons - show on hover */}
      <div className="hidden group-hover:flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
        >
          {project.is_pinned ? (
            <PinOff className="h-3 w-3" />
          ) : (
            <Pin className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </DropdownMenuItem>
  );
}
