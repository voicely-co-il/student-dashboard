import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FlaskConical,
  Lightbulb,
  Archive,
  RefreshCw,
  Rss,
  ExternalLink,
  Clock,
  TrendingUp,
  Search,
  Star,
  Sparkles,
  Eye,
  Mic,
  LayoutGrid,
  List,
  Kanban,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// Components
import { HotFeatureBanner, HotFeature } from '@/components/ai-lab/HotFeatureBanner';
import { FeatureKanban, KanbanFeature } from '@/components/ai-lab/FeatureKanban';
import { FeatureTimeline, TimelineFeature } from '@/components/ai-lab/FeatureTimeline';
import { LiveAssistantTab } from '@/components/live-assistant/LiveAssistantTab';

// Types
interface IdeaItem {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  source_date: string | null;
  category: string;
  tags: string[];
  ice_score: number | null;
  status: string;
  featured: boolean;
  ai_summary: string | null;
  ai_relevance_score: number | null;
  ai_relevance_reason: string | null;
  reading_time_min: number | null;
  view_count: number;
  created_at: string;
  source_name: string | null;
  source_type: string | null;
}

interface InspirationSource {
  id: string;
  name: string;
  type: string;
  url: string | null;
  rss_url: string | null;
  fetch_enabled: boolean;
  last_fetched_at: string | null;
  last_fetch_error: string | null;
  relevance_score: number | null;
  tags: string[];
}

