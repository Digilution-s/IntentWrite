export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (!body) {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk: any) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}'));
        } catch {
          resolve({});
        }
      });
    });
  }

  try {
    const targetUrl = (
      body.webhookUrl ||
      process.env.VITE_N8N_WEBSITE_ANALYZE_WEBHOOK ||
      ''
    ).trim();

    if (!targetUrl) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          ok: false,
          status: 400,
          error: 'Website analyze webhook URL is not configured in environment variables.',
        })
      );
      return;
    }

    const payload = body.payload || body;

    const n8nRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await n8nRes.text();
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { text: responseText };
    }

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: n8nRes.ok,
        status: n8nRes.status,
        statusText: n8nRes.statusText,
        data: responseData,
        url: targetUrl,
      })
    );
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: false,
        status: 500,
        error: err.message || 'Failed to dispatch webhook',
      })
    );
  }
}
