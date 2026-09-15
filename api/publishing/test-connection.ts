import 'dotenv/config';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * ============================================================
 * IntentWrite Publishing - Test Connection
 * ============================================================
 *
 * Endpoint:
 *
 *   POST /api/publishing/test-connection
 *
 * Expected body:
 *
 *   {
 *     "website_id": "..."
 *   }
 *
 * What this endpoint does:
 *
 * 1. Verifies the logged-in IntentWrite user.
 * 2. Finds that user's website connection.
 * 3. Reads the client's API URL and API key server-side.
 * 4. Calls the client's connection endpoint.
 * 5. Updates connection status in Supabase.
 * 6. Returns the connection result to the IntentWrite UI.
 *
 * IMPORTANT:
 *
 * - The client API key never goes to the browser.
 * - SUPABASE_SERVICE_ROLE_KEY is server-side only.
 * ============================================================
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // ==========================================================
  // 1. Only allow POST
  // ==========================================================

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed_methods: ['POST']
    });
  }

  // ==========================================================
  // 2. Read Supabase access token from Authorization header
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
  // 3. Read request body
  // ==========================================================

  const {
    website_id
  } = req.body || {};

  if (
    typeof website_id !== 'string' ||
    !website_id.trim()
  ) {
    return res.status(400).json({
      success: false,
      error: 'website_id is required.'
    });
  }

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
      'Missing Supabase server environment variables.'
    );

    return res.status(500).json({
      success: false,
      error:
        'Server database configuration is incomplete.'
    });
  }

  // ==========================================================
  // 5. Verify the IntentWrite user
  // ==========================================================
  //
  // We use the user's access token here.
  // This proves who is making the request.
  //
  // ==========================================================

  const authClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );

  const {
    data: {
      user
    },
    error: authError
  } = await authClient.auth.getUser();

  if (
    authError ||
    !user
  ) {
    console.error(
      'IntentWrite user authentication failed:',
      authError
    );

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired user session.'
    });
  }

  // ==========================================================
  // 6. Create privileged server-side Supabase client
  // ==========================================================
  //
  // This client is NEVER sent to the browser.
  //
  // ==========================================================

  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey
  );

  // ==========================================================
  // 7. Find the website connection
  // ==========================================================

  const {
    data: connection,
    error: connectionError
  } = await adminClient
    .from('website_connections')
    .select(
      'id, website_id, user_id, platform, connection_type, credentials, configuration, status'
    )
    .eq('website_id', website_id.trim())
    .eq('user_id', user.id)
    .maybeSingle();

  if (connectionError) {
    console.error(
      'Failed to load website connection:',
      connectionError
    );

    return res.status(500).json({
      success: false,
      error:
        'Could not load the website connection.'
    });
  }

  if (!connection) {
    return res.status(404).json({
      success: false,
      error:
        'No publishing connection found for this website.'
    });
  }

  // ==========================================================
  // 8. Read connection configuration
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
        'Publishing API URL is missing from the connection.'
    });
  }

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error:
        'Publishing API key is missing from the connection.'
    });
  }

  // ==========================================================
  // 9. Test the client's IntentWrite connection endpoint
  // ==========================================================

  const connectionTestUrl =
    apiUrl.endsWith('/articles')
      ? apiUrl.replace(
          /\/articles\/?$/,
          '/connection'
        )
      : apiUrl.endsWith('/')
        ? `${apiUrl}connection`
        : `${apiUrl}/connection`;

  let clientResponse: Response;

  try {

    clientResponse = await fetch(
      connectionTestUrl,
      {
        method: 'GET',

        headers: {
          'Authorization':
            `Bearer ${apiKey}`,

          'Accept':
            'application/json'
        },

        signal:
          AbortSignal.timeout(10000)
      }
    );

  } catch (error) {

    console.error(
      'Client connection request failed:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Connection request failed.';

    await adminClient
      .from('website_connections')
      .update({
        status: 'error',
        last_tested_at:
          new Date().toISOString(),
        last_error:
          message,
        updated_at:
          new Date().toISOString()
      })
      .eq('id', connection.id);

    return res.status(502).json({
      success: false,
      connected: false,
      error:
        'Could not reach the client website.',
      details:
        message
    });
  }

  // ==========================================================
  // 10. Read client response safely
  // ==========================================================

  let clientData: any = null;

  try {
    clientData =
      await clientResponse.json();
  } catch {
    clientData = null;
  }

  // ==========================================================
  // 11. Handle failed connection
  // ==========================================================

  if (!clientResponse.ok) {

    const errorMessage =
      clientData?.error ||
      `Client API returned HTTP ${clientResponse.status}.`;

    await adminClient
      .from('website_connections')
      .update({
        status: 'error',
        last_tested_at:
          new Date().toISOString(),
        last_error:
          errorMessage,
        updated_at:
          new Date().toISOString()
      })
      .eq('id', connection.id);

    return res.status(502).json({
      success: false,
      connected: false,
      error:
        'Client website rejected the connection test.',
      client_status:
        clientResponse.status
    });
  }

  // ==========================================================
  // 12. Mark connection as connected
  // ==========================================================

  const testedAt =
    new Date().toISOString();

  const {
    error: updateError
  } = await adminClient
    .from('website_connections')
    .update({
      status: 'connected',
      last_tested_at:
        testedAt,
      last_error: null,
      updated_at:
        testedAt
    })
    .eq('id', connection.id);

  if (updateError) {
    console.error(
      'Failed to update connection status:',
      updateError
    );

    return res.status(500).json({
      success: false,
      error:
        'Connection worked, but the connection status could not be saved.'
    });
  }

  // ==========================================================
  // 13. Return success
  // ==========================================================

  return res.status(200).json({
    success: true,
    connected: true,

    website_id:
      connection.website_id,

    platform:
      connection.platform,

    connection_type:
      connection.connection_type,

    message:
      'Website connection verified successfully.',

    tested_at:
      testedAt,

    client_response: {
      success:
        clientData?.success ?? true,

      service:
        clientData?.service ?? null,

      version:
        clientData?.version ?? null
    }
  });
}