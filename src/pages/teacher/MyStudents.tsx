import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Users,
  ArrowRight,
  RefreshCw,
  Loader2,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react';
import StudentCard, { StudentCardData } from '@/components/teacher/StudentCard';

type FilterType = 'all' | 'active' | 'recent' | 'inactive';

const MyStudents = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Fetch students from transcripts
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['teacher-students'],
    queryFn: async () => {
      const { data: transcripts, error } = await supabase
        .from('transcripts')
        .select('student_name, lesson_date')
        .not('student_name', 'is', null)
        .order('lesson_date', { ascending: false });

      if (error) throw error;

      // Aggregate by student
      const studentMap = new Map<string, { count: number; dates: string[] }>();

      for (const t of transcripts || []) {
        if (!t.student_name) continue;

        const existing = studentMap.get(t.student_name);
        if (existing) {
          existing.count++;
          if (t.lesson_date) existing.dates.push(t.lesson_date);
        } else {
          studentMap.set(t.student_name, {
            count: 1,
            dates: t.lesson_date ? [t.lesson_date] : [],
          });
        }
      }

      // Convert to array with first/last dates
      const result: StudentCardData[] = [];
      studentMap.forEach((data, name) => {
        const sortedDates = data.dates.sort();
        result.push({
          name,
          transcriptCount: data.count,
          firstLesson: sortedDates[0] || null,
          lastLesson: sortedDates[sortedDates.length - 1] || null,
        });
      });

      // Sort by last lesson date (most recent first)
      result.sort((a, b) => {
        if (!a.lastLesson && !b.lastLesson) return 0;
        if (!a.lastLesson) return 1;
        if (!b.lastLesson) return -1;
        return b.lastLesson.localeCompare(a.lastLesson);
      });

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter and search
  const filteredStudents = useMemo(() => {
    if (!data) return [];

    let filtered = data;

    // Apply search
    if (search) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply filter
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (filter === 'active') {
      filtered = filtered.filter((s) => {
        if (!s.lastLesson) return false;
        return new Date(s.lastLesson) >= weekAgo;
      });
    } else if (filter === 'recent') {
      filtered = filtered.filter((s) => {
        if (!s.lastLesson) return false;
        const lastDate = new Date(s.lastLesson);
        return lastDate < weekAgo && lastDate >= monthAgo;
      });
    } else if (filter === 'inactive') {
      filtered = filtered.filter((s) => {
        if (!s.lastLesson) return true;
        return new Date(s.lastLesson) < monthAgo;
      });
    }

    return filtered;
  }, [data, search, filter]);

  // Stats
  const stats = useMemo(() => {
    if (!data) return { total: 0, active: 0, recent: 0, inactive: 0 };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let active = 0;
    let recent = 0;
    let inactive = 0;

    data.forEach((s) => {
      if (!s.lastLesson) {
        inactive++;
        return;
      }
      const lastDate = new Date(s.lastLesson);
      if (lastDate >= weekAgo) active++;
      else if (lastDate >= monthAgo) recent++;
      else inactive++;
    });

    return { total: data.length, active, recent, inactive };
  }, [data]);

  const handleStudentClick = (student: StudentCardData) => {
    // Navigate to student detail page
    navigate(`/teacher/student/${encodeURIComponent(student.name)}`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="p-4 pt-6 border-b">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">התלמידים שלי</h1>
            <p className="text-muted-foreground text-sm">
              {stats.total} תלמידים | {data?.reduce((sum, s) => sum + s.transcriptCount, 0) || 0} תמלולים
            </p>
          </div>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ms-2 ${isRefetching ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <Users className="h-5 w-5 mx-auto text-voicely-green mb-1" />
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">סה"כ</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <UserCheck className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">פעילים</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
              <p className="text-xl font-bold">{stats.recent}</p>
              <p className="text-xs text-muted-foreground">לאחרונה</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <UserX className="h-5 w-5 mx-auto text-red-400 mb-1" />
              <p className="text-xl font-bold">{stats.inactive}</p>
              <p className="text-xs text-muted-foreground">לא פעילים</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש תלמיד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pe-10"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              הכל ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1">
              פעילים ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1">
              לאחרונה ({stats.recent})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex-1">
              לא פעילים ({stats.inactive})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Student List */}
      <main className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>לא נמצאו תלמידים</p>
              {search && <p className="text-sm">נסה לחפש משהו אחר</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <StudentCard
                key={student.name}
                student={student}
                onClick={() => handleStudentClick(student)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          מציג {filteredStudents.length} מתוך {stats.total} תלמידים
        </div>
      </main>
    </div>
  );
};

export default MyStudents;
