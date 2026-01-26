/**
 * Sync Voicely-related expenses from Notion to Supabase cashflow
 *
 * Pulls expenses marked as "כלים של ענבל" from Notion's main expenses table
 * and syncs them to cashflow_entries with proper categorization.
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Supabase client with service role for bypassing RLS
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Notion config
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const EXPENSES_DB_ID = 'dd87657b-24e8-4a2a-a262-d71e2306f109';

// All items marked as "כלים של ענבל" are business expenses

interface NotionExpense {
  name: string;
  monthlyCost: number | null;
  category: string | null;
  belongsTo: string[];
  isInbalTool: boolean;
}

async function fetchNotionExpenses(): Promise<NotionExpense[]> {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${EXPENSES_DB_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'כלים של ענבל',
          checkbox: { equals: true },
        },
        page_size: 100,
      }),
    }
  );

  const data = await response.json();

  if (data.object === 'error') {
    throw new Error(`Notion API error: ${data.message}`);
  }

  return data.results.map((page: any) => ({
    name: page.properties['שם']?.title?.[0]?.plain_text || 'Unknown',
    monthlyCost: page.properties['עלות חודשית ₪']?.number || null,
    category: page.properties['קטגוריה']?.select?.name || null,
    belongsTo: page.properties['?לאן שייך']?.multi_select?.map((s: any) => s.name) || [],
    isInbalTool: page.properties['כלים של ענבל']?.checkbox || false,
  }));
}

// All items marked as "כלים של ענבל" are Voicely business expenses
function isBusinessExpense(expense: NotionExpense): boolean {
  return expense.isInbalTool && expense.monthlyCost !== null && expense.monthlyCost > 0;
}

async function getOrCreateToolsCategory(): Promise<string> {
  // Check if "כלים ותוכנות" category exists
  const { data: existing } = await supabase
    .from('cashflow_categories')
    .select('id')
    .eq('name', 'כלים ותוכנות')
    .single();

  if (existing) {
    return existing.id;
  }

  // Create it
  const { data: created, error } = await supabase
    .from('cashflow_categories')
    .insert({
      name: 'כלים ותוכנות',
      type: 'expense',
      sort_order: 10,
      is_default: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return created!.id;
}

async function getCurrentWeekStart(): Promise<string> {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  now.setDate(now.getDate() + diff);
  return now.toISOString().split('T')[0];
}

async function syncExpensesToCashflow(expenses: NotionExpense[]) {
  const categoryId = await getOrCreateToolsCategory();
  const weekStart = await getCurrentWeekStart();

  // Filter all business expenses with costs
  const voicelyExpenses = expenses.filter(isBusinessExpense);

  console.log('\n📊 הוצאות Voicely מ-Notion:\n');

  let totalMonthly = 0;
  for (const expense of voicelyExpenses) {
    console.log(`  • ${expense.name}: ₪${expense.monthlyCost}/חודש`);
    totalMonthly += expense.monthlyCost!;
  }

  // Calculate weekly amount (monthly / 4.33)
  const weeklyTotal = Math.round(totalMonthly / 4.33);

  console.log(`\n  ────────────────────────`);
  console.log(`  סה"כ חודשי: ₪${totalMonthly.toLocaleString('he-IL')}`);
  console.log(`  סה"כ שבועי: ₪${weeklyTotal.toLocaleString('he-IL')}`);

  // Create detailed notes
  const notes = voicelyExpenses
    .map(e => `${e.name}: ₪${e.monthlyCost}`)
    .join('\n');

  // Upsert to cashflow_entries for current week
  const { error } = await supabase
    .from('cashflow_entries')
    .upsert({
      category_id: categoryId,
      period_type: 'weekly',
      period_start: weekStart,
      amount: weeklyTotal,
      notes: `כלים ותוכנות (מ-Notion):\n${notes}`,
    }, { onConflict: 'category_id,period_type,period_start' });

  if (error) {
    console.error('\n❌ שגיאה בעדכון:', error.message);
  } else {
    console.log(`\n✅ עודכן בתזרים: ${weekStart} → ₪${weeklyTotal}`);
  }

  // Also update monthly view
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const { error: monthError } = await supabase
    .from('cashflow_entries')
    .upsert({
      category_id: categoryId,
      period_type: 'monthly',
      period_start: monthStartStr,
      amount: totalMonthly,
      notes: `כלים ותוכנות (מ-Notion):\n${notes}`,
    }, { onConflict: 'category_id,period_type,period_start' });

  if (monthError) {
    console.error('❌ שגיאה בעדכון חודשי:', monthError.message);
  } else {
    console.log(`✅ עודכן חודשי: ${monthStartStr} → ₪${totalMonthly}`);
  }
}

async function main() {
  console.log('\n🔄 מסנכרן הוצאות מ-Notion...\n');

  try {
    const expenses = await fetchNotionExpenses();
    console.log(`נמצאו ${expenses.length} כלים של ענבל`);

    await syncExpensesToCashflow(expenses);

    console.log('\n✨ סיום!\n');
  } catch (error) {
    console.error('❌ שגיאה:', error);
  }
}

main();
