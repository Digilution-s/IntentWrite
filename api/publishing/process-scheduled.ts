import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processScheduledArticles } from './publishing-service.js';

/**
 * ============================================================
 * IntentWrite Scheduled Articles Processing Endpoint
 * ============================================================
 *
 * Endpoint:
 *   GET  /api/publishing/process-scheduled (Vercel Cron standard)
 *   POST /api/publishing/process-scheduled (Manual / Webhook trigger)
 *
 * Authentication:
 *   Protected STRICTLY by CRON_SECRET:
 *     Authorization: Bearer <CRON_SECRET>
 *
 * Security Requirements:
 *   - Does NOT require a user JWT.
 *   - Protects endpoint using CRON_SECRET only.
 *   - Never accepts the Supabase service-role key as a cron authorization secret.
 *   - Never exposes CRON_SECRET to the browser or in error responses.
 *
 * Flow:
 *   1. Verifies HTTP method (GET or POST).
 *   2. Checks if CRON_SECRET is configured on the server.
 *   3. Verifies Authorization header matches CRON_SECRET.
 *   4. Queries due articles (status = 'scheduled' and scheduled_at <= NOW()).
 *   5. Claims safe batch atomically with race-condition protection.
 *   6. Publishes via shared publishing service.
 *   7. Returns JSON result: { success, timestamp, processed_count, successful_count, failed_count, results }.
 * ============================================================
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed_methods: ['GET', 'POST']
    });
  }

  // 1. Verify CRON_SECRET is configured on the server
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error('[Scheduler] Server configuration error: CRON_SECRET is not configured.');
    return res.status(500).json({
      success: false,
      error: 'CRON_SECRET is not configured on the server.'
    });
  }

  // 2. Extract Bearer token
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.substring(7).trim()
    : '';

  // 3. Strict authentication check: MUST match CRON_SECRET only
  // Explicitly reject empty token, invalid token, or Supabase service role key
  if (!token || token !== cronSecret) {
    console.warn('[Scheduler] Unauthorized attempt to invoke scheduler endpoint: invalid or missing token.');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid cron secret.'
    });
  }

  // 4. Parse safe limit from query parameter
  const limitParam = req.query?.limit;
  const limit = limitParam ? parseInt(String(limitParam), 10) : 10;

  try {
    const summary = await processScheduledArticles({
      limit: isNaN(limit) ? 10 : limit
    });

    return res.status(200).json({
      success: summary.success,
      timestamp: summary.timestamp,
      processed_count: summary.processed_count,
      successful_count: summary.successful_count,
      failed_count: summary.failed_count,
      results: summary.results
    });
  } catch (err: any) {
    console.error('[Scheduler] Unexpected error in scheduler endpoint:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process scheduled articles.',
      timestamp: new Date().toISOString(),
      processed_count: 0,
      successful_count: 0,
      failed_count: 0,
      results: []
    });
  }
}

