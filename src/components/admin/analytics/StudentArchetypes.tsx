import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Loader2,
  RefreshCw,
  User,
  Target,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStudentArchetypes } from '@/hooks/admin/useStudentArchetypes';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';

const ARCHETYPE_COLORS = [
  { bg: 'hsl(158, 72%, 52%)', light: 'hsl(158, 72%, 95%)' },  // green
  { bg: 'hsl(45, 90%, 55%)', light: 'hsl(45, 90%, 95%)' },    // yellow
  { bg: 'hsl(24, 95%, 58%)', light: 'hsl(24, 95%, 95%)' },    // orange
  { bg: 'hsl(200, 80%, 50%)', light: 'hsl(200, 80%, 95%)' },  // blue
  { bg: 'hsl(280, 70%, 60%)', light: 'hsl(280, 70%, 95%)' },  // purple
  { bg: 'hsl(340, 80%, 55%)', light: 'hsl(340, 80%, 95%)' },  // pink
];

const StudentArchetypes = () => {
  const { data, isLoading, error, refetch, isRefetching } = useStudentArchetypes();
  const [expandedArchetype, setExpandedArchetype] = useState<number | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<number>(0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-voicely-green mb-4" />
        <p className="text-muted-foreground">מנתח ארכיטיפי תלמידים...</p>
        <p className="text-sm text-muted-foreground mt-2">מקבץ תלמידים לפי מאפיינים משותפים</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-destructive mb-4">שגיאה בניתוח הארכיטיפים</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 ms-2" />
          נסה שוב
        </Button>
      </div>
    );
  }

  const archetypes = data?.archetypes || [];
  const selectedData = archetypes[selectedArchetype];

  // Prepare radar chart data
  const radarData = selectedData?.traits?.map((trait) => ({
    trait: trait.name,
    value: trait.score,
    fullMark: 100,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-voicely-mint" />
            ארכיטיפי תלמידים
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            זוהו {archetypes.length} סוגי תלמידים מתוך {data?.totalStudents || 0} תלמידים
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

      {/* Archetype Distribution Overview */}
      <Card className="playful-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">התפלגות הארכיטיפים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {archetypes.map((archetype, index) => {
              const color = ARCHETYPE_COLORS[index % ARCHETYPE_COLORS.length];
              const percentage = data?.totalStudents
                ? Math.round((archetype.studentCount / data.totalStudents) * 100)
                : 0;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color.bg }}
                      />
                      <span className="font-medium">{archetype.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {archetype.studentCount} תלמידים ({percentage}%)
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2"
                    style={{
                      ['--progress-background' as string]: color.bg,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Archetype Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {archetypes.map((archetype, index) => {
          const color = ARCHETYPE_COLORS[index % ARCHETYPE_COLORS.length];
          const isExpanded = expandedArchetype === index;

          return (
            <Collapsible
              key={index}
              open={isExpanded}
              onOpenChange={() => setExpandedArchetype(isExpanded ? null : index)}
            >
              <Card
                className="playful-shadow cursor-pointer transition-all hover:shadow-lg"
                style={{
                  borderColor: isExpanded ? color.bg : 'transparent',
                  borderWidth: '2px',
                }}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: color.light }}
                        >
                          <User className="w-6 h-6" style={{ color: color.bg }} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{archetype.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {archetype.studentCount} תלמידים
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3">
                    {archetype.description}
                  </p>

                  <CollapsibleContent>
                    <div className="space-y-4 pt-3 border-t">
                      {/* Characteristics */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" style={{ color: color.bg }} />
                          מאפיינים
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {archetype.characteristics?.map((char, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              style={{
                                backgroundColor: color.light,
                                color: color.bg,
                              }}
                            >
                              {char}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Common Challenges */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-voicely-orange" />
                          אתגרים נפוצים
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {archetype.challenges?.map((challenge, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-voicely-orange">•</span>
                              {challenge}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommended Approach */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-voicely-yellow" />
                          גישה מומלצת
                        </h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {archetype.recommendedApproach}
                        </p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Radar Chart Comparison */}
      {archetypes.length > 0 && archetypes[0]?.traits && (
        <Card className="playful-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">השוואת מאפיינים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {archetypes.map((archetype, index) => (
                <Button
                  key={index}
                  variant={selectedArchetype === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedArchetype(index)}
                  style={
                    selectedArchetype === index
                      ? {
                          backgroundColor: ARCHETYPE_COLORS[index % ARCHETYPE_COLORS.length].bg,
                        }
                      : {}
                  }
                >
                  {archetype.name}
                </Button>
              ))}
            </div>

            <div className="h-[300px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11 }} />
                  <Radar
                    name={selectedData?.name}
                    dataKey="value"
                    stroke={ARCHETYPE_COLORS[selectedArchetype % ARCHETYPE_COLORS.length].bg}
                    fill={ARCHETYPE_COLORS[selectedArchetype % ARCHETYPE_COLORS.length].bg}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentArchetypes;
