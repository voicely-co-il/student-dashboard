/**
 * Analyze transcripts to calculate actual lesson income
 * and sync with cashflow
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pricing from settings
const PRICES = {
  veteran: 180, // ותיקים
  new: 200,     // חדשים
  group: 410,   // קבוצה חודשי
};

// Known veteran students
const VETERANS = ['כרמל גוטליב', 'גילי סבג', 'עופרי יונה', 'עדי רביב', 'אופיר גרשון', 'בן ליפמן'];

async function main() {
  console.log('\n📊 ניתוח שיעורים מתמלולים\n');

  // Get transcripts
  const { data: transcripts, error } = await supabase
    .from('transcripts')
    .select('id, title, student_name, lesson_date, created_at')
    .order('lesson_date', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by week
  const byWeek = new Map<string, {
    count: number;
    students: Map<string, number>;
    income: number;
  }>();

  for (const t of transcripts || []) {
    const date = new Date(t.lesson_date || t.created_at);
    // Get Monday of that week
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    const weekKey = date.toISOString().split('T')[0];

    if (!byWeek.has(weekKey)) {
      byWeek.set(weekKey, { count: 0, students: new Map(), income: 0 });
    }
    const week = byWeek.get(weekKey)!;
    week.count++;

    const studentName = t.student_name || 'לא ידוע';
    week.students.set(studentName, (week.students.get(studentName) || 0) + 1);

    // Calculate price based on student type
    const isVeteran = VETERANS.some(v => studentName.includes(v) || v.includes(studentName));
    week.income += isVeteran ? PRICES.veteran : PRICES.new;
  }

  // Print results
  console.log('=== שיעורים לפי שבוע ===\n');
  const sorted = Array.from(byWeek.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  let totalIncome = 0;
  let totalLessons = 0;

  for (const [week, data] of sorted.slice(0, 13)) {
    const studentList = Array.from(data.students.entries())
      .map(([name, count]) => `${name}(${count})`)
      .join(', ');

    console.log(`📅 ${week}`);
    console.log(`   ${data.count} שיעורים | ₪${data.income.toLocaleString('he-IL')} הכנסה`);
    console.log(`   תלמידים: ${studentList}`);
    console.log('');

    totalIncome += data.income;
    totalLessons += data.count;
  }

  const weeksCount = Math.min(sorted.length, 13);
  const avgLessonsPerWeek = totalLessons / weeksCount;
  const avgIncomePerWeek = totalIncome / weeksCount;

  console.log('=== סיכום ===\n');
  console.log(`📈 סה"כ ${totalLessons} שיעורים ב-${weeksCount} שבועות`);
  console.log(`💰 סה"כ הכנסות: ₪${totalIncome.toLocaleString('he-IL')}`);
  console.log(`📊 ממוצע שבועי: ${avgLessonsPerWeek.toFixed(1)} שיעורים | ₪${avgIncomePerWeek.toFixed(0)}`);

  // VAT calculation
  const vatRate = 0.18;
  const netIncome = totalIncome / (1 + vatRate);
  const vat = totalIncome - netIncome;

  console.log(`\n💵 נטו (אחרי מע"מ): ₪${netIncome.toFixed(0)}`);
  console.log(`🧾 מע"מ לתשלום: ₪${vat.toFixed(0)}`);

  // Update cashflow entries
  console.log('\n\n🔄 מעדכן תזרים...\n');

  // Get Private Lessons category
  const { data: categories } = await supabase
    .from('cashflow_categories')
    .select('id, name')
    .eq('type', 'income');

  const privateLessonsCategory = categories?.find(c =>
    c.name.toLowerCase().includes('private') || c.name.includes('פרטי') || c.name.includes('Lessons')
  );

  console.log('קטגוריות הכנסה:', categories?.map(c => c.name));

  if (!privateLessonsCategory) {
    console.log('❌ לא נמצאה קטגוריית שיעורים פרטיים');
    return;
  }

  console.log(`✅ נמצאה קטגוריה: ${privateLessonsCategory.name} (${privateLessonsCategory.id})`);

  // Upsert entries for each week
  for (const [week, data] of sorted.slice(0, 13)) {
    const { error: upsertError } = await supabase
      .from('cashflow_entries')
      .upsert({
        category_id: privateLessonsCategory.id,
        period_type: 'weekly',
        period_start: week,
        amount: data.income,
        notes: `${data.count} שיעורים - ${Array.from(data.students.keys()).join(', ')}`,
      }, { onConflict: 'category_id,period_type,period_start' });

    if (upsertError) {
      console.log(`❌ שגיאה בעדכון ${week}:`, upsertError.message);
    } else {
      console.log(`✅ ${week}: ₪${data.income}`);
    }
  }

  console.log('\n✨ סיום!');
}

main();
