import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getStats() {
  const { data, error } = await supabase
    .from("transcripts")
    .select("lesson_date, duration_minutes, word_count")
    .not("lesson_date", "is", null)
    .order("lesson_date", { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  const byMonth: Record<string, { count: number; totalMinutes: number }> = {};

  for (const t of data || []) {
    const month = t.lesson_date?.substring(0, 7);
    if (!month || month.startsWith("2026")) continue; // skip 2026 (incomplete)

    if (!byMonth[month]) {
      byMonth[month] = { count: 0, totalMinutes: 0 };
    }
    byMonth[month].count++;
    // estimate duration from word count if missing (avg 100 words/min in Hebrew)
    const duration = t.duration_minutes || Math.round((t.word_count || 4000) / 100);
    byMonth[month].totalMinutes += duration;
  }

  console.log("\n📊 שיעורים לפי חודש (2025 בלבד):\n");
  console.log("חודש\t\tשיעורים\tשעות");
  console.log("─".repeat(40));

  let totalLessons = 0;
  let totalHours = 0;
  const months = Object.keys(byMonth).filter(m => m.startsWith("2025")).sort().reverse();

  for (const month of months) {
    const { count, totalMinutes } = byMonth[month];
    const hours = (totalMinutes / 60).toFixed(1);
    console.log(`${month}\t\t${count}\t${hours}`);
    totalLessons += count;
    totalHours += totalMinutes / 60;
  }

  const activeMonths = months.length;
  const avgLessonsPerMonth = totalLessons / activeMonths;
  const avgHoursPerMonth = totalHours / activeMonths;

  console.log("─".repeat(40));
  console.log(`\n📈 סה״כ 2025: ${totalLessons} שיעורים (${totalHours.toFixed(1)} שעות) ב-${activeMonths} חודשים`);
  console.log(`📈 ממוצע חודשי: ${avgLessonsPerMonth.toFixed(0)} שיעורים (${avgHoursPerMonth.toFixed(1)} שעות)`);

  console.log(`\n💰 עלות חודשית משוערת (Live Assistant):`);
  console.log(`   Soniox ($0.12/שעה):        $${(avgHoursPerMonth * 0.12).toFixed(2)} (~${Math.round(avgHoursPerMonth * 0.12 * 3.7)} ₪)`);
  console.log(`   Speechmatics ($0.50/שעה):  $${(avgHoursPerMonth * 0.50).toFixed(2)} (~${Math.round(avgHoursPerMonth * 0.50 * 3.7)} ₪)`);

  console.log(`\n💰 עלות שנתית משוערת:`);
  console.log(`   Soniox:        $${(avgHoursPerMonth * 0.12 * 12).toFixed(2)} (~${Math.round(avgHoursPerMonth * 0.12 * 12 * 3.7)} ₪)`);
  console.log(`   Speechmatics:  $${(avgHoursPerMonth * 0.50 * 12).toFixed(2)} (~${Math.round(avgHoursPerMonth * 0.50 * 12 * 3.7)} ₪)`);
}

getStats();
