import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StudentTranscriptData {
  student_name: string;
  count: number;
  first_lesson: string;
  last_lesson: string;
}

type SortKey = 'student_name' | 'count' | 'last_lesson';
type SortDir = 'asc' | 'desc';

const StudentTranscriptsList = () => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Fetch all transcripts and aggregate by student
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['student-transcripts-list'],
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
            dates: t.lesson_date ? [t.lesson_date] : []
          });
        }
      }

      // Convert to array with first/last dates
      const result: StudentTranscriptData[] = [];
      studentMap.forEach((data, name) => {
        const sortedDates = data.dates.sort();
        result.push({
          student_name: name,
          count: data.count,
          first_lesson: sortedDates[0] || '',
          last_lesson: sortedDates[sortedDates.length - 1] || ''
        });
      });

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter and sort
  const filteredData = useMemo(() => {
    if (!data) return [];

    let filtered = data.filter(s =>
      s.student_name.toLowerCase().includes(search.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'student_name') {
        cmp = a.student_name.localeCompare(b.student_name, 'he');
      } else if (sortKey === 'count') {
        cmp = a.count - b.count;
      } else if (sortKey === 'last_lesson') {
        cmp = a.last_lesson.localeCompare(b.last_lesson);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [data, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ?
      <ChevronUp className="h-4 w-4 inline ms-1" /> :
      <ChevronDown className="h-4 w-4 inline ms-1" />;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Stats
  const totalStudents = data?.length || 0;
  const totalTranscripts = data?.reduce((sum, s) => sum + s.count, 0) || 0;
  const avgPerStudent = totalStudents > 0 ? Math.round(totalTranscripts / totalStudents) : 0;
  const activeThisMonth = data?.filter(s => {
    if (!s.last_lesson) return false;
    const lastDate = new Date(s.last_lesson);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return lastDate >= monthAgo;
  }).length || 0;

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        שגיאה בטעינת הנתונים
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-voicely-green mb-2" />
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">תלמידים בסה"כ</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{totalTranscripts}</p>
            <p className="text-xs text-muted-foreground">תמלולים</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-voicely-orange mb-2" />
            <p className="text-2xl font-bold">{avgPerStudent}</p>
            <p className="text-xs text-muted-foreground">ממוצע לתלמיד</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{activeThisMonth}</p>
            <p className="text-xs text-muted-foreground">פעילים החודש</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                רשימת תלמידים ותמלולים
              </CardTitle>
              <CardDescription>
                כל התלמידים שזוהו בתמלולים מ-Google Drive
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pe-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('student_name')}
                    >
                      שם התלמיד <SortIcon column="student_name" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 text-center"
                      onClick={() => handleSort('count')}
                    >
                      תמלולים <SortIcon column="count" />
                    </TableHead>
                    <TableHead>שיעור ראשון</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('last_lesson')}
                    >
                      שיעור אחרון <SortIcon column="last_lesson" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((student) => (
                    <TableRow key={student.student_name}>
                      <TableCell className="font-medium">
                        {student.student_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={student.count >= 20 ? 'default' : student.count >= 10 ? 'secondary' : 'outline'}
                          className={student.count >= 20 ? 'bg-voicely-green' : ''}
                        >
                          {student.count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(student.first_lesson)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(student.last_lesson)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Footer stats */}
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
            מציג {filteredData.length} מתוך {totalStudents} תלמידים
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentTranscriptsList;
