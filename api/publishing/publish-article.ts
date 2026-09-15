import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { publishArticle } from './_publishing-service.js';

/**
 * ============================================================
 * IntentWrite Publish Article Endpoint
 * ============================================================
 *
 * Endpoint:
 *   POST /api/publishing/publish-article
 *
 * Request body:
 *   {
 *     "article_id": "..."
 *   }
 *
 * Flow:
 *   1. Authenticate user from Supabase JWT.
 *   2. Validate article_id input.
 *   3. Delegate to shared publishing service (publishing-service.ts).
 *   4. Return response matching existing client contract.
 * ============================================================
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ==========================================================
  // 1. Method check
  // ==========================================================
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed_methods: ['POST']
    });
  }

  // ==========================================================
  // 2. Authenticate current IntentWrite user
  // ==========================================================
  const authorization = req.headers.authorization || '';
  const accessToken = authorization.startsWith('Bearer ')
    ? authorization.substring(7).trim()
    : '';

  if (!accessToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  // ==========================================================
  // 3. Read article_id
  // ==========================================================
  const { article_id } = req.body || {};
  if (typeof article_id !== 'string' || !article_id.trim()) {
    return res.status(400).json({
      success: false,
      error: 'article_id is required.'
    });
  }

  const cleanArticleId = article_id.trim();

  // ==========================================================
  // 4. Verify auth session with Supabase
  // ==========================================================
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      success: false,
      error: 'Publishing server configuration is incomplete.'
    });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });

  const {
    data: { user },
    error: authError
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired IntentWrite session.'
    });
  }

  // ==========================================================
  // 5. Delegate to shared publishing service
  // ==========================================================
  const result = await publishArticle({
    articleId: cleanArticleId,
    userId: user.id,
    source: 'manual'
  });

  // ==========================================================
  // 6. Return response matching existing API contract
  // ==========================================================
  if (result.success) {
    if (result.already_published) {
      return res.status(200).json({
        success: true,
        already_published: true,
        article_id: result.article_id,
        published_url: result.published_url,
        published_at: result.published_at
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message || 'Article published successfully.',
      article_id: result.article_id,
      status: result.status,
      published_url: result.published_url,
      published_at: result.published_at
    });
  }

  // Error responses (400, 404, 500, 502)
  const errorPayload: Record<string, any> = {
    success: false,
    error: result.error || 'Publishing failed.'
  };

  if (result.details) {
    errorPayload.details = result.details;
  }
  if (result.client_status !== undefined) {
    errorPayload.client_status = result.client_status;
  }
  if (result.client_error !== undefined) {
    errorPayload.client_error = result.client_error;
  }

  return res.status(result.statusCode || 500).json(errorPayload);
}
