import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ============================================================
 * IntentWrite Shared Publishing Engine
 * ============================================================
 *
 * Core reusable server-side service used by:
 *   1. Publish Now endpoint (/api/publishing/publish-article)
 *   2. Scheduler endpoint / background worker (/api/publishing/process-scheduled)
 *
 * Requirements:
 *   - Load article & validate ownership
 *   - Load website_connections server-side
 *   - Read client credentials server-side (never exposed to browser)
 *   - Mark article as 'publishing'
 *   - Send payload to client publishing API
 *   - Handle timeouts (20s) and network/HTTP errors
 *   - Save published_url and set status to 'published' on success
 *   - Set status to 'publish_failed' and save last_publish_error on failure
 *   - Idempotent: if already published, return existing published_url
 * ============================================================
 */

export interface PublishArticleOptions {
  articleId: string;
  userId?: string; // Optional: when passed, validates that the article belongs to this user
  source?: 'manual' | 'scheduler';
  isClaimed?: boolean; // Set to true if caller already atomically claimed the article (set status to 'publishing')
}

export interface PublishResult {
  success: boolean;
  statusCode: number;
  article_id: string;
  already_published?: boolean;
  message?: string;
  status?: string;
  published_url?: string;
  published_at?: string;
  error?: string;
  details?: string;
  client_status?: number;
  client_error?: any;
}

let cachedAdminClient: SupabaseClient | null = null;

export function getAdminSupabaseClient(): SupabaseClient {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Publishing server is missing Supabase URL or SERVICE_ROLE_KEY.');
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey);
  return cachedAdminClient;
}

/**
 * Core publishing engine for an individual article.
 * Safe to call from both user-facing endpoints (with userId) and background schedulers.
 */
