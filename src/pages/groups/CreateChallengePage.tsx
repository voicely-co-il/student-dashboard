import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  Trophy,
  Music,
  Clock,
  Settings,
  Eye,
  Save,
  Loader2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateChallenge } from '@/hooks/groups';
import { LeaderboardMode } from '@/types/groups';

// =====================================================
// CREATE CHALLENGE PAGE
// =====================================================

interface FormData {
  title_he: string;
  description_he: string;
  song_title: string;
  song_artist: string;
  lyrics_he: string;
  duration_min: number;
  duration_max: number;
  max_attempts: number;
  min_pitch_accuracy: number;
  min_energy_level: number;
  leaderboard_mode: LeaderboardMode;
  allow_comments: boolean;
  show_scores_publicly: boolean;
  starts_at: string;
  ends_at: string;
  prize_first: number;
  prize_second: number;
  prize_third: number;
  prize_participation: number;
}

const defaultFormData: FormData = {
  title_he: '',
  description_he: '',
  song_title: '',
  song_artist: '',
  lyrics_he: '',
  duration_min: 30,
  duration_max: 60,
  max_attempts: 3,
  min_pitch_accuracy: 70,
  min_energy_level: 60,
  leaderboard_mode: 'full',
  allow_comments: true,
  show_scores_publicly: true,
  starts_at: '',
  ends_at: '',
  prize_first: 100,
  prize_second: 75,
  prize_third: 50,
  prize_participation: 25,
};

