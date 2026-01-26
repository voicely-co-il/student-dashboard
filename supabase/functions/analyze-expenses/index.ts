/**
 * Edge Function: analyze-expenses
 * Returns expense optimization recommendations
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTION_API_KEY = Deno.env.get('NOTION_API_KEY')!;
const EXPENSES_DB_ID = 'dd87657b-24e8-4a2a-a262-d71e2306f109';

interface Expense {
  name: string;
  monthlyCost: number;
}

interface Recommendation {
  type: 'warning' | 'suggestion' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSaving: number;
  action: string;
}

Deno.serve(async (req) => {
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
    const expenses: Expense[] = notionData.results
      .map((page: any) => ({
        name: page.properties['שם']?.title?.[0]?.plain_text || 'Unknown',
        monthlyCost: page.properties['עלות חודשית ₪']?.number || 0,
      }))
      .filter((e: Expense) => e.monthlyCost > 0);

    // Fetch income from cashflow
    const { data: incomeEntries } = await supabase
      .from('cashflow_entries')
      .select('amount, category_id')
      .eq('period_type', 'weekly')
      .order('period_start', { ascending: false })
      .limit(13);

    const { data: incomeCategories } = await supabase
      .from('cashflow_categories')
      .select('id')
      .eq('type', 'income');

    const incomeCatIds = incomeCategories?.map(c => c.id) || [];
    const incomeOnly = incomeEntries?.filter(e => incomeCatIds.includes(e.category_id)) || [];
    const weeklyIncome = incomeOnly.reduce((sum, e) => sum + Number(e.amount), 0) / (incomeOnly.length || 1);
    const monthlyIncome = weeklyIncome * 4.33;

    const totalMonthlyExpenses = expenses.reduce((sum, e) => sum + e.monthlyCost, 0);

    // Generate recommendations
    const recommendations: Recommendation[] = [];

    // 1. Expense ratio
    const expenseRatio = totalMonthlyExpenses / monthlyIncome;
    if (expenseRatio > 0.5) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'יחס הוצאות גבוה',
        description: `ההוצאות מהוות ${(expenseRatio * 100).toFixed(0)}% מההכנסות`,
        potentialSaving: 0,
        action: 'יש לבחון הוצאות גדולות ולחפש חלופות',
      });
    }

    // 2. Duplicate services
    const paymentServices = expenses.filter(e =>
      e.name.includes('סליקה') || e.name.includes('Morning') || e.name.includes('Grow')
    );
    if (paymentServices.length > 1) {
      recommendations.push({
        type: 'suggestion',
        priority: 'medium',
        title: 'שירותי סליקה כפולים',
        description: `נמצאו ${paymentServices.length} ספקי סליקה: ${paymentServices.map(e => e.name).join(', ')}`,
        potentialSaving: Math.min(...paymentServices.map(e => e.monthlyCost)) * 12,
        action: 'בדוק אם אפשר לאחד לספק אחד',
      });
    }

    // 3. Annual payment opportunity
    const subscriptions = expenses.filter(e => e.monthlyCost > 20);
    if (subscriptions.length > 3) {
      const potentialSaving = subscriptions.reduce((sum, e) => sum + e.monthlyCost * 0.15, 0) * 12;
      recommendations.push({
        type: 'opportunity',
        priority: 'medium',
        title: 'מעבר לתשלום שנתי',
        description: `${subscriptions.length} מנויים - תשלום שנתי חוסך 15-20%`,
        potentialSaving,
        action: 'בדוק אפשרויות תשלום שנתי',
      });
    }

    // 4. Ad spend
    const adSpend = expenses.filter(e =>
      e.name.toLowerCase().includes('ads') || e.name.toLowerCase().includes('facebook') && e.name.toLowerCase().includes('ad')
    );
    const totalAds = adSpend.reduce((sum, e) => sum + e.monthlyCost, 0);
    if (totalAds > 500) {
      const adRatio = totalAds / monthlyIncome;
      recommendations.push({
        type: adRatio > 0.15 ? 'warning' : 'suggestion',
        priority: adRatio > 0.15 ? 'high' : 'low',
        title: 'הוצאות פרסום',
        description: `₪${totalAds}/חודש (${(adRatio * 100).toFixed(0)}% מההכנסות)`,
        potentialSaving: 0,
        action: 'עקוב אחרי ROI של כל ערוץ פרסום',
      });
    }

    // 5. Payment processing fees
    const fees = expenses.filter(e =>
      e.name.includes('סליקה') || e.name.includes('עמלות')
    );
    const totalFees = fees.reduce((sum, e) => sum + e.monthlyCost, 0);
    if (totalFees > 200) {
      recommendations.push({
        type: 'suggestion',
        priority: 'medium',
        title: 'עמלות סליקה',
        description: `₪${totalFees}/חודש על סליקה`,
        potentialSaving: totalFees * 0.3 * 12,
        action: 'השווה ספקים - אפשר לחסוך עד 30%',
      });
    }

    // 6. Tax optimization
    if (monthlyIncome > 10000) {
      recommendations.push({
        type: 'opportunity',
        priority: 'medium',
        title: 'אופטימיזציית מס',
        description: 'בדוק אפשרויות להפחתת מס',
        potentialSaving: monthlyIncome * 0.05 * 12,
        action: 'קרן השתלמות, קרן פנסיה, הוצאות מוכרות',
      });
    }

    // 7. Small expenses
    const small = expenses.filter(e => e.monthlyCost < 30);
    const totalSmall = small.reduce((sum, e) => sum + e.monthlyCost, 0);
    if (small.length > 5 && totalSmall > 100) {
      recommendations.push({
        type: 'suggestion',
        priority: 'low',
        title: 'הוצאות קטנות מצטברות',
        description: `${small.length} הוצאות קטנות = ₪${totalSmall.toFixed(0)}/חודש`,
        potentialSaving: totalSmall * 0.3 * 12,
        action: 'בדוק אילו באמת נחוצות',
      });
    }

    // Top 5 expenses
    const top5 = [...expenses].sort((a, b) => b.monthlyCost - a.monthlyCost).slice(0, 5);

    // Sort recommendations by priority
    recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    const totalPotentialSaving = recommendations.reduce((sum, r) => sum + r.potentialSaving, 0);

    return new Response(
      JSON.stringify({
        summary: {
          monthlyIncome: Math.round(monthlyIncome),
          monthlyExpenses: Math.round(totalMonthlyExpenses),
          grossProfit: Math.round(monthlyIncome - totalMonthlyExpenses),
          expenseRatio: Math.round(expenseRatio * 100),
        },
        recommendations,
        totalPotentialSaving: Math.round(totalPotentialSaving),
        top5Expenses: top5,
        expenseCount: expenses.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