// Category colors
const categoryConfig: Record<string, { color: string; label: string }> = {
  voice_ai: { color: 'bg-purple-100 text-purple-800', label: 'קול AI' },
  vision_ai: { color: 'bg-blue-100 text-blue-800', label: 'ראייה AI' },
  content_ai: { color: 'bg-green-100 text-green-800', label: 'תוכן AI' },
  analytics: { color: 'bg-orange-100 text-orange-800', label: 'אנליטיקס' },
  other: { color: 'bg-gray-100 text-gray-800', label: 'אחר' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  new: { color: 'bg-blue-100 text-blue-800', label: 'חדש' },
  evaluating: { color: 'bg-yellow-100 text-yellow-800', label: 'בבדיקה' },
  approved: { color: 'bg-green-100 text-green-800', label: 'אושר' },
  rejected: { color: 'bg-red-100 text-red-800', label: 'נדחה' },
  converted: { color: 'bg-purple-100 text-purple-800', label: 'הומר לניסוי' },
};

// Hardcoded features in development (will be from DB later)
const developmentFeatures: KanbanFeature[] = [
  {
    id: 'live-assistant',
    name: 'עוזר שיעור חי',
    description: 'תמלול שיעורים בזמן אמת עם טיפים למורה',
    icon: <Mic className="w-4 h-4 text-amber-500" />,
    stage: 'beta',
    progress: 75,
    startedAt: new Date('2025-01-28'), // התחיל היום
    tags: ['Soniox', 'STT', 'עברית'],
    isHot: true,
  },
  {
    id: 'qwen3-tts',
    name: 'Qwen3-TTS',
    description: 'יצירת קול מלאכותי לתרגולים',
    icon: <Sparkles className="w-4 h-4 text-blue-500" />,
    stage: 'research',
    progress: 15,
    startedAt: new Date('2025-01-28'), // התחיל היום - רק מחקר ראשוני
    tags: ['TTS', 'Open Source'],
  },
  {
    id: 'video-gen',
    name: 'יוצר סרטונים',
    description: 'יצירת סרטוני לימוד אוטומטיים',
    icon: <Eye className="w-4 h-4 text-purple-500" />,
    stage: 'research',
    progress: 10,
    startedAt: new Date('2025-01-28'), // התחיל היום - רק מחקר ראשוני
    tags: ['Video', 'HeyGen'],
  },
  {
    id: 'teacher-chat',
    name: 'צ\'אט מורה',
    description: 'עוזר AI אישי למורים',
    icon: <Lightbulb className="w-4 h-4 text-green-500" />,
    stage: 'live',
    progress: 100,
    startedAt: new Date('2025-01-15'), // התחיל לפני כשבועיים
    tags: ['RAG', 'Claude'],
  },
];

const timelineFeatures: TimelineFeature[] = [
  {
    id: 'live-assistant',
    name: 'עוזר שיעור חי',
    stage: 'beta',
    startedAt: new Date('2025-01-28'), // התחיל היום
    targetDate: new Date('2025-02-15'),
    isHot: true,
    milestones: [
      { name: 'POC - תמלול בסיסי', date: new Date('2025-01-28'), completed: true },
      { name: 'מגבלות בטא', date: new Date('2025-01-28'), completed: true },
      { name: 'UI במעבדה', date: new Date('2025-01-28'), completed: true },
      { name: 'טיפים AI', date: new Date('2025-02-05'), completed: false },
      { name: 'שחרור למורים', date: new Date('2025-02-15'), completed: false },
    ],
  },
  {
    id: 'teacher-chat',
    name: 'צ\'אט מורה',
    stage: 'live',
    startedAt: new Date('2025-01-15'), // התחיל לפני כשבועיים
  },
];

// Components
const IdeaCard = ({ idea, onView }: { idea: IdeaItem; onView: () => void }) => {
  const category = categoryConfig[idea.category] || categoryConfig.other;
  const status = statusConfig[idea.status] || statusConfig.new;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onView}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {idea.featured && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
              <Badge variant="secondary" className={category.color}>
                {category.label}
              </Badge>
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
            </div>
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {idea.title}
            </CardTitle>
          </div>
          {idea.ai_relevance_score && (
            <div className="flex flex-col items-center">
              <div
                className={`text-2xl font-bold ${
                  idea.ai_relevance_score >= 80 ? 'text-green-600' :
                  idea.ai_relevance_score >= 60 ? 'text-yellow-600' :
                  'text-gray-400'
                }`}
              >
                {idea.ai_relevance_score}
              </div>
              <span className="text-xs text-muted-foreground">רלוונטיות</span>
            </div>
          )}
        </div>
        {idea.source_name && (
          <CardDescription className="flex items-center gap-1 text-xs">
            <span>{idea.source_name}</span>
            {idea.source_date && (
              <>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(idea.source_date), { addSuffix: true, locale: he })}</span>
              </>
            )}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {idea.ai_summary ? (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {idea.ai_summary}
          </p>
        ) : idea.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {idea.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {idea.reading_time_min && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {idea.reading_time_min} דק׳
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {idea.view_count}
            </span>
          </div>
          {idea.source_url && (
            <a
              href={idea.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
              קרא עוד
            </a>
          )}
        </div>

        {idea.tags && idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {idea.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {idea.tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{idea.tags.length - 4}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SourceCard = ({ source }: { source: InspirationSource }) => {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              source.fetch_enabled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Rss className={`w-5 h-5 ${source.fetch_enabled ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="font-medium">{source.name}</h3>
              <p className="text-xs text-muted-foreground">{source.type}</p>
            </div>
          </div>
          <div className="text-left">
            {source.relevance_score && (
              <Badge variant="secondary">{source.relevance_score}/10</Badge>
            )}
          </div>
        </div>

        {source.last_fetched_at && (
          <p className="text-xs text-muted-foreground mt-2">
            עודכן לאחרונה: {formatDistanceToNow(new Date(source.last_fetched_at), { addSuffix: true, locale: he })}
          </p>
        )}

        {source.last_fetch_error && (
          <p className="text-xs text-red-500 mt-1">
            שגיאה: {source.last_fetch_error}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const AdminAILab = () => {
  const [activeTab, setActiveTab] = useState('development');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline'>('kanban');
  const [showLiveAssistant, setShowLiveAssistant] = useState(false);
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Fetch ideas
  const { data: ideas, isLoading: ideasLoading } = useQuery({
    queryKey: ['ai-lab-ideas', categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('ideas_backlog')
        .select(`
          *,
          inspiration_sources (
            name,
            type
          )
        `)
        .neq('status', 'rejected')
        .order('featured', { ascending: false })
        .order('ai_relevance_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.map(item => ({
        ...item,
        source_name: item.inspiration_sources?.name,
        source_type: item.inspiration_sources?.type,
      })) as IdeaItem[];
    },
  });

  // Fetch sources
  const { data: sources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['ai-lab-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspiration_sources')
        .select('*')
        .order('relevance_score', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as InspirationSource[];
    },
  });

  // Fetch RSS mutation
  const fetchRSSMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-inspiration-rss');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-lab-ideas'] });
      queryClient.invalidateQueries({ queryKey: ['ai-lab-sources'] });
      toast.success(`נמשכו ${data.results?.reduce((acc: number, r: any) => acc + r.items_added, 0) || 0} פריטים חדשים`);
    },
    onError: (error) => {
      toast.error(`שגיאה במשיכת RSS: ${error.message}`);
    },
  });

  // Hot feature for banner
  const hotFeature: HotFeature = {
    id: 'live-assistant',
    name: 'עוזר שיעור חי',
    description: 'תמלול שיעורים בזמן אמת עם Soniox + טיפים AI למורה',
    icon: <Mic className="w-6 h-6 text-amber-500" />,
    stage: 'beta',
    progress: 75,
    startedAt: new Date('2025-01-28'), // התחיל היום
    targetDate: new Date('2025-02-15'),
    assignees: ['אילי'],
    tags: ['Soniox', 'STT', 'Hebrew'],
    onOpen: () => setShowLiveAssistant(true),
  };

  // Stats
  const stats = {
    total: ideas?.length || 0,
    new: ideas?.filter(i => i.status === 'new').length || 0,
    highRelevance: ideas?.filter(i => (i.ai_relevance_score || 0) >= 80).length || 0,
    sources: sources?.filter(s => s.fetch_enabled).length || 0,
    inDevelopment: developmentFeatures.filter(f => f.stage !== 'live').length,
  };

  // Filter ideas by search
  const filteredIdeas = ideas?.filter(idea =>
    !searchQuery ||
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'development', label: 'בפיתוח', icon: FlaskConical, count: stats.inDevelopment },
    { id: 'ideas', label: 'רעיונות', icon: Lightbulb, count: stats.total },
    { id: 'sources', label: 'מקורות', icon: Rss, count: stats.sources },
    { id: 'archive', label: 'ארכיון', icon: Archive },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-purple-600" />
              Voicely AI Lab
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              מעבדה לבדיקת כלי AI חדשים
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRSSMutation.mutate()}
            disabled={fetchRSSMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 ms-2 ${fetchRSSMutation.isPending ? 'animate-spin' : ''}`} />
            {fetchRSSMutation.isPending ? 'מושך...' : 'משוך RSS'}
          </Button>
        </div>

        {/* Hot Feature Banner */}
        <div className="mb-6">
          <HotFeatureBanner
            feature={hotFeature}
            expanded={bannerExpanded}
            onToggleExpand={() => setBannerExpanded(!bannerExpanded)}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inDevelopment}</p>
                <p className="text-xs text-muted-foreground">בפיתוח</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">רעיונות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.new}</p>
                <p className="text-xs text-muted-foreground">חדשים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.highRelevance}</p>
                <p className="text-xs text-muted-foreground">רלוונטיות גבוהה</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Rss className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sources}</p>
                <p className="text-xs text-muted-foreground">מקורות</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 rounded-lg transition-all"
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Development Tab */}
          <TabsContent value="development" className="mt-0">
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">פיצ'רים בפיתוח</h2>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="gap-2"
                >
                  <Kanban className="w-4 h-4" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="gap-2"
                >
                  <List className="w-4 h-4" />
                  Timeline
                </Button>
              </div>
            </div>

            {viewMode === 'kanban' ? (
              <FeatureKanban
                features={developmentFeatures}
                onFeatureClick={(feature) => {
                  if (feature.id === 'live-assistant') {
                    setShowLiveAssistant(true);
                  }
                }}
              />
            ) : (
              <FeatureTimeline features={timelineFeatures} />
            )}
          </TabsContent>

          {/* Ideas Tab */}
          <TabsContent value="ideas" className="mt-0">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש רעיונות..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={categoryFilter === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(null)}
                >
                  הכל
                </Button>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <Button
                    key={key}
                    variant={categoryFilter === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(key)}
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Ideas Grid */}
            {ideasLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredIdeas && filteredIdeas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredIdeas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onView={() => {
                      supabase.rpc('increment_idea_view', { idea_id: idea.id });
                      if (idea.source_url) {
                        window.open(idea.source_url, '_blank');
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">אין רעיונות עדיין</h3>
                <p className="text-muted-foreground mb-4">
                  לחץ על "משוך RSS" כדי להתחיל לאסוף רעיונות ממקורות ההשראה
                </p>
                <Button onClick={() => fetchRSSMutation.mutate()} disabled={fetchRSSMutation.isPending}>
                  <Rss className="w-4 h-4 ms-2" />
                  משוך עכשיו
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="mt-0">
            {sourcesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sources && sources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sources.map((source) => (
                  <SourceCard key={source.id} source={source} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Rss className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">אין מקורות מוגדרים</h3>
                <p className="text-muted-foreground">
                  הוסף מקורות השראה ל-inspiration_sources table
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Archive Tab */}
          <TabsContent value="archive" className="mt-0">
            <Card className="p-12 text-center">
              <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">ארכיון</h3>
              <p className="text-muted-foreground">
                ניסויים שהסתיימו ותובנות שנלמדו
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Live Assistant Dialog */}
        <Dialog open={showLiveAssistant} onOpenChange={setShowLiveAssistant}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-amber-500" />
                עוזר שיעור חי - בטא
              </DialogTitle>
            </DialogHeader>
            <LiveAssistantTab />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminAILab;
