import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Brain,
  Search,
  Users,
  Activity,
  Clock,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

interface MemoryStats {
  total_memories: number;
  facts_count: number;
  preferences_count: number;
  goals_count: number;
  challenges_count: number;
  achievements_count: number;
  avg_confidence: number;
  oldest_memory: string;
  newest_memory: string;
}

interface UserWithStats {
  id: string;
  email: string;
  name: string;
  stats: MemoryStats | null;
}

interface MemoryOperation {
  id: string;
  user_id: string;
  operation: string;
  input_data: any;
  output_data: any;
  latency_ms: number;
  created_at: string;
}

const AdminMemoryDebug = () => {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch users with memory stats
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-users-memories"],
    queryFn: async () => {
      // Get users who have memories
      const { data: usersWithMemories, error } = await supabase
        .from("user_memories")
        .select("user_id")
        .eq("is_active", true);

      if (error) throw error;

      const uniqueUserIds = [...new Set(usersWithMemories?.map(m => m.user_id))];

      // Get user details
      const { data: userDetails } = await supabase
        .from("users")
        .select("id, email, name")
        .in("id", uniqueUserIds);

      // Get stats for each user
      const usersWithStats: UserWithStats[] = [];
      for (const user of userDetails || []) {
        const { data: stats } = await supabase
          .rpc("get_user_memory_stats", { p_user_id: user.id })
          .single();

        usersWithStats.push({
          ...user,
          stats: stats as MemoryStats | null,
        });
      }

      return usersWithStats;
    },
  });

  // Fetch selected user's memories
  const { data: userMemories, isLoading: loadingMemories } = useQuery({
    queryKey: ["admin-user-memories", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];

      const { data, error } = await supabase
        .from("user_memories")
        .select("*")
        .eq("user_id", selectedUserId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  // Fetch recent memory operations
  const { data: recentOps } = useQuery({
    queryKey: ["admin-memory-operations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memory_operations_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MemoryOperation[];
    },
  });

  const filteredUsers = users?.filter(
    (u) =>
      !searchEmail ||
      u.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("he-IL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const memoryTypeColors: Record<string, string> = {
    fact: "bg-blue-100 text-blue-800",
    preference: "bg-pink-100 text-pink-800",
    goal: "bg-green-100 text-green-800",
    challenge: "bg-orange-100 text-orange-800",
    achievement: "bg-yellow-100 text-yellow-800",
  };

  const opColors: Record<string, string> = {
    extract: "bg-purple-100 text-purple-800",
    retrieve: "bg-blue-100 text-blue-800",
    update: "bg-green-100 text-green-800",
    summarize: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-voicely-green" />
                Memory Debug Panel
              </h1>
              <p className="text-xs text-muted-foreground">
                ניהול ודיבוג של מערכת הזיכרון
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              משתמשים
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-2">
              <Activity className="h-4 w-4" />
              פעולות אחרונות
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי אימייל או שם..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pe-10"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">משתמשים עם זיכרונות</CardTitle>
                  <CardDescription>
                    {users?.length || 0} משתמשים
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {loadingUsers ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredUsers?.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedUserId === user.id
                                ? "bg-voicely-green/10 border border-voicely-green"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{user.name || "ללא שם"}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                              {user.stats && (
                                <Badge variant="outline">
                                  {user.stats.total_memories} זיכרונות
                                </Badge>
                              )}
                            </div>
                            {user.stats && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {user.stats.facts_count > 0 && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    {user.stats.facts_count} עובדות
                                  </Badge>
                                )}
                                {user.stats.goals_count > 0 && (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    {user.stats.goals_count} מטרות
                                  </Badge>
                                )}
                                {user.stats.challenges_count > 0 && (
                                  <Badge className="bg-orange-100 text-orange-800 text-xs">
                                    {user.stats.challenges_count} אתגרים
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* User Memories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">זיכרונות המשתמש</CardTitle>
                  <CardDescription>
                    {selectedUserId
                      ? `${userMemories?.length || 0} זיכרונות`
                      : "בחר משתמש לצפייה"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {!selectedUserId ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>בחר משתמש מהרשימה</p>
                      </div>
                    ) : loadingMemories ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {userMemories?.map((memory: any) => (
                          <div key={memory.id} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-start justify-between gap-2">
                              <Badge className={memoryTypeColors[memory.memory_type]}>
                                {memory.memory_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(memory.created_at)}
                              </span>
                            </div>
                            <p className="text-sm mt-2">{memory.content}</p>
                            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                              <span>ודאות: {Math.round(memory.confidence * 100)}%</span>
                              <span>•</span>
                              <span>חשיבות: {Math.round(memory.importance * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operations">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  פעולות אחרונות
                </CardTitle>
                <CardDescription>
                  50 הפעולות האחרונות במערכת הזיכרון
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>זמן</TableHead>
                      <TableHead>פעולה</TableHead>
                      <TableHead>משתמש</TableHead>
                      <TableHead>תוצאה</TableHead>
                      <TableHead>Latency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOps?.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell className="text-sm">
                          {formatDate(op.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={opColors[op.operation] || "bg-gray-100"}>
                            {op.operation}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {op.user_id?.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-sm">
                          {op.output_data?.added !== undefined && (
                            <span className="text-green-600">+{op.output_data.added}</span>
                          )}
                          {op.output_data?.count !== undefined && (
                            <span>{op.output_data.count} results</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {op.latency_ms}ms
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminMemoryDebug;
