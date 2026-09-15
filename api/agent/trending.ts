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
    const website = body.website || {};
    const model = body.model || 'deepseek-chat';
    const apiKey = body.apiKey || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          status: 'fallback',
          message: 'DEEPSEEK_API_KEY not configured in environment',
        })
      );
      return;
    }

    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an autonomous 48-hour industry trend research agent. You track breakthrough articles, Google AEO shifts, and news from the last 48 hours for businesses. Output ONLY valid JSON containing an array of exactly 6 trending topic objects with properties: "title" (headline), "momentum" (e.g. "+380% surge in last 48h"), "context" (1 concise sentence explaining the shift), "source" (news outlet or forum), "category", and "searchIntent" (\'Informational\' | \'Commercial\' | \'Educational\' | \'Comparative\'). No markdown formatting or extra text.',
          },
          {
            role: 'user',
            content: `Find the Top 6 highest-momentum trending news, articles, and debate topics from the last 48 hours in the industry: "${website.industry || 'Technology'}".
Business Name: "${website.name || 'Business'}"
Description: "${website.description || ''}"
Target Audience: "${website.targetAudience || ''}"
Products/Services: "${website.products || ''}"`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!deepseekResponse.ok) {
      const errText = await deepseekResponse.text();
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'fallback', error: errText }));
      return;
    }

    const dsData = await deepseekResponse.json();
    const rawContent = dsData.choices?.[0]?.message?.content || '';
    const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const topics = JSON.parse(cleaned);

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        status: 'success',
        source: 'deepseek_live',
        topics: Array.isArray(topics) ? topics : [],
      })
    );
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'fallback', error: err.message }));
  }
}