export async function publishArticle(options: PublishArticleOptions): Promise<PublishResult> {
  const { articleId, userId, source = 'manual' } = options;

  const cleanArticleId = typeof articleId === 'string' ? articleId.trim() : '';
  if (!cleanArticleId) {
    return {
      success: false,
      statusCode: 400,
      article_id: cleanArticleId,
      error: 'article_id is required.'
    };
  }

  let adminClient: SupabaseClient;
  try {
    adminClient = getAdminSupabaseClient();
  } catch (err: any) {
    console.error('[PublishEngine] Configuration error:', err?.message);
    return {
      success: false,
      statusCode: 500,
      article_id: cleanArticleId,
      error: 'Publishing server configuration is incomplete.'
    };
  }

  // ==========================================================
  // 1. Load the article
  // ==========================================================
  let articleQuery = adminClient
    .from('articles')
    .select('*')
    .eq('id', cleanArticleId);

  if (userId) {
    articleQuery = articleQuery.eq('user_id', userId);
  }

  const { data: article, error: articleError } = await articleQuery.maybeSingle();

  if (articleError) {
    console.error('[PublishEngine] Failed to load article:', articleError);
    return {
      success: false,
      statusCode: 500,
      article_id: cleanArticleId,
      error: 'Could not load the article from the database.'
    };
  }

  if (!article) {
    return {
      success: false,
      statusCode: 404,
      article_id: cleanArticleId,
      error: 'Article not found or does not belong to this user.'
    };
  }

  // ==========================================================
  // 2. Validate ownership (explicit check)
  // ==========================================================
  if (userId && article.user_id !== userId) {
    return {
      success: false,
      statusCode: 404,
      article_id: cleanArticleId,
      error: 'Article not found or does not belong to this user.'
    };
  }

  const articleUserId = article.user_id;

  // ==========================================================
  // 3. Idempotency Check: Already published?
  // ==========================================================
  if (article.status === 'published' && article.published_url) {
    return {
      success: true,
      statusCode: 200,
      already_published: true,
      article_id: article.id,
      status: 'published',
      published_url: article.published_url,
      published_at: article.published_at,
      message: 'Article is already published.'
    };
  }

  // ==========================================================
  // 4. Load website connection server-side
  // ==========================================================
  let connection: any = null;

  if (article.website_id) {
    const { data: directConn, error: connErr } = await adminClient
      .from('website_connections')
      .select('id, website_id, user_id, platform, connection_type, credentials, configuration, status')
      .eq('website_id', article.website_id)
      .eq('user_id', articleUserId)
      .maybeSingle();

    if (connErr) {
      console.error('[PublishEngine] Error loading direct website connection:', connErr);
    }
    connection = directConn;
  }

  // Fallback: look up user's latest configured connection
  if (!connection) {
    const { data: fallbackConn, error: fallbackErr } = await adminClient
      .from('website_connections')
      .select('id, website_id, user_id, platform, connection_type, credentials, configuration, status')
      .eq('user_id', articleUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackErr) {
      console.error('[PublishEngine] Error loading fallback website connection:', fallbackErr);
    }
    connection = fallbackConn;
  }

  if (!connection) {
    return {
      success: false,
      statusCode: 404,
      article_id: article.id,
      error: 'No publishing connection is configured for this website.'
    };
  }

  // ==========================================================
  // 5. Read client credentials server-side (never exposed to client)
  // ==========================================================
  if (connection.platform !== 'custom_api') {
    return {
      success: false,
      statusCode: 400,
      article_id: article.id,
      error: `Platform "${connection.platform}" is not yet supported by this publishing endpoint.`
    };
  }

  const credentials = connection.credentials || {};
  const configuration = connection.configuration || {};

  const apiUrl = typeof configuration.api_url === 'string' ? configuration.api_url.trim() : '';
  const apiKey = typeof credentials.api_key === 'string' ? credentials.api_key.trim() : '';

  if (!apiUrl) {
    return {
      success: false,
      statusCode: 400,
      article_id: article.id,
      error: 'Client publishing API URL is missing.'
    };
  }

  if (!apiKey) {
    return {
      success: false,
      statusCode: 400,
      article_id: article.id,
      error: 'Client publishing API key is missing.'
    };
  }

  // ==========================================================
  // 6. Set article status to "publishing" (if not already claimed atomically)
  // ==========================================================
  if (!options.isClaimed) {
    // If another runner or worker is actively publishing this right now, prevent duplicate publish
    if (article.status === 'publishing' && article.publishing_started_at) {
      const elapsedMs = Date.now() - new Date(article.publishing_started_at).getTime();
      if (elapsedMs < 60000) {
        return {
          success: false,
          statusCode: 409,
          article_id: article.id,
          error: 'Article is currently being published by another process.'
        };
      }
    }

    const publishingStartedAt = new Date().toISOString();
    const currentAttempts = (typeof article.publish_attempts === 'number' ? article.publish_attempts : 0) + 1;

    const { error: publishingStatusError } = await adminClient
      .from('articles')
      .update({
        status: 'publishing',
        publishing_started_at: publishingStartedAt,
        publish_attempts: currentAttempts,
        updated_at: publishingStartedAt
      })
      .eq('id', article.id);

    if (publishingStatusError) {
      console.error('[PublishEngine] Failed to mark article as publishing:', publishingStatusError);
      return {
        success: false,
        statusCode: 500,
        article_id: article.id,
        error: 'Could not update article publishing status.'
      };
    }
  }

  // ==========================================================
  // 7. Prepare article payload
  // ==========================================================
  const cleanSlug =
    article.slug ||
    (article.title || 'article')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const cleanContent =
    article.content ||
    article.article_html ||
    article.excerpt ||
    article.title;

  const publishPayload = {
    title: article.title,
    slug: cleanSlug,
    content: cleanContent,
    excerpt: article.excerpt || '',
    meta_title: article.meta_title || article.title,
    meta_description: article.meta_description || '',
    featured_image: '',
    category: 'IntentWrite',
    tags: Array.isArray(article.secondary_keywords)
      ? article.secondary_keywords
      : [],
    author: 'IntentWrite',
    status: 'published'
  };

  // ==========================================================
  // 8. Call client publishing API
  // ==========================================================
  let clientResponse: Response;
  try {
    clientResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-IntentWrite-Version': '1.0',
        'X-IntentWrite-Source': source
      },
      body: JSON.stringify(publishPayload),
      signal: AbortSignal.timeout(20000)
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Client website request failed.';
    console.error(`[PublishEngine] [${source}] Client request failed:`, errorMessage);

    // Save failure status and last_publish_error
    await adminClient
      .from('articles')
      .update({
        status: 'publish_failed',
        last_publish_error: `Network error: ${errorMessage}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', article.id);

    return {
      success: false,
      statusCode: 502,
      article_id: article.id,
      error: 'Could not reach the client website.',
      details: errorMessage
    };
  }

  // ==========================================================
  // 9. Read client response
  // ==========================================================
  let clientData: any = null;
  try {
    clientData = await clientResponse.json();
  } catch {
    clientData = null;
  }

  // ==========================================================
  // 10. Client rejected/failed the publish
  // ==========================================================
  if (!clientResponse.ok) {
    const errorDetails = clientData?.error || `HTTP ${clientResponse.status}`;
    console.error(`[PublishEngine] [${source}] Client API returned HTTP ${clientResponse.status}:`, errorDetails);

    await adminClient
      .from('articles')
      .update({
        status: 'publish_failed',
        last_publish_error: `Client rejected: ${errorDetails}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', article.id);

    return {
      success: false,
      statusCode: 502,
      article_id: article.id,
      error: 'Client website rejected the article.',
      client_status: clientResponse.status,
      client_error: clientData?.error || null
    };
  }

  // ==========================================================
  // 11. Extract published URL
  // ==========================================================
  const publishedUrl = typeof clientData?.url === 'string' ? clientData.url.trim() : '';

  if (!publishedUrl) {
    console.error(`[PublishEngine] [${source}] Client publish succeeded but returned no URL:`, clientData);

    await adminClient
      .from('articles')
      .update({
        status: 'publish_failed',
        last_publish_error: 'Client website accepted article but did not return a published URL.',
        updated_at: new Date().toISOString()
      })
      .eq('id', article.id);

    return {
      success: false,
      statusCode: 502,
      article_id: article.id,
      error: 'Client website accepted the article but did not return a published URL.'
    };
  }

  // ==========================================================
  // 12. Save published_url, clear last_publish_error, set status to 'published'
  // ==========================================================
  const publishedAt = new Date().toISOString();

  const { data: updatedArticle, error: finalUpdateError } = await adminClient
    .from('articles')
    .update({
      status: 'published',
      published_url: publishedUrl,
      published_at: publishedAt,
      last_publish_error: null,
      updated_at: publishedAt
    })
    .eq('id', article.id)
    .select('id, status, published_url, published_at')
    .single();

  if (finalUpdateError) {
    console.error(`[PublishEngine] [${source}] Failed to save final status:`, finalUpdateError);
    return {
      success: false,
      statusCode: 500,
      article_id: article.id,
      error: 'Article was published to the client website, but IntentWrite could not save the publishing result.',
      published_url: publishedUrl
    };
  }

  return {
    success: true,
    statusCode: 200,
    message: 'Article published successfully.',
    article_id: updatedArticle.id,
    status: updatedArticle.status,
    published_url: updatedArticle.published_url,
    published_at: updatedArticle.published_at
  };
}

export interface ProcessScheduledOptions {
  limit?: number;
  userId?: string;
}

export interface ScheduledProcessResultItem {
  article_id: string;
  title?: string;
  status: 'published' | 'publish_failed';
  published_url?: string;
  error?: string;
}

export interface ScheduledProcessSummary {
  success: boolean;
  timestamp: string;
  processed_count: number;
  successful_count: number;
  failed_count: number;
  results: ScheduledProcessResultItem[];
}

/**
 * Processes all scheduled articles that are due for publishing.
 * Concurrency protected via atomic state claim (simulating FOR UPDATE SKIP LOCKED).
 * Can be called by a scheduler cron job, background worker, or API endpoint.
 */
export async function processScheduledArticles(
  options: ProcessScheduledOptions = {}
): Promise<ScheduledProcessSummary> {
  const startedAt = new Date().toISOString();
  console.log(`[Scheduler] [${startedAt}] Scanning for scheduled articles due for publishing...`);

  let adminClient: SupabaseClient;
  try {
    adminClient = getAdminSupabaseClient();
  } catch (err: any) {
    console.error('[Scheduler] Database configuration error:', err?.message);
    return {
      success: false,
      timestamp: startedAt,
      processed_count: 0,
      successful_count: 0,
      failed_count: 0,
      results: []
    };
  }

  const rawLimit = options.limit ?? 10;
  const safeLimit = Math.min(Math.max(1, isNaN(rawLimit) ? 10 : rawLimit), 50);

  // 1. Query articles where status = 'scheduled' and scheduled_at <= NOW()
  let query = adminClient
    .from('articles')
    .select('id, user_id, title, scheduled_at, publish_attempts, status')
    .eq('status', 'scheduled')
    .lte('scheduled_at', startedAt)
    .order('scheduled_at', { ascending: true })
    .limit(safeLimit);

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }

  const { data: dueArticles, error: queryError } = await query;
  if (queryError) {
    console.error('[Scheduler] Failed to query scheduled articles:', queryError.message);
    return {
      success: false,
      timestamp: startedAt,
      processed_count: 0,
      successful_count: 0,
      failed_count: 0,
      results: []
    };
  }

  if (!dueArticles || dueArticles.length === 0) {
    console.log('[Scheduler] No scheduled articles due for publishing at this time.');
    return {
      success: true,
      timestamp: startedAt,
      processed_count: 0,
      successful_count: 0,
      failed_count: 0,
      results: []
    };
  }

  console.log(`[Scheduler] Found ${dueArticles.length} due article(s) to process.`);

  let processedCount = 0;
  let successfulCount = 0;
  let failedCount = 0;
  const results: ScheduledProcessResultItem[] = [];

  for (const art of dueArticles) {
    console.log(`[Scheduler] Attempting claim on article "${art.title}" (${art.id}) scheduled for ${art.scheduled_at}...`);

    // 2. Concurrency-safe atomic claim:
    // Transitions row from 'scheduled' -> 'publishing'.
    // If another concurrent scheduler instance updated it first, matches 0 rows and returns null.
    const claimTime = new Date().toISOString();
    const nextAttempts = (typeof art.publish_attempts === 'number' ? art.publish_attempts : 0) + 1;

    const { data: claimedArticle, error: claimError } = await adminClient
      .from('articles')
      .update({
        status: 'publishing',
        publishing_started_at: claimTime,
        publish_attempts: nextAttempts,
        updated_at: claimTime
      })
      .eq('id', art.id)
      .eq('status', 'scheduled')
      .select('id, user_id, title')
      .maybeSingle();

    if (claimError) {
      console.error(`[Scheduler] Database error claiming article ${art.id}:`, claimError.message);
      processedCount++;
      failedCount++;
      results.push({
        article_id: art.id,
        title: art.title,
        status: 'publish_failed',
        error: `Claim error: ${claimError.message}`
      });
      continue;
    }

    if (!claimedArticle) {
      console.log(`[Scheduler] Article "${art.title}" (${art.id}) was already claimed or published by another worker; skipping.`);
      continue;
    }

    console.log(`[Scheduler] Successfully claimed article "${claimedArticle.title}" (${claimedArticle.id}). Publishing...`);

    // 3. Publish through the shared publishing engine
    const pubRes = await publishArticle({
      articleId: claimedArticle.id,
      userId: claimedArticle.user_id,
      source: 'scheduler',
      isClaimed: true
    });

    processedCount++;

    if (pubRes.success) {
      successfulCount++;
      console.log(`[Scheduler] [SUCCESS] Published article "${art.title}" (${art.id}) -> ${pubRes.published_url}`);
      results.push({
        article_id: art.id,
        title: art.title,
        status: 'published',
        published_url: pubRes.published_url
      });
    } else {
      failedCount++;
      console.error(`[Scheduler] [FAILED] Could not publish article "${art.title}" (${art.id}): ${pubRes.error}`);
      results.push({
        article_id: art.id,
        title: art.title,
        status: 'publish_failed',
        error: pubRes.error || 'Publishing failed.'
      });
    }
  }

  console.log(`[Scheduler] Run finished: processed ${processedCount} (${successfulCount} successful, ${failedCount} failed).`);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    processed_count: processedCount,
    successful_count: successfulCount,
    failed_count: failedCount,
    results
  };
}

/**
 * Fallback handler in case Vercel attempts to bundle this file as a standalone API route.
 * Real endpoints are at /api/publishing/publish-article and /api/publishing/process-scheduled.
 */
export default async function handler(req: any, res: any) {
  if (res && typeof res.status === 'function') {
    return res.status(404).json({
      success: false,
      error: 'publishing-service is an internal service module, not a public HTTP endpoint.'
    });
  }
}

