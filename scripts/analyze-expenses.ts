/**
 * Expense Optimization Analyzer
 * מנתח הוצאות ומציע דרכים לחסוך
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const EXPENSES_DB_ID = 'dd87657b-24e8-4a2a-a262-d71e2306f109';

interface Expense {
  name: string;
  monthlyCost: number;
  category: string | null;
  belongsTo: string[];
  isSubscription: boolean;
  frequency: string | null;
}

interface Recommendation {
  type: 'warning' | 'suggestion' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSaving: number;
  action: string;
}

async function fetchExpenses(): Promise<Expense[]> {
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

  return data.results
    .map((page: any) => ({
      name: page.properties['שם']?.title?.[0]?.plain_text || 'Unknown',
      monthlyCost: page.properties['עלות חודשית ₪']?.number || 0,
      category: page.properties['קטגוריה']?.select?.name || null,
      belongsTo: page.properties['?לאן שייך']?.multi_select?.map((s: any) => s.name) || [],
      isSubscription: page.properties['תדירות']?.select?.name?.includes('חודש') || true,
      frequency: page.properties['תדירות']?.select?.name || null,
    }))
    .filter((e: Expense) => e.monthlyCost > 0);
}

async function fetchIncome(): Promise<{ weekly: number; monthly: number }> {
  const { data: entries } = await supabase
    .from('cashflow_entries')
    .select('amount, period_type')
    .eq('period_type', 'weekly')
    .order('period_start', { ascending: false })
    .limit(13);

  const weeklyTotal = entries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const avgWeekly = entries?.length ? weeklyTotal / entries.length : 0;

  return {
    weekly: avgWeekly,
    monthly: avgWeekly * 4.33,
  };
}

function analyzeExpenses(expenses: Expense[], income: { weekly: number; monthly: number }): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const totalMonthly = expenses.reduce((sum, e) => sum + e.monthlyCost, 0);

  // 1. High expense ratio warning
  const expenseRatio = totalMonthly / income.monthly;
  if (expenseRatio > 0.5) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      title: '⚠️ יחס הוצאות גבוה',
      description: `ההוצאות מהוות ${(expenseRatio * 100).toFixed(0)}% מההכנסות`,
      potentialSaving: 0,
      action: 'יש לבחון הוצאות גדולות ולחפש חלופות',
    });
  }

  // 2. Find duplicate/similar services
  const duplicates = findDuplicateServices(expenses);
  duplicates.forEach(dup => {
    recommendations.push({
      type: 'suggestion',
      priority: 'medium',
      title: `🔄 שירותים חופפים: ${dup.category}`,
      description: `נמצאו ${dup.services.length} שירותים דומים: ${dup.services.join(', ')}`,
      potentialSaving: dup.potentialSaving,
      action: 'בדוק אם אפשר לאחד או לבטל אחד מהם',
    });
  });

  // 3. Find expensive subscriptions relative to usage
  const expensiveItems = expenses
    .filter(e => e.monthlyCost > 100)
    .sort((a, b) => b.monthlyCost - a.monthlyCost);

  expensiveItems.forEach(item => {
    const percentOfTotal = (item.monthlyCost / totalMonthly) * 100;
    if (percentOfTotal > 10) {
      recommendations.push({
        type: 'suggestion',
        priority: 'medium',
        title: `💰 הוצאה משמעותית: ${item.name}`,
        description: `₪${item.monthlyCost}/חודש (${percentOfTotal.toFixed(0)}% מסה"כ ההוצאות)`,
        potentialSaving: item.monthlyCost * 0.2, // Assume 20% potential reduction
        action: 'בדוק תוכניות זולות יותר או חלופות',
      });
    }
  });

  // 4. Annual vs monthly payment opportunities
  const monthlySubscriptions = expenses.filter(e => e.isSubscription && e.monthlyCost > 20);
  if (monthlySubscriptions.length > 3) {
    const potentialSaving = monthlySubscriptions.reduce((sum, e) => sum + e.monthlyCost * 0.15, 0);
    recommendations.push({
      type: 'opportunity',
      priority: 'medium',
      title: '📅 מעבר לתשלום שנתי',
      description: `${monthlySubscriptions.length} מנויים חודשיים - תשלום שנתי חוסך בד"כ 15-20%`,
      potentialSaving: potentialSaving * 12,
      action: 'בדוק אפשרויות תשלום שנתי עבור: ' + monthlySubscriptions.slice(0, 3).map(e => e.name).join(', '),
    });
  }

  // 5. Advertising spend analysis
  const adSpend = expenses.filter(e =>
    e.name.toLowerCase().includes('ads') ||
    e.name.toLowerCase().includes('facebook') ||
    e.name.toLowerCase().includes('google ads')
  );
  const totalAdSpend = adSpend.reduce((sum, e) => sum + e.monthlyCost, 0);

  if (totalAdSpend > 500) {
    const adRatio = totalAdSpend / income.monthly;
    recommendations.push({
      type: adRatio > 0.15 ? 'warning' : 'suggestion',
      priority: adRatio > 0.15 ? 'high' : 'low',
      title: '📢 הוצאות פרסום',
      description: `₪${totalAdSpend}/חודש על פרסום (${(adRatio * 100).toFixed(0)}% מההכנסות)`,
      potentialSaving: 0,
      action: adRatio > 0.15
        ? 'יחס פרסום גבוה - בדוק ROI של כל ערוץ'
        : 'עקוב אחרי ROI ובצע אופטימיזציה',
    });
  }

  // 6. Payment processing fees
  const processingFees = expenses.filter(e =>
    e.name.includes('סליקה') || e.name.includes('עמלות') || e.name.includes('Morning')
  );
  const totalFees = processingFees.reduce((sum, e) => sum + e.monthlyCost, 0);

  if (totalFees > 200) {
    recommendations.push({
      type: 'suggestion',
      priority: 'medium',
      title: '💳 עמלות סליקה',
      description: `₪${totalFees}/חודש על סליקה ועמלות`,
      potentialSaving: totalFees * 0.3,
      action: 'השווה ספקי סליקה - אפשר לחסוך עד 30%',
    });
  }

  // 7. Small expenses that add up
  const smallExpenses = expenses.filter(e => e.monthlyCost < 30 && e.monthlyCost > 0);
  const totalSmall = smallExpenses.reduce((sum, e) => sum + e.monthlyCost, 0);

  if (smallExpenses.length > 5 && totalSmall > 100) {
    recommendations.push({
      type: 'suggestion',
      priority: 'low',
      title: '🔍 הוצאות קטנות מצטברות',
      description: `${smallExpenses.length} הוצאות קטנות = ₪${totalSmall.toFixed(0)}/חודש`,
      potentialSaving: totalSmall * 0.3,
      action: 'בדוק אילו מהן באמת נחוצות: ' + smallExpenses.map(e => e.name).join(', '),
    });
  }

  // 8. Tax optimization
  const socialSecurity = expenses.find(e => e.name.includes('ביטוח לאומי'));
  const accountant = expenses.find(e => e.name.includes('רואה חשבון'));

  if (socialSecurity && income.monthly > 10000) {
    recommendations.push({
      type: 'opportunity',
      priority: 'medium',
      title: '🧾 אופטימיזציית מס',
      description: 'בדוק עם רואה החשבון אפשרויות להפחתת מס',
      potentialSaving: income.monthly * 0.05 * 12,
      action: 'קרן השתלמות, קרן פנסיה, הוצאות מוכרות נוספות',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function findDuplicateServices(expenses: Expense[]): { category: string; services: string[]; potentialSaving: number }[] {
  const duplicates: { category: string; services: string[]; potentialSaving: number }[] = [];

  // Check for multiple payment processors
  const paymentServices = expenses.filter(e =>
    e.name.includes('סליקה') || e.name.includes('Morning') || e.name.includes('Grow')
  );
  if (paymentServices.length > 1) {
    const costs = paymentServices.map(e => e.monthlyCost).sort((a, b) => a - b);
    duplicates.push({
      category: 'סליקה',
      services: paymentServices.map(e => e.name),
      potentialSaving: costs[0], // Could save the cheaper one
    });
  }

  // Check for multiple website builders
  const webServices = expenses.filter(e =>
    e.name.toLowerCase().includes('webflow') ||
    e.name.toLowerCase().includes('shopify') ||
    e.name.toLowerCase().includes('wix')
  );
  if (webServices.length > 1) {
    const costs = webServices.map(e => e.monthlyCost).sort((a, b) => a - b);
    duplicates.push({
      category: 'בניית אתרים',
      services: webServices.map(e => e.name),
      potentialSaving: costs[0],
    });
  }

  // Check for multiple cloud storage
  const storageServices = expenses.filter(e =>
    e.name.toLowerCase().includes('icloud') ||
    e.name.toLowerCase().includes('google drive') ||
    e.name.toLowerCase().includes('dropbox')
  );
  if (storageServices.length > 1) {
    const costs = storageServices.map(e => e.monthlyCost).sort((a, b) => a - b);
    duplicates.push({
      category: 'אחסון ענן',
      services: storageServices.map(e => e.name),
      potentialSaving: costs[0],
    });
  }

  return duplicates;
}

async function main() {
  console.log('\n🔍 מנתח הוצאות ומחפש הזדמנויות לחיסכון...\n');

  const expenses = await fetchExpenses();
  const income = await fetchIncome();

  const totalMonthly = expenses.reduce((sum, e) => sum + e.monthlyCost, 0);

  console.log('═══════════════════════════════════════════════════════');
  console.log('                    📊 סיכום מצב נוכחי');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`💰 הכנסה חודשית ממוצעת:  ₪${income.monthly.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`);
  console.log(`📤 הוצאות חודשיות:       ₪${totalMonthly.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`);
  console.log(`📈 רווח גולמי:           ₪${(income.monthly - totalMonthly).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`);
  console.log(`📊 יחס הוצאות/הכנסות:    ${((totalMonthly / income.monthly) * 100).toFixed(0)}%`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                    💡 המלצות לחיסכון');
  console.log('═══════════════════════════════════════════════════════\n');

  const recommendations = analyzeExpenses(expenses, income);

  let totalPotentialSaving = 0;

  recommendations.forEach((rec, i) => {
    const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
    console.log(`${i + 1}. ${priorityEmoji} ${rec.title}`);
    console.log(`   ${rec.description}`);
    if (rec.potentialSaving > 0) {
      console.log(`   💵 חיסכון פוטנציאלי: ₪${rec.potentialSaving.toLocaleString('he-IL', { maximumFractionDigits: 0 })}/שנה`);
      totalPotentialSaving += rec.potentialSaving;
    }
    console.log(`   ✅ ${rec.action}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log(`   סה"כ חיסכון פוטנציאלי: ₪${totalPotentialSaving.toLocaleString('he-IL', { maximumFractionDigits: 0 })}/שנה`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Top 5 expenses breakdown
  console.log('📋 5 ההוצאות הגדולות ביותר:\n');
  const top5 = [...expenses].sort((a, b) => b.monthlyCost - a.monthlyCost).slice(0, 5);
  top5.forEach((e, i) => {
    const percent = ((e.monthlyCost / totalMonthly) * 100).toFixed(0);
    console.log(`   ${i + 1}. ${e.name}: ₪${e.monthlyCost}/חודש (${percent}%)`);
  });

  console.log('\n✨ סיום ניתוח!\n');
}

main();
