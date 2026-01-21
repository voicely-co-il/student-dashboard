import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Search, Loader2, FileText, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  transcript_id: string;
  transcript?: {
    id: string;
    title: string;
    lesson_date: string;
    student_id: string;
  };
}

const TeacherSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-transcripts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, limit: 20 }),
        }
      );

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.85) return 'bg-green-500';
    if (similarity >= 0.75) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">חיפוש חכם בתמלולים</h1>
          <p className="text-muted-foreground text-sm">
            חיפוש סמנטי מבוסס AI בכל השיעורים
          </p>
        </div>
      </div>

      {/* Search Box */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="חפשי משהו... למשל: תלמידים שהתקשו עם נשימה, טכניקת בלטינג, בעיות אינטונציה..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="mr-2">חיפוש</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 טיפ: החיפוש מבין משמעות, לא רק מילים. נסי לתאר מה את מחפשת במשפט טבעי.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-voicely-green mb-4" />
          <p className="text-muted-foreground">מחפש בתמלולים...</p>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">לא נמצאו תוצאות עבור "{query}"</p>
            <p className="text-sm text-muted-foreground mt-2">
              נסי לנסח אחרת או להשתמש במילים אחרות
            </p>
          </CardContent>
        </Card>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            נמצאו {results.length} תוצאות
          </p>
          {results.map((result, index) => (
            <Card key={result.id || index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base">
                      {result.transcript?.title || 'שיעור'}
                    </CardTitle>
                  </div>
                  <Badge className={`${getSimilarityColor(result.similarity)} text-white`}>
                    {Math.round(result.similarity * 100)}% התאמה
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {result.transcript?.lesson_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(result.transcript.lesson_date)}
                    </span>
                  )}
                  {result.transcript?.student_id && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {result.transcript.student_id}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-4">
                  {result.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">הזיני שאילתה כדי לחפש בתמלולים</p>
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">דוגמאות לחיפושים:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'תלמידים שהתקשו עם נשימה',
                  'טכניקת בלטינג',
                  'בעיות אינטונציה',
                  'שירים של עדן בן זקן',
                ].map((example) => (
                  <Badge
                    key={example}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      setQuery(example);
                    }}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherSearch;
