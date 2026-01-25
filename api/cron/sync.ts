// Vercel Cron Job - syncs transcripts from Google Drive
// Schedule: Every hour (configured in vercel.json)

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Verify cron secret (Vercel adds this header)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Call Supabase sync-transcripts function
    const response = await fetch(
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

    const result = await response.json();
    console.log('Sync result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cron sync error:', error);
    return new Response(JSON.stringify({ error: 'Sync failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
