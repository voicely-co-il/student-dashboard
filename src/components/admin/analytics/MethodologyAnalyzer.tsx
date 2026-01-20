import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  Loader2,
  RefreshCw,
  BookOpen,
  Sparkles,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMethodologyAnalysis } from '@/hooks/admin/useMethodologyAnalysis';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const MethodologyAnalyzer = () => {
  const { data, isLoading, error, refetch, isRefetching } = useMethodologyAnalysis();
  const [expandedPatterns, setExpandedPatterns] = useState<Set<number>>(new Set());

  const togglePattern = (index: number) => {
    const newExpanded = new Set(expandedPatterns);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPatterns(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-voicely-green mb-4" />
        <p className="text-muted-foreground">מנתח את שיטת ההוראה...</p>
        <p className="text-sm text-muted-foreground mt-2">זה עשוי לקחת מספר שניות</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive mb-4">שגיאה בניתוח השיטה</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 ms-2" />
          נסה שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-voicely-yellow" />
            שיטת ההוראה של ענבל
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            ניתוח AI של דפוסי הוראה מתוך {data?.analyzedTranscripts || 0} שיחות
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 ms-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'מנתח...' : 'נתח מחדש'}
        </Button>
      </div>

      {/* Lesson Structure */}
      <Card className="playful-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-voicely-green" />
            מבנה שיעור טיפוסי
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.lessonStructure?.map((phase, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{
                      backgroundColor: getPhaseColor(index),
                    }}
                  >
                    {index + 1}
                  </div>
                  {index < (data?.lessonStructure?.length || 0) - 1 && (
                    <div className="w-0.5 h-8 bg-muted mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{phase.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      ~{phase.duration}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                  {phase.techniques && phase.techniques.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {phase.techniques.map((technique, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Teaching Patterns */}
      <Card className="playful-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-voicely-orange" />
            דפוסי הוראה שזוהו
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.teachingPatterns?.map((pattern, index) => (
              <Collapsible
                key={index}
                open={expandedPatterns.has(index)}
                onOpenChange={() => togglePattern(index)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getPatternColor(index) }}
                      />
                      <span className="font-medium">{pattern.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {pattern.frequency}%
                      </Badge>
                    </div>
                    {expandedPatterns.has(index) ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 pt-2 space-y-3">
                    <p className="text-sm text-muted-foreground">{pattern.description}</p>
                    {pattern.examples && pattern.examples.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">דוגמאות:</p>
                        {pattern.examples.map((example, i) => (
                          <div
                            key={i}
                            className="text-sm p-2 rounded bg-background border-r-2 border-voicely-green/50"
                          >
                            "{example}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Techniques */}
      <Card className="playful-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-voicely-mint" />
            טכניקות נפוצות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data?.commonTechniques?.map((technique, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{technique.name}</span>
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${getPatternColor(index)}20`,
                      color: getPatternColor(index),
                    }}
                  >
                    {technique.count} פעמים
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{technique.context}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      {data?.keyInsights && data.keyInsights.length > 0 && (
        <Card className="playful-shadow border-voicely-green/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-voicely-yellow" />
              תובנות מפתח
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.keyInsights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ArrowLeft className="w-4 h-4 text-voicely-green mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper functions for colors
const PHASE_COLORS = [
  'hsl(158, 72%, 52%)', // green
  'hsl(158, 60%, 60%)', // mint
  'hsl(45, 90%, 55%)',  // yellow
  'hsl(24, 95%, 58%)',  // orange
  'hsl(12, 85%, 55%)',  // coral
];

const PATTERN_COLORS = [
  'hsl(158, 72%, 52%)',
  'hsl(45, 90%, 55%)',
  'hsl(24, 95%, 58%)',
  'hsl(200, 80%, 50%)',
  'hsl(280, 70%, 60%)',
  'hsl(340, 80%, 55%)',
];

const getPhaseColor = (index: number) => PHASE_COLORS[index % PHASE_COLORS.length];
const getPatternColor = (index: number) => PATTERN_COLORS[index % PATTERN_COLORS.length];

export default MethodologyAnalyzer;
