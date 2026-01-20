# Student Dashboard Generator

Generate state-of-the-art student dashboard components for Voicely voice learning app.

## Context

You are creating UI components for **Voicely Student Dashboard** - a mobile-first app where voice students track their progress, practice, and achievements. Design should match the quality of apps like **Duolingo**, **Apple Fitness**, and **Notion**.

---

## State-of-the-Art Design Trends (2025-2026)

### 1. Bento Grid Layouts
Modern dashboards use **Bento Box layouts** - modular, self-contained cards of varying sizes that create visual hierarchy.
```
┌─────────────┬───────┐
│   Large     │ Small │
│   Hero      ├───────┤
│   Card      │ Small │
├──────┬──────┴───────┤
│ Med  │    Medium    │
└──────┴──────────────┘
```
- Larger tiles = priority content (voice score, streak)
- Smaller tiles = supporting metrics
- Use `grid-cols-2` with `col-span-2` for hero cards

### 2. Glassmorphism
Frosted glass effects with backdrop blur - popularized by Apple's "Liquid Glass" design.
```tsx
className="backdrop-blur-xl bg-white/70 border border-white/20 shadow-xl"
```

### 3. Progress Rings (Apple Fitness Style)
Circular progress indicators instead of linear bars:
- Use **Recharts RadialBarChart** or custom SVG rings
- Multiple concentric rings for different metrics
- Animate on mount with spring physics

### 4. Streak System (Duolingo Style)
Streaks increase retention by 60%:
- 🔥 Flame icon with day count
- Visual evolution based on streak length
- "Streak Freeze" protection option
- Home screen widget design
- Celebrate milestones (7, 30, 100, 365 days)

### 5. Micro-interactions & Animations
Every interaction should feel alive:
```tsx
// Framer Motion spring animation
<motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 300 }}
>
```
- Confetti on achievements
- Number counting animations
- Haptic feedback on mobile
- Pull-to-refresh with custom animation

### 6. Gamification Elements
Based on Duolingo's $14B success:
- **XP Points** for completed exercises
- **Levels** with unlock animations
- **Badges** with rarity (common → legendary)
- **Leaderboards** for social competition
- **Daily quests** with rewards

### 7. Dark Mode
Not optional - expected by users in 2025:
- OLED-friendly true blacks
- Reduced eye strain
- Toggle in settings or auto-detect

### 8. AI-Powered Personalization
Show intelligent insights:
- "You're 40% better at breathing exercises"
- "Best practice time: 7-8 PM"
- "Suggested: Work on pitch accuracy"

---

## Supabase Schema (jldfxkbczzxawdqsznze)

### Core Tables for Student View:
```sql
users: id, email, name, avatar, role, level, teacher, notion_id
user_progress: user_id, exercise_id, score, streak_count, best_score, average_score
user_stats: user_id, streak_days, practice_minutes_week, average_score, strong_areas, improvement_areas
user_achievements: user_id, achievement_id, earned_at, progress_data
achievements: id, name, description, type, badge_rarity, icon, points
recordings: id, user_id, title, audio_url, duration, status
ai_analysis: recording_id, overall_score, pitch_accuracy, rhythm_timing, tonal_quality, emotional_expression, feedback
lessons: id, teacher_id, lesson_type, title, scheduled_at, duration, status
lesson_participants: lesson_id, student_id, attended, notes
vocal_exercises: id, title, category, difficulty_level, duration_minutes, instructions
learning_insights: user_id, insight_type, title, description, confidence
```

### Enums:
- `achievement_type`: streak, score, completion, milestone, special
- `badge_rarity`: common, rare, epic, legendary
- `recording_status`: processing, processed, failed

---

## Voicely Design System

### Colors (CSS Variables):
```css
--voicely-green: 158 72% 52%    /* Primary - success, progress */
--voicely-mint: 158 60% 70%      /* Secondary - backgrounds */
--voicely-orange: 24 95% 58%     /* Accent - CTAs, highlights */
--voicely-coral: 12 85% 55%      /* Warm accent */
--voicely-yellow: 45 90% 55%     /* Rewards, stars */
--voicely-red: 0 74% 60%         /* Errors, alerts */
```

### Badge Rarity Colors:
```tsx
const rarityColors = {
  common: "bg-gray-100 text-gray-600 border-gray-300",
  rare: "bg-blue-100 text-blue-600 border-blue-300",
  epic: "bg-purple-100 text-purple-600 border-purple-300",
  legendary: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
};
```

