import { useRef, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherChat } from "@/hooks/useTeacherChat";
import { useTeacherChatSessions } from "@/hooks/useTeacherChatSessions";
import { useChatProjects } from "@/hooks/useChatProjects";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { QuickActions } from "@/components/chat/QuickActions";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ProjectSelector } from "@/components/chat/ProjectSelector";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { ArrowRight, RotateCcw, PanelLeftClose, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function TeacherChat() {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  // Projects hook
  const {
    projects,
    isLoading: projectsLoading,
    createProject,
    deleteProject: deleteProjectFn,
    togglePin,
    getProject,
  } = useChatProjects();

  // Get selected project's system prompt
  const selectedProject = selectedProjectId ? getProject(selectedProjectId) : null;

  // Chat hook with project support
  const {
    messages,
    isLoading,
    isLoadingSession,
    sessionId,
    sendMessage,
    clearHistory,
    switchSession,
    createNewSession,
  } = useTeacherChat({
    teacherId: user?.id,
    projectId: selectedProjectId,
    projectSystemPrompt: selectedProject?.system_prompt,
  });

  // Sessions hook
  const {
    groupedSessions,
    isLoading: sessionsLoading,
    fetchSessions,
    deleteSession,
  } = useTeacherChatSessions();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleNewChat = async () => {
    const newId = await createNewSession();
    if (newId) {
      // Refresh sessions list
      fetchSessions();
    }
  };

  const handleSwitchSession = async (newSessionId: string) => {
    if (newSessionId !== sessionId) {
      await switchSession(newSessionId);
    }
  };

  const handleDeleteSession = async (sessionIdToDelete: string) => {
    const deleted = await deleteSession(sessionIdToDelete);
    if (deleted && sessionIdToDelete === sessionId) {
      // If deleted current session, create a new one
      await handleNewChat();
    }
    return deleted;
  };

  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    // Optionally create new session when switching projects
    // handleNewChat();
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 dark:bg-slate-900 flex w-full"
      >
        {/* Conversation History Sidebar */}
        <ConversationSidebar
          groupedSessions={groupedSessions}
          activeSessionId={sessionId}
          onSelectSession={handleSwitchSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          isLoading={sessionsLoading}
        />

        {/* Main Chat Area */}
        <SidebarInset className="flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-3 sm:px-4 py-3">
              <div className="flex items-center gap-2">
                <Link to="/" aria-label="חזרה לדף הבית">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>

                {/* Project Selector */}
                <ProjectSelector
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={handleSelectProject}
                  onCreateProject={createProject}
                  onDeleteProject={deleteProjectFn}
                  onTogglePin={togglePin}
                  isLoading={projectsLoading}
                />
              </div>

              <div className="text-center">
                <h1 className="font-semibold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                  {selectedProject ? selectedProject.name : "עוזר Voicely"}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedProject?.description || "מנהל CRM, יומן ותובנות"}
                </p>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearHistory}
                  className="rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  title="שיחה חדשה"
                  aria-label="התחל שיחה חדשה"
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
                <SidebarTrigger className="rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <PanelLeftClose className="w-5 h-5" />
                </SidebarTrigger>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActions onAction={handleQuickAction} />
          </header>

          {/* Messages */}
          {isLoadingSession ? (
            <div className="flex-1 flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/50">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  טוען שיחה...
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea
              className="flex-1 p-3 sm:p-4 bg-slate-100/50 dark:bg-slate-800/50"
              ref={scrollRef}
            >
              <div
                className="space-y-3 sm:space-y-4 max-w-2xl mx-auto pb-4"
                role="log"
                aria-live="polite"
                aria-label="היסטוריית שיחה"
              >
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {isLoading && (
                  <div
                    className="flex justify-center py-4"
                    aria-label="טוען תגובה"
                  >
                    <div className="flex gap-2">
                      <span
                        className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Input */}
          <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading || isLoadingSession}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
