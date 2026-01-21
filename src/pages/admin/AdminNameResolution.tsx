import { useState, useMemo, useCallback } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Search,
  Tags,
  Check,
  X,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Undo2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useStudentNameMappings,
  useMappingStats,
  useMappingHistory,
  useApproveMapping,
  useRejectMapping,
  useUndoMapping,
  StudentNameMapping,
} from '@/hooks/admin/useStudentNameMappings';
import { useNotionCRMStudents, CRMStudent } from '@/hooks/admin/useNotionCRMStudents';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'auto_matched';
type SortKey = 'original_name' | 'transcript_count' | 'status';
type SortDir = 'asc' | 'desc';

// Status configuration
const STATUS_CONFIG = {
  pending: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-100', label: 'ממתין' },
  approved: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100', label: 'מאושר' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'נדחה' },
  auto_matched: { icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-100', label: 'אוטומטי' },
};

const AdminNameResolution = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [sortKey, setSortKey] = useState<SortKey>('transcript_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  // Data hooks
  const { data: mappings, isLoading, refetch, isRefetching } = useStudentNameMappings();
  const stats = useMappingStats();
  const { data: history } = useMappingHistory(5);
  const { data: crmData, isLoading: crmLoading } = useNotionCRMStudents();

  // Mutations
  const approveMapping = useApproveMapping();
  const rejectMapping = useRejectMapping();
  const undoMapping = useUndoMapping();

  // CRM students list for suggestions
  const crmStudents = crmData?.students || [];

  // Find CRM suggestions for a name
  const findCRMSuggestions = useCallback((originalName: string): CRMStudent[] => {
    if (!crmStudents.length) return [];

    const normalized = originalName.toLowerCase().replace(/[^a-zא-ת0-9\s]/g, '').trim();
    const firstName = normalized.split(' ')[0];

    return crmStudents
      .map(student => {
        const studentNorm = student.name.toLowerCase().replace(/[^a-zא-ת0-9\s]/g, '').trim();
        const studentFirst = studentNorm.split(' ')[0];

        let score = 0;
        if (studentNorm === normalized) score = 100;
        else if (studentNorm.startsWith(normalized)) score = 80;
        else if (studentFirst === firstName && firstName.length >= 3) score = 70;
        else if (studentNorm.includes(normalized)) score = 50;
        else if (studentFirst.startsWith(firstName) && firstName.length >= 2) score = 40;

        if (student.isActive && score > 0) score += 10;

        return { student, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.student);
  }, [crmStudents]);

  // Filter and sort
  const filteredData = useMemo(() => {
    if (!mappings) return [];

    let filtered = mappings.filter(m => {
      // Status filter
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          m.original_name.toLowerCase().includes(searchLower) ||
          m.resolved_name?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'original_name') {
        cmp = a.original_name.localeCompare(b.original_name, 'he');
      } else if (sortKey === 'transcript_count') {
        cmp = a.transcript_count - b.transcript_count;
      } else if (sortKey === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [mappings, search, statusFilter, sortKey, sortDir]);

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

  // Handle approve with name
  const handleApprove = async (mapping: StudentNameMapping, resolvedName: string) => {
    await approveMapping.mutateAsync({ id: mapping.id, resolved_name: resolvedName });
    setEditingId(null);
    setEditValue('');
    setOpenPopoverId(null);
  };

  // Handle reject
  const handleReject = async (mapping: StudentNameMapping) => {
    await rejectMapping.mutateAsync({ id: mapping.id });
  };

  // Handle undo
  const handleUndo = async () => {
    if (history && history.length > 0) {
      await undoMapping.mutateAsync(history[0].id);
    }
  };

  // Start editing
  const startEditing = (mapping: StudentNameMapping) => {
    setEditingId(mapping.id);
    setEditValue(mapping.resolved_name || mapping.original_name);
  };

  // Render status badge
  const renderStatus = (status: StudentNameMapping['status']) => {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
        <Icon className="h-3 w-3 ms-1" />
        {config.label}
      </Badge>
    );
  };

  // Render name cell with inline editing
  const renderNameCell = (mapping: StudentNameMapping) => {
    const suggestions = findCRMSuggestions(mapping.original_name);
    const isEditing = editingId === mapping.id;
    const isOpen = openPopoverId === mapping.id;

    if (mapping.status === 'rejected') {
      return (
        <span className="text-muted-foreground line-through">
          {mapping.original_name}
        </span>
      );
    }

    if (mapping.status === 'approved' || mapping.status === 'auto_matched') {
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium text-green-700">
            {mapping.resolved_name || mapping.original_name}
          </span>
          {mapping.resolved_name !== mapping.original_name && (
            <span className="text-xs text-muted-foreground">
              (מקור: {mapping.original_name})
            </span>
          )}
        </div>
      );
    }

    // Pending status - show editable field
    return (
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={(open) => setOpenPopoverId(open ? mapping.id : null)}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 justify-between min-w-[200px] text-right"
            >
              {isEditing ? editValue : (mapping.crm_match || mapping.original_name)}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="חפש או הקלד שם..."
                value={editValue}
                onValueChange={setEditValue}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2 text-center">
                    <p className="text-sm text-muted-foreground">לא נמצאו התאמות</p>
                    {editValue && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleApprove(mapping, editValue)}
                      >
                        <Check className="h-4 w-4 ms-1" />
                        שמור "{editValue}"
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
                {suggestions.length > 0 && (
                  <CommandGroup heading="הצעות מ-CRM">
                    {suggestions.map((student) => (
                      <CommandItem
                        key={student.id}
                        value={student.name}
                        onSelect={() => handleApprove(mapping, student.name)}
                        className="flex items-center justify-between"
                      >
                        <span>{student.name}</span>
                        {student.isActive && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                            פעיל
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandGroup heading="אפשרויות נוספות">
                  <CommandItem
                    value={mapping.original_name}
                    onSelect={() => handleApprove(mapping, mapping.original_name)}
                  >
                    <Check className="h-4 w-4 ms-2" />
                    השם נכון: {mapping.original_name}
                  </CommandItem>
                  <CommandItem
                    value="reject"
                    onSelect={() => handleReject(mapping)}
                    className="text-red-600"
                  >
                    <X className="h-4 w-4 ms-2" />
                    לא תלמיד - התעלם
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-7 w-7 text-voicely-green" />
            ניהול שמות תלמידים
          </h1>
          <p className="text-muted-foreground mt-1">
            תיקון והתאמת שמות מהתמלולים לשמות הנכונים
          </p>
        </div>
        <div className="flex items-center gap-2">
          {history && history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoMapping.isPending}
            >
              <Undo2 className="h-4 w-4 ms-2" />
              בטל אחרון
            </Button>
          )}
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="playful-shadow">
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto text-gray-500 mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">סה"כ שמות</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow cursor-pointer hover:bg-green-50" onClick={() => setStatusFilter('approved')}>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">מאושר</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow cursor-pointer hover:bg-yellow-50" onClick={() => setStatusFilter('pending')}>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">ממתין</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow cursor-pointer hover:bg-blue-50" onClick={() => setStatusFilter('auto_matched')}>
          <CardContent className="p-4 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats.auto_matched}</p>
            <p className="text-xs text-muted-foreground">אוטומטי</p>
          </CardContent>
        </Card>
        <Card className="playful-shadow cursor-pointer hover:bg-red-50" onClick={() => setStatusFilter('rejected')}>
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">נדחה</p>
          </CardContent>
        </Card>
      </div>

      {/* CRM Status */}
      {crmLoading && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          טוען נתוני CRM להצעות...
        </div>
      )}
      {crmData && (
        <div className="text-sm text-muted-foreground">
          {crmData.active} תלמידים פעילים ב-CRM (מתוך {crmData.total})
        </div>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg">רשימת שמות</CardTitle>
              <CardDescription>
                לחץ על שם כדי לתקן או לאשר
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pe-10 w-[200px]"
                />
              </div>
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="pending">ממתין</SelectItem>
                  <SelectItem value="approved">מאושר</SelectItem>
                  <SelectItem value="auto_matched">אוטומטי</SelectItem>
                  <SelectItem value="rejected">נדחה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {statusFilter === 'pending' ? (
                <>
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">מעולה! אין שמות ממתינים</p>
                  <p className="text-sm">כל השמות טופלו</p>
                </>
              ) : (
                <p>לא נמצאו תוצאות</p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('original_name')}
                    >
                      שם מקורי <SortIcon column="original_name" />
                    </TableHead>
                    <TableHead>שם מתוקן</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 text-center w-[100px]"
                      onClick={() => handleSort('transcript_count')}
                    >
                      תמלולים <SortIcon column="transcript_count" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 text-center w-[100px]"
                      onClick={() => handleSort('status')}
                    >
                      סטטוס <SortIcon column="status" />
                    </TableHead>
                    <TableHead className="w-[100px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((mapping) => (
                    <TableRow
                      key={mapping.id}
                      className={mapping.status === 'pending' ? 'bg-yellow-50/50' : ''}
                    >
                      <TableCell className="font-medium">
                        {mapping.original_name}
                      </TableCell>
                      <TableCell>
                        {renderNameCell(mapping)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {mapping.transcript_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {renderStatus(mapping.status)}
                      </TableCell>
                      <TableCell>
                        {mapping.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => handleApprove(mapping, mapping.original_name)}
                              title="אשר כפי שהוא"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={() => handleReject(mapping)}
                              title="לא תלמיד"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
            מציג {filteredData.length} מתוך {stats.total} שמות
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNameResolution;
