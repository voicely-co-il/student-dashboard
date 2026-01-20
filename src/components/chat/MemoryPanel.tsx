import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { Brain, Trash2, Lightbulb, Target, Heart, Trophy, AlertCircle, Loader2 } from "lucide-react";
import type { MemoryType } from "@/types/chat-memory";

interface Memory {
  id: string;
  memory_type: MemoryType;
  content: string;
  confidence: number;
  importance: number;
  created_at: string;
  last_accessed_at?: string;
}

const memoryTypeConfig: Record<MemoryType, { label: string; icon: typeof Brain; color: string }> = {
  fact: { label: "עובדה", icon: Lightbulb, color: "bg-blue-100 text-blue-800" },
  preference: { label: "העדפה", icon: Heart, color: "bg-pink-100 text-pink-800" },
  goal: { label: "מטרה", icon: Target, color: "bg-green-100 text-green-800" },
  challenge: { label: "אתגר", icon: AlertCircle, color: "bg-orange-100 text-orange-800" },
  achievement: { label: "הישג", icon: Trophy, color: "bg-yellow-100 text-yellow-800" },
};

export function MemoryPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteMemoryId, setDeleteMemoryId] = useState<string | null>(null);

  // Fetch user memories
  const { data: memories, isLoading } = useQuery({
    queryKey: ["user-memories", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("user_memories")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("importance", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Memory[];
    },
    enabled: !!user?.id,
  });

  // Delete memory mutation
  const deleteMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      const { error } = await supabase
        .from("user_memories")
        .update({ is_active: false })
        .eq("id", memoryId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-memories", user?.id] });
      setDeleteMemoryId(null);
    },
  });

  const groupedMemories = memories?.reduce((acc, memory) => {
    if (!acc[memory.memory_type]) {
      acc[memory.memory_type] = [];
    }
    acc[memory.memory_type].push(memory);
    return acc;
  }, {} as Record<MemoryType, Memory[]>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">הזיכרון שלי</span>
            {memories && memories.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {memories.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[340px] sm:w-[400px]" dir="rtl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-voicely-green" />
              מה אני יודע עליך
            </SheetTitle>
            <SheetDescription>
              המידע שה-AI שלנו זוכר עליך כדי להתאים את התשובות
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)] mt-4 -mx-2 px-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !memories || memories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>עוד אין זיכרונות</p>
                <p className="text-sm mt-1">ככל שתשוחח איתי יותר, אלמד להכיר אותך</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(Object.keys(memoryTypeConfig) as MemoryType[]).map((type) => {
                  const typeMemories = groupedMemories?.[type];
                  if (!typeMemories || typeMemories.length === 0) return null;

                  const config = memoryTypeConfig[type];
                  const Icon = config.icon;

                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                          {config.label}
                        </span>
                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                          {typeMemories.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {typeMemories.map((memory) => (
                          <div
                            key={memory.id}
                            className="group bg-muted/50 rounded-lg p-3 relative"
                          >
                            <p className="text-sm pe-8">{memory.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{formatDate(memory.created_at)}</span>
                              {memory.confidence < 1 && (
                                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                  {Math.round(memory.confidence * 100)}% ודאות
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 left-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeleteMemoryId(memory.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteMemoryId} onOpenChange={() => setDeleteMemoryId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את הזיכרון?</AlertDialogTitle>
            <AlertDialogDescription>
              הזיכרון יימחק ולא ישפיע יותר על התשובות שתקבל. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMemoryId && deleteMutation.mutate(deleteMemoryId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "מחק"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
