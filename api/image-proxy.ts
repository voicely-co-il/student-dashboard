import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Only allow proxying from trusted domains
  const allowedHosts = ['mp.astria.ai', 'cdn.astria.ai', 'sdbooth2-production.s3.amazonaws.com'];
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!allowedHosts.some(host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith('.' + host))) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Voicely-ImageProxy/1.0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error' });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({ error: 'Proxy fetch failed' });
  }
}
