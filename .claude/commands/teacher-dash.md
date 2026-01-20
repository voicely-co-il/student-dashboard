# Teacher Dashboard Generator

Generate a teacher dashboard component for Voicely voice teaching management.

## Context

You are creating UI components for **Voicely Teacher Dashboard** - a comprehensive management interface where teachers track students, lessons, recordings, and progress.

## Supabase Schema (jldfxkbczzxawdqsznze)

### Core Tables for Teacher View:
```
users: id, email, name, avatar, role, level, teacher, notion_id, phone, age, is_active
user_stats: user_id, streak_days, practice_minutes_week, average_score, strong_areas, improvement_areas, lessons_this_week
user_progress: user_id, exercise_id, score, streak_count, best_score, total_attempts
groups: id, name, teacher_id, level, max_students, current_students, is_active
group_members: group_id, student_id, joined_at, is_active
lessons: id, teacher_id, group_id, lesson_type, title, scheduled_at, duration, status, google_drive_url
lesson_participants: lesson_id, student_id, attended, attendance_duration, notes
recordings: id, user_id, lesson_id, title, audio_url, duration, status
ai_analysis: recording_id, overall_score, pitch_accuracy, rhythm_timing, tonal_quality, feedback, recommendations
transcriptions: id, recording_id, transcript, language, speaker_labels
learning_insights: user_id, insight_type, title, description, confidence, is_pinned
analytics_events: user_id, event_type, event_data, timestamp
notion_sync_log: notion_id, supabase_id, sync_type, sync_status
```

### Enums:
- `user_role`: student, teacher, admin
- `lesson_type`: one_on_one, group
- `recording_status`: processing, processed, failed
- `achievement_type`: streak, score, completion, milestone, special
- `badge_rarity`: common, rare, epic, legendary

## Design System

### Colors (Tailwind classes):
- Primary Green: `bg-primary` / `text-primary` (HSL 158 72% 52%)
- Accent Orange: `bg-accent` / `text-accent` (HSL 24 95% 58%)
- Mint: `bg-voicely-mint` (HSL 158 60% 70%)
- Yellow: `bg-voicely-yellow` (HSL 45 90% 55%)
- Red: `bg-voicely-red` (HSL 0 74% 60%)
- Charcoal: `text-voicely-charcoal`

### Custom Classes:
- `playful-shadow` - green-tinted shadow for cards
- `playful-shadow-accent` - orange-tinted shadow
- `glass-effect` - frosted glass effect

### Typography:
- Font: Assistant (Hebrew-friendly)
- Direction: RTL

## Teacher Dashboard Features

### Student Management
- View all students with progress indicators
- Filter by level, group, activity status
- Quick actions: message, schedule lesson, view recordings

### Lesson Management
- Calendar view of scheduled lessons
- Create one-on-one or group lessons
- Mark attendance, add notes
- Link to Google Drive recordings

### Progress Tracking
- Student progress charts
- AI analysis summaries
- Learning insights with recommendations
- Streak and practice tracking

### Group Management
- Create and manage groups
- Assign students to groups
- Group lesson scheduling

## Instructions

When asked to create a teacher dashboard component:

1. **Use existing UI components** from `src/components/ui/` (shadcn)
2. **Follow RTL layout** - use `text-right`, `flex-row-reverse` where needed
3. **Use Hebrew text** for all labels
4. **Connect to Supabase** using `@/integrations/supabase/client`
5. **Use React Query** for data fetching with `@tanstack/react-query`
6. **Desktop-first design** - teacher dashboard is typically used on larger screens
7. **Include filters and search** - teachers manage multiple students

## Example Component Structure

```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function StudentsListCard() {
  const [search, setSearch] = useState("");

  const { data: students, isLoading } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select(`
          *,
          user_stats(*),
          user_progress(*)
        `)
        .eq("role", "student")
        .order("name");
      return data;
    },
  });

  const filtered = students?.filter(s =>
    s.name?.includes(search) || s.email?.includes(search)
  );

  return (
    <Card className="playful-shadow">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-right">התלמידים שלי</CardTitle>
        <Input
          placeholder="חיפוש..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">רמה</TableHead>
              <TableHead className="text-right">ציון ממוצע</TableHead>
              <TableHead className="text-right">רצף</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered?.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="text-right font-medium">{student.name}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{student.level}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {student.user_stats?.[0]?.average_score ?? '-'}
                </TableCell>
                <TableCell className="text-right">
                  {student.user_stats?.[0]?.streak_days ?? 0} ימים
                </TableCell>
                <TableCell className="text-right">
                  {/* Action buttons */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

## Common Teacher Views to Generate

1. **Students Overview** - List of all students with stats
2. **Lesson Calendar** - Weekly/monthly lesson schedule
3. **Student Detail** - Individual student progress page
4. **Group Management** - Groups with members
5. **Recordings Review** - Listen and provide feedback
6. **AI Insights** - Learning recommendations per student
7. **Analytics Dashboard** - Practice trends, engagement metrics

## What to Generate

Based on the user's request, generate:
1. The React component with TypeScript
2. Proper Supabase queries with joins
3. Hebrew labels
4. Desktop-responsive design with tables/grids
5. Loading, error, and empty states
6. Search and filter capabilities where appropriate