export default function CreateChallengePage() {
  const navigate = useNavigate();
  const createChallenge = useCreateChallenge();

  const [form, setForm] = useState<FormData>(() => {
    // Set default dates
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week later

    return {
      ...defaultFormData,
      starts_at: startDate.toISOString().slice(0, 16),
      ends_at: endDate.toISOString().slice(0, 16),
    };
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = (key: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error when field is updated
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!form.title_he.trim()) newErrors.title_he = 'שם האתגר נדרש';
    if (!form.song_title.trim()) newErrors.song_title = 'שם השיר נדרש';
    if (!form.starts_at) newErrors.starts_at = 'תאריך התחלה נדרש';
    if (!form.ends_at) newErrors.ends_at = 'תאריך סיום נדרש';

    if (form.starts_at && form.ends_at) {
      const start = new Date(form.starts_at);
      const end = new Date(form.ends_at);
      if (end <= start) {
        newErrors.ends_at = 'תאריך סיום חייב להיות אחרי תאריך ההתחלה';
      }
    }

    if (form.duration_min >= form.duration_max) {
      newErrors.duration_max = 'משך מקסימלי חייב להיות גדול מהמינימלי';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (asDraft: boolean = true) => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await createChallenge.mutateAsync({
        group_id: 'group-diamonds', // TODO: Get from context
        title: form.title_he,
        title_he: form.title_he,
        description_he: form.description_he,
        song_title: form.song_title,
        song_artist: form.song_artist,
        lyrics_he: form.lyrics_he,
        song_excerpt_start_sec: 0,
        song_excerpt_end_sec: form.duration_max,
        criteria: {
          min_pitch_accuracy: form.min_pitch_accuracy,
          min_energy_level: form.min_energy_level,
          no_breaks: false,
          duration_range: [form.duration_min, form.duration_max],
        },
        max_attempts: form.max_attempts,
        scoring_weights: {
          ai_score: 0.4,
          teacher_score: 0.4,
          effort_score: 0.1,
          participation_bonus: 0.1,
        },
        leaderboard_mode: form.leaderboard_mode,
        allow_comments: form.allow_comments,
        show_scores_publicly: form.show_scores_publicly,
        prizes: {
          first: { xp: form.prize_first },
          second: { xp: form.prize_second },
          third: { xp: form.prize_third },
          participation: { xp: form.prize_participation },
        },
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      });

      navigate('/groups/teacher/challenges');
    } catch (error) {
      console.error('Failed to create challenge:', error);
      alert('שגיאה ביצירת האתגר');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/groups/teacher/challenges')}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            אתגר חדש
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Basic Info */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-purple-500" />
              פרטי האתגר
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">שם האתגר *</Label>
              <Input
                id="title"
                value={form.title_he}
                onChange={(e) => updateForm('title_he', e.target.value)}
                placeholder="למשל: אתגר יהלומים"
                className={cn(errors.title_he && 'border-red-500')}
              />
              {errors.title_he && (
                <p className="text-red-500 text-xs mt-1">{errors.title_he}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                value={form.description_he}
                onChange={(e) => updateForm('description_he', e.target.value)}
                placeholder="תארו את האתגר בקצרה"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Song Info */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music className="h-5 w-5 text-purple-500" />
              פרטי השיר
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="song_title">שם השיר *</Label>
                <Input
                  id="song_title"
                  value={form.song_title}
                  onChange={(e) => updateForm('song_title', e.target.value)}
                  placeholder="Diamonds"
                  className={cn(errors.song_title && 'border-red-500')}
                />
                {errors.song_title && (
                  <p className="text-red-500 text-xs mt-1">{errors.song_title}</p>
                )}
              </div>
              <div>
                <Label htmlFor="song_artist">אמן</Label>
                <Input
                  id="song_artist"
                  value={form.song_artist}
                  onChange={(e) => updateForm('song_artist', e.target.value)}
                  placeholder="Rihanna"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="lyrics">מילות השיר</Label>
              <Textarea
                id="lyrics"
                value={form.lyrics_he}
                onChange={(e) => updateForm('lyrics_he', e.target.value)}
                placeholder="הכניסו את מילות השיר כאן..."
                rows={4}
              />
            </div>

            {/* Reference audio upload - placeholder */}
            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">העלאת קובץ אודיו לדוגמה</p>
              <p className="text-xs text-gray-400 mt-1">(בקרוב)</p>
            </div>
          </CardContent>
        </Card>

        {/* Recording Settings */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-purple-500" />
              הגדרות הקלטה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration_min">משך מינימלי (שניות)</Label>
                <Input
                  id="duration_min"
                  type="number"
                  value={form.duration_min}
                  onChange={(e) => updateForm('duration_min', parseInt(e.target.value) || 0)}
                  min={10}
                  max={300}
                />
              </div>
              <div>
                <Label htmlFor="duration_max">משך מקסימלי (שניות)</Label>
                <Input
                  id="duration_max"
                  type="number"
                  value={form.duration_max}
                  onChange={(e) => updateForm('duration_max', parseInt(e.target.value) || 0)}
                  min={10}
                  max={300}
                  className={cn(errors.duration_max && 'border-red-500')}
                />
                {errors.duration_max && (
                  <p className="text-red-500 text-xs mt-1">{errors.duration_max}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="max_attempts">מקסימום ניסיונות</Label>
              <Select
                value={form.max_attempts.toString()}
                onValueChange={(v) => updateForm('max_attempts', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10 (ללא הגבלה)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_pitch">דיוק צליל מינימלי (%)</Label>
                <Input
                  id="min_pitch"
                  type="number"
                  value={form.min_pitch_accuracy}
                  onChange={(e) => updateForm('min_pitch_accuracy', parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                />
              </div>
              <div>
                <Label htmlFor="min_energy">אנרגיה מינימלית (%)</Label>
                <Input
                  id="min_energy"
                  type="number"
                  value={form.min_energy_level}
                  onChange={(e) => updateForm('min_energy_level', parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-purple-500" />
              תזמון
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="starts_at">תאריך התחלה *</Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => updateForm('starts_at', e.target.value)}
                  className={cn(errors.starts_at && 'border-red-500')}
                />
                {errors.starts_at && (
                  <p className="text-red-500 text-xs mt-1">{errors.starts_at}</p>
                )}
              </div>
              <div>
                <Label htmlFor="ends_at">תאריך סיום *</Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => updateForm('ends_at', e.target.value)}
                  className={cn(errors.ends_at && 'border-red-500')}
                />
                {errors.ends_at && (
                  <p className="text-red-500 text-xs mt-1">{errors.ends_at}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Display */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-purple-500" />
              תצוגה ופרטיות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="leaderboard_mode">מצב לוח מובילים</Label>
              <Select
                value={form.leaderboard_mode}
                onValueChange={(v) => updateForm('leaderboard_mode', v as LeaderboardMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">מלא - כולם רואים את כולם</SelectItem>
                  <SelectItem value="semi">חלקי - 3 ראשונים + המיקום שלי</SelectItem>
                  <SelectItem value="private">פרטי - רק אני רואה את עצמי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>אפשר תגובות</Label>
                <p className="text-xs text-gray-500">תלמידים יכולים להגיב על הקלטות</p>
              </div>
              <Switch
                checked={form.allow_comments}
                onCheckedChange={(checked) => updateForm('allow_comments', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>הצג ציונים בפומבי</Label>
                <p className="text-xs text-gray-500">כולם רואים את הציונים</p>
              </div>
              <Switch
                checked={form.show_scores_publicly}
                onCheckedChange={(checked) => updateForm('show_scores_publicly', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prizes */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              פרסים (XP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <span className="text-2xl">🥇</span>
                <Label className="block mt-1">מקום 1</Label>
                <Input
                  type="number"
                  value={form.prize_first}
                  onChange={(e) => updateForm('prize_first', parseInt(e.target.value) || 0)}
                  className="mt-1 text-center"
                />
              </div>
              <div className="text-center">
                <span className="text-2xl">🥈</span>
                <Label className="block mt-1">מקום 2</Label>
                <Input
                  type="number"
                  value={form.prize_second}
                  onChange={(e) => updateForm('prize_second', parseInt(e.target.value) || 0)}
                  className="mt-1 text-center"
                />
              </div>
              <div className="text-center">
                <span className="text-2xl">🥉</span>
                <Label className="block mt-1">מקום 3</Label>
                <Input
                  type="number"
                  value={form.prize_third}
                  onChange={(e) => updateForm('prize_third', parseInt(e.target.value) || 0)}
                  className="mt-1 text-center"
                />
              </div>
              <div className="text-center">
                <span className="text-2xl">🎤</span>
                <Label className="block mt-1">השתתפות</Label>
                <Input
                  type="number"
                  value={form.prize_participation}
                  onChange={(e) => updateForm('prize_participation', parseInt(e.target.value) || 0)}
                  className="mt-1 text-center"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            <Save className="h-4 w-4 ml-2" />
            שמירה כטיוטה
          </Button>
          <Button
            className="flex-1 bg-purple-500 hover:bg-purple-600"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Trophy className="h-4 w-4 ml-2" />
            )}
            יצירה והפעלה
          </Button>
        </div>
      </main>
    </div>
  );
}
