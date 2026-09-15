import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'deepseek-agent-api',
        configureServer(server) {
          server.middlewares.use('/api/agent/trending', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const website = parsed.website || {};
                const model = parsed.model || 'deepseek-chat';
                const apiKey = parsed.apiKey || process.env.DEEPSEEK_API_KEY;

                if (!apiKey) {
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    status: 'fallback',
                    message: 'DEEPSEEK_API_KEY not configured in environment',
                  }));
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
                        content: 'You are an autonomous 48-hour industry trend research agent. You track breakthrough articles, Google AEO shifts, and news from the last 48 hours for businesses. Output ONLY valid JSON containing an array of exactly 6 trending topic objects with properties: "title" (headline), "momentum" (e.g. "+380% surge in last 48h"), "context" (1 concise sentence explaining the shift), "source" (news outlet or forum), "category", and "searchIntent" (\'Informational\' | \'Commercial\' | \'Educational\' | \'Comparative\'). No markdown formatting or extra text.',
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
                res.end(JSON.stringify({
                  status: 'success',
                  source: 'deepseek_live',
                  topics: Array.isArray(topics) ? topics : [],
                }));
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({ status: 'fallback', error: err.message }));
              }
            });
          });

          server.middlewares.use('/api/webhook/website-analyze', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const targetUrl = (
                  parsed.webhookUrl ||
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
                      error: 'Website analyze webhook URL is not configured.',
                    })
                  );
                  return;
                }

                const payload = parsed.payload || parsed;

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
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://mfwjvsypfttmxjhhfbzu.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_N8N_CONTENT_GENERATE_WEBHOOK': JSON.stringify(
        process.env.VITE_N8N_CONTENT_GENERATE_WEBHOOK || 'https://n8n.kuhaanelectric.com/webhook-test/content/generate'
      ),
      'import.meta.env.VITE_N8N_WEBSITE_ANALYZE_WEBHOOK': JSON.stringify(
        process.env.VITE_N8N_WEBSITE_ANALYZE_WEBHOOK || 'https://n8n.kuhaanelectric.com/webhook-test/website/analyze'
      ),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
