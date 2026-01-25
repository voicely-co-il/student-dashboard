// Vercel Cron Job - syncs transcripts from Google Drive + analyzes group lessons
// Schedule: Daily at 3am (configured in vercel.json)

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Verify cron secret (Vercel adds this header)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const results: Record<string, any> = {};

  try {
    // Step 1: Sync transcripts from Google Drive
    console.log('Step 1: Syncing transcripts...');
    const syncResponse = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/sync-transcripts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 20 }),
      }
    );
    results.sync = await syncResponse.json();
    console.log('Sync result:', results.sync);

    // Step 2: Analyze group lessons (extract student participation)
    console.log('Step 2: Analyzing group lessons...');
    const analyzeResponse = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/analyze-group-lessons`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit: 100, daysBack: 7 }), // Analyze last 7 days
      }
    );
    results.groupAnalysis = await analyzeResponse.json();
    console.log('Group analysis result:', results.groupAnalysis);

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cron sync error:', error);
    return new Response(JSON.stringify({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : String(error),
      partialResults: results,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
