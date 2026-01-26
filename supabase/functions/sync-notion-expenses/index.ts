/**
 * Edge Function: sync-notion-expenses
 *
 * Syncs Voicely-related expenses from Notion to Supabase cashflow.
 * Can be triggered by:
 * 1. Notion webhook (via Make.com/Zapier)
 * 2. Manual API call
 * 3. Scheduled cron job
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTION_API_KEY = Deno.env.get('NOTION_API_KEY')!;
const EXPENSES_DB_ID = 'dd87657b-24e8-4a2a-a262-d71e2306f109';

// All items marked as "כלים של ענבל" are business expenses - no keyword filtering needed

interface NotionExpense {
  name: string;
  monthlyCost: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch expenses from Notion
    const notionRes = await fetch(
      `https://api.notion.com/v1/databases/${EXPENSES_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { property: 'כלים של ענבל', checkbox: { equals: true } },
          page_size: 100,
        }),
      }
    );

    const notionData = await notionRes.json();

    if (notionData.object === 'error') {
      throw new Error(`Notion API: ${notionData.message}`);
    }

    // Parse expenses
    const expenses: NotionExpense[] = notionData.results.map((page: any) => ({
      name: page.properties['שם']?.title?.[0]?.plain_text || 'Unknown',
      monthlyCost: page.properties['עלות חודשית ₪']?.number || null,
    }));

    // All items marked as "כלים של ענבל" with costs are business expenses
    const voicelyExpenses = expenses.filter(e => e.monthlyCost && e.monthlyCost > 0);

    // Calculate totals
    const totalMonthly = voicelyExpenses.reduce((sum, e) => sum + (e.monthlyCost || 0), 0);
    const weeklyTotal = Math.round(totalMonthly / 4.33);

    // Get or create "כלים ותוכנות" category
    let { data: category } = await supabase
      .from('cashflow_categories')
      .select('id')
      .eq('name', 'כלים ותוכנות')
      .single();

    if (!category) {
      const { data: newCat } = await supabase
        .from('cashflow_categories')
        .insert({ name: 'כלים ותוכנות', type: 'expense', sort_order: 10, is_default: true })
        .select('id')
        .single();
      category = newCat;
    }

    // Calculate week start (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    now.setDate(now.getDate() + diff);
    const weekStart = now.toISOString().split('T')[0];

    // Month start
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Build notes
    const notes = voicelyExpenses.map(e => `${e.name}: ₪${e.monthlyCost}`).join('\n');

    // Upsert weekly entry
    await supabase
      .from('cashflow_entries')
      .upsert({
        category_id: category!.id,
        period_type: 'weekly',
        period_start: weekStart,
        amount: weeklyTotal,
        notes: `כלים ותוכנות (מ-Notion):\n${notes}`,
      }, { onConflict: 'category_id,period_type,period_start' });

    // Upsert monthly entry
    await supabase
      .from('cashflow_entries')
      .upsert({
        category_id: category!.id,
        period_type: 'monthly',
        period_start: monthStartStr,
        amount: totalMonthly,
        notes: `כלים ותוכנות (מ-Notion):\n${notes}`,
      }, { onConflict: 'category_id,period_type,period_start' });

    return new Response(
      JSON.stringify({
        success: true,
        synced: voicelyExpenses.length,
        totalMonthly,
        weeklyTotal,
        expenses: voicelyExpenses.map(e => e.name),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