### Shadows:
```css
.playful-shadow      /* Green-tinted soft shadow */
.playful-shadow-accent /* Orange-tinted shadow */
.glass-effect        /* Glassmorphism */
```

### Typography:
- Font: **Assistant** (Hebrew-optimized)
- Direction: **RTL**
- Headlines: `text-2xl font-bold`
- Body: `text-base`
- Captions: `text-sm text-muted-foreground`

---

## Component Patterns

### Hero Score Card (Bento Large)
```tsx
<Card className="col-span-2 bg-gradient-to-br from-primary/10 to-mint/20 playful-shadow">
  <CardContent className="flex items-center justify-between p-6">
    <div>
      <p className="text-sm text-muted-foreground">הציון שלי</p>
      <motion.p
        className="text-5xl font-bold text-primary"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        {score}
      </motion.p>
    </div>
    <RadialProgress value={score} max={100} />
  </CardContent>
</Card>
```

### Streak Card (Duolingo Style)
```tsx
<Card className="playful-shadow-accent">
  <CardContent className="text-center p-6">
    <motion.div
      className="text-4xl"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      🔥
    </motion.div>
    <p className="text-3xl font-bold">{streakDays}</p>
    <p className="text-sm text-muted-foreground">ימים ברצף</p>
  </CardContent>
</Card>
```

### Achievement Badge
```tsx
<motion.div
  whileHover={{ scale: 1.05, rotate: 5 }}
  className={cn(
    "rounded-full p-3 border-2",
    rarityColors[badge.rarity]
  )}
>
  <span className="text-2xl">{badge.icon}</span>
</motion.div>
```

### Progress Ring (Apple Style)
```tsx
<svg viewBox="0 0 100 100" className="w-24 h-24">
  {/* Background ring */}
  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
  {/* Progress ring */}
  <motion.circle
    cx="50" cy="50" r="40"
    fill="none"
    stroke="hsl(var(--primary))"
    strokeWidth="8"
    strokeLinecap="round"
    strokeDasharray={circumference}
    initial={{ strokeDashoffset: circumference }}
    animate={{ strokeDashoffset: circumference * (1 - progress) }}
    transform="rotate(-90 50 50)"
  />
</svg>
```

---

## Mobile-First Patterns

### Bottom Sheet
```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button>פתח</Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="rounded-t-3xl">
    {/* Content */}
  </SheetContent>
</Sheet>
```

### Pull to Refresh
```tsx
const [isRefreshing, setIsRefreshing] = useState(false);
// Use touch events or a library like react-pull-to-refresh
```

### Haptic Feedback (if supported)
```tsx
const haptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};
```

---

## Required Animations (Framer Motion)

Install if not present:
```bash
npm install framer-motion
```

### Common Animations:
```tsx
// Stagger children
<motion.div
  variants={{
    show: { transition: { staggerChildren: 0.1 } }
  }}
  initial="hidden"
  animate="show"
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
      }}
    />
  ))}
</motion.div>

// Number counter
<motion.span
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  key={value}
>
  {value}
</motion.span>
```

---

## Data Fetching Pattern

```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStudentStats(userId: string) {
  return useQuery({
    queryKey: ["student-stats", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
```

---

## What to Generate

When asked to create a component:

1. **Use Bento Grid layout** for dashboards
2. **Add Framer Motion animations** for all interactive elements
3. **Include loading skeletons** (not spinners)
4. **Hebrew labels** with RTL layout
5. **Mobile-first** with touch-friendly targets (min 44px)
6. **Glassmorphism** for elevated cards
7. **Progress rings** instead of linear bars where applicable
8. **Gamification elements** (XP, badges, streaks)
9. **Dark mode support** via CSS variables

---

## Sources & Inspiration

- [Duolingo Gamification Secrets](https://www.orizon.co/blog/duolingos-gamification-secrets)
- [Apple Activity Rings Guidelines](https://developer.apple.com/design/human-interface-guidelines/activity-rings)
- [Bento Grid Examples](https://bentogrids.com)
- [Mobile App Design Trends 2026](https://uxpilot.ai/blogs/mobile-app-design-trends)
- [Education App Design Trends 2025](https://lollypop.design/blog/2025/august/top-education-app-design-trends-2025/)
