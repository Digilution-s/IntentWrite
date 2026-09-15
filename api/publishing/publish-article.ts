import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * ============================================================
 * IntentWrite Publishing Engine
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
 *
 *   1. Authenticate the IntentWrite user.
 *   2. Load the article owned by that user.
 *   3. Find the website connection for the article.
 *   4. Read client API credentials server-side.
 *   5. Mark article as "publishing".
 *   6. Send the article to the client website.
 *   7. Receive the published URL.
 *   8. Update IntentWrite article status.
 *   9. Return the result.
 *
 * SECURITY:
 *
 * - Client website API keys NEVER go to the browser.
 * - Supabase service-role key is SERVER-SIDE ONLY.
 * - Users can only publish their own articles.
 *
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

  const authorization =
    req.headers.authorization || '';

  const accessToken =
    authorization.startsWith('Bearer ')
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

  const {
    article_id
  } = req.body || {};

  if (
    typeof article_id !== 'string' ||
    !article_id.trim()
  ) {
    return res.status(400).json({
      success: false,
      error: 'article_id is required.'
    });
  }

  const cleanArticleId =
    article_id.trim();

  // ==========================================================
  // 4. Server environment variables
  // ==========================================================

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !serviceRoleKey
  ) {
    console.error(
      'Publishing server is missing Supabase environment variables.'
    );

    return res.status(500).json({
      success: false,
      error:
        'Publishing server configuration is incomplete.'
    });
  }

  // ==========================================================
  // 5. Verify the logged-in IntentWrite user
  // ==========================================================

  const authClient =
    createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization:
              `Bearer ${accessToken}`
          }
        }
      }
    );

  const {
    data: {
      user
    },
    error: authError
  } =
    await authClient.auth.getUser();

  if (
    authError ||
    !user
  ) {
    console.error(
      'Publishing user authentication failed:',
      authError
    );

    return res.status(401).json({
      success: false,
      error:
        'Invalid or expired IntentWrite session.'
    });
  }

  // ==========================================================
  // 6. Create privileged server-side Supabase client
  // ==========================================================

  const adminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey
    );

  // ==========================================================
  // 7. Load article
  // ==========================================================
  //
  // IMPORTANT:
  // We filter by user_id so one user cannot publish
  // another user's article.
  //
  // ==========================================================

  const {
    data: article,
    error: articleError
  } =
    await adminClient
      .from('articles')
      .select('*')
      .eq('id', cleanArticleId)
      .eq('user_id', user.id)
      .maybeSingle();

  if (articleError) {
    console.error(
      'Failed to load article:',
      articleError
    );

    return res.status(500).json({
      success: false,
      error:
        'Could not load the article.'
    });
  }

  if (!article) {
    return res.status(404).json({
      success: false,
      error:
        'Article not found or does not belong to this user.'
    });
  }

  // ==========================================================
  // 8. Idempotency:
  //    If already published, don't publish again.
  // ==========================================================

  if (
    article.status === 'published' &&
    article.published_url
  ) {
    return res.status(200).json({
      success: true,
      already_published: true,
      article_id: article.id,
      published_url:
        article.published_url,
      published_at:
        article.published_at
    });
  }

  // ==========================================================
  // 9. Find the website connection
  // ==========================================================

  const {
    data: connection,
    error: connectionError
  } =
    await adminClient
      .from('website_connections')
      .select(
        'id, website_id, user_id, platform, connection_type, credentials, configuration, status'
      )
      .eq(
        'website_id',
        article.website_id
      )
      .eq(
        'user_id',
        user.id
      )
      .maybeSingle();

  if (connectionError) {
    console.error(
      'Failed to load website connection:',
      connectionError
    );

    return res.status(500).json({
      success: false,
      error:
        'Could not load the website publishing connection.'
    });
  }

  if (!connection) {
    return res.status(404).json({
      success: false,
      error:
        'No publishing connection is configured for this website.'
    });
  }

  // ==========================================================
  // 10. Check connection type
  // ==========================================================

  if (
    connection.platform !== 'custom_api'
  ) {
    return res.status(400).json({
      success: false,
      error:
        `Platform "${connection.platform}" is not yet supported by this publishing endpoint.`
    });
  }

  // ==========================================================
  // 11. Read credentials/configuration server-side
  // ==========================================================

  const credentials =
    connection.credentials || {};

  const configuration =
    connection.configuration || {};

  const apiUrl =
    typeof configuration.api_url === 'string'
      ? configuration.api_url.trim()
      : '';

  const apiKey =
    typeof credentials.api_key === 'string'
      ? credentials.api_key.trim()
      : '';

  if (!apiUrl) {
    return res.status(400).json({
      success: false,
      error:
        'Client publishing API URL is missing.'
    });
  }

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error:
        'Client publishing API key is missing.'
    });
  }

  // ==========================================================
  // 12. Mark article as publishing
  // ==========================================================

  const publishingStartedAt =
    new Date().toISOString();

  const {
    error: publishingStatusError
  } =
    await adminClient
      .from('articles')
      .update({
        status: 'publishing',
        updated_at:
          publishingStartedAt
      })
      .eq('id', article.id)
      .eq('user_id', user.id);

  if (publishingStatusError) {
    console.error(
      'Failed to mark article as publishing:',
      publishingStatusError
    );

    return res.status(500).json({
      success: false,
      error:
        'Could not update article publishing status.'
    });
  }

  // ==========================================================
  // 13. Prepare article payload
  // ==========================================================
  //
  // This matches the IntentWrite client API we built
  // and tested on Digilutions.
  //
  // ==========================================================

  const publishPayload = {
    title:
      article.title,

    slug:
      article.slug,

    content:
      article.content,

    excerpt:
      article.excerpt || '',

    meta_title:
      article.meta_title ||
      article.title,

    meta_description:
      article.meta_description || '',

    /*
     * The current IntentWrite `articles` table does not
     * currently contain a featured_image column.
     *
     * We therefore send an empty value for now.
     * Image publishing can be added when image storage
     * is integrated into the article pipeline.
     */
    featured_image:
      '',

    category:
      'IntentWrite',

    tags:
      Array.isArray(article.secondary_keywords)
        ? article.secondary_keywords
        : [],

    author:
      'IntentWrite',

    status:
      'published'
  };

  // ==========================================================
  // 14. Send article to client website
  // ==========================================================

  let clientResponse: Response;

  try {

    clientResponse =
      await fetch(
        apiUrl,
        {
          method: 'POST',

          headers: {
            'Authorization':
              `Bearer ${apiKey}`,

            'Content-Type':
              'application/json',

            'Accept':
              'application/json',

            /*
             * Helps the client identify this as
             * an IntentWrite publishing request.
             */
            'X-IntentWrite-Version':
              '1.0'
          },

          body:
            JSON.stringify(
              publishPayload
            ),

          signal:
            AbortSignal.timeout(
              20000
            )
        }
      );

  } catch (error) {

    console.error(
      'Client publishing request failed:',
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Client website request failed.';

    // --------------------------------------------------------
    // Mark article as failed
    // --------------------------------------------------------

    await adminClient
      .from('articles')
      .update({
        status:
          'publish_failed',

        updated_at:
          new Date().toISOString()
      })
      .eq(
        'id',
        article.id
      );

    return res.status(502).json({
      success: false,
      error:
        'Could not reach the client website.',
      details:
        errorMessage
    });
  }

  // ==========================================================
  // 15. Read client response
  // ==========================================================

  let clientData: any = null;

  try {
    clientData =
      await clientResponse.json();
  } catch {
    clientData =
      null;
  }

  // ==========================================================
  // 16. Client rejected/failed the publish
  // ==========================================================

  if (!clientResponse.ok) {

    console.error(
      'Client publishing API returned:',
      clientResponse.status,
      clientData
    );

    await adminClient
      .from('articles')
      .update({
        status:
          'publish_failed',

        updated_at:
          new Date().toISOString()
      })
      .eq(
        'id',
        article.id
      );

    return res.status(502).json({
      success: false,

      error:
        'Client website rejected the article.',

      client_status:
        clientResponse.status,

      client_error:
        clientData?.error || null
    });
  }

  // ==========================================================
  // 17. Extract published URL
  // ==========================================================

  const publishedUrl =
    typeof clientData?.url === 'string'
      ? clientData.url.trim()
      : '';

  if (!publishedUrl) {

    console.error(
      'Client publish succeeded but no URL was returned.',
      clientData
    );

    await adminClient
      .from('articles')
      .update({
        status:
          'publish_failed',

        updated_at:
          new Date().toISOString()
      })
      .eq(
        'id',
        article.id
      );

    return res.status(502).json({
      success: false,
      error:
        'Client website accepted the article but did not return a published URL.'
    });
  }

  // ==========================================================
  // 18. Mark article as published
  // ==========================================================

  const publishedAt =
    new Date().toISOString();

  const {
    data: updatedArticle,
    error: finalUpdateError
  } =
    await adminClient
      .from('articles')
      .update({

        status:
          'published',

        published_url:
          publishedUrl,

        published_at:
          publishedAt,

        updated_at:
          publishedAt

      })
      .eq(
        'id',
        article.id
      )
      .eq(
        'user_id',
        user.id
      )
      .select(
        'id, status, published_url, published_at'
      )
      .single();

  if (finalUpdateError) {

    console.error(
      'Article was published but IntentWrite could not save final status:',
      finalUpdateError
    );

    return res.status(500).json({
      success: false,

      error:
        'Article was published to the client website, but IntentWrite could not save the publishing result.',

      published_url:
        publishedUrl
    });
  }

  // ==========================================================
  // 19. Success
  // ==========================================================

  return res.status(200).json({

    success:
      true,

    message:
      'Article published successfully.',

    article_id:
      updatedArticle.id,

    status:
      updatedArticle.status,

    published_url:
      updatedArticle.published_url,

    published_at:
      updatedArticle.published_at
  });
}