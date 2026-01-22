import { useState } from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type {
  GroupedSessions,
  TeacherChatSession,
} from "@/hooks/useTeacherChatSessions";

interface ConversationSidebarProps {
  groupedSessions: GroupedSessions;
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  isLoading?: boolean;
}

export function ConversationSidebar({
  groupedSessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isLoading,
}: ConversationSidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    const success = await onDeleteSession(sessionToDelete);
    setIsDeleting(false);

    if (success) {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  const renderSessionGroup = (
    label: string,
    sessions: TeacherChatSession[]
  ) => {
    if (sessions.length === 0) return null;

    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {sessions.map((session) => (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton
                  isActive={session.id === activeSessionId}
                  onClick={() => onSelectSession(session.id)}
                  tooltip={session.title}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate">{session.title}</span>
                </SidebarMenuButton>
                <SidebarMenuAction
                  showOnHover
                  onClick={(e) => handleDeleteClick(session.id, e)}
                  className="hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const hasAnySessions =
    groupedSessions.today.length > 0 ||
    groupedSessions.yesterday.length > 0 ||
    groupedSessions.previousWeek.length > 0 ||
    groupedSessions.older.length > 0;

  return (
    <>
      <Sidebar side="right" collapsible="offcanvas">
        <SidebarHeader className="border-b">
          <Button
            onClick={onNewChat}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            שיחה חדשה
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="p-2 space-y-2">
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
                <SidebarMenuSkeleton showIcon />
              </div>
            ) : !hasAnySessions ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>אין שיחות קודמות</p>
                <p className="text-xs mt-1">התחל שיחה חדשה למעלה</p>
              </div>
            ) : (
              <>
                {renderSessionGroup("היום", groupedSessions.today)}
                {renderSessionGroup("אתמול", groupedSessions.yesterday)}
                {renderSessionGroup(
                  "7 ימים אחרונים",
                  groupedSessions.previousWeek
                )}
                {renderSessionGroup("קודם לכן", groupedSessions.older)}
              </>
            )}
          </ScrollArea>
        </SidebarContent>
      </Sidebar>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שיחה</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק את השיחה? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
