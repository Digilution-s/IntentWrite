import { Website } from '../types';

export const DEFAULT_WEBSITE_ANALYZE_WEBHOOK =
  'https://n8n.kuhaanelectric.com/webhook-test/website/analyze';

export function getWebsiteAnalyzeWebhookUrl(): string {
  const envUrl =
    typeof import.meta !== 'undefined'
      ? (import.meta as any).env?.VITE_N8N_WEBSITE_ANALYZE_WEBHOOK
      : '';
  return (envUrl || DEFAULT_WEBSITE_ANALYZE_WEBHOOK).trim();
}

export interface WebsiteAnalyzePayload {
  action: 'reanalyze' | 'website_analyze';
  website_id: string;
  url: string;
  name: string;
  business_name: string;
  business_description: string;
  industry: string;
  target_audience: string;
  products_services: string;
  location?: string;
  brand_voice?: string;
  additional_info?: string;
  timestamp: string;
  user_id?: string;
}

export interface TriggerWebsiteAnalyzeResult {
  success: boolean;
  status?: number;
  message: string;
  data?: any;
  isTestModeWaiting?: boolean;
  isBackgroundProcessing?: boolean;
}

/**
 * Triggers the n8n website analysis webhook.
 * Dispatches via the backend /api/webhook/website-analyze proxy (avoiding browser CORS limits)
 * and falls back to direct client-side fetch if necessary.
 */
export async function triggerWebsiteAnalyzeWebhook(
  website: Partial<Website>,
  customUrl?: string,
  userId?: string
): Promise<TriggerWebsiteAnalyzeResult> {
  const targetWebhookUrl = (customUrl || getWebsiteAnalyzeWebhookUrl()).trim();

  const payload: WebsiteAnalyzePayload = {
    action: 'reanalyze',
    website_id: website.id || '',
    url: website.url || '',
    name: website.name || '',
    business_name: website.name || '',
    business_description: website.businessDescription || '',
    industry: website.industry || '',
    target_audience: website.targetAudience || '',
    products_services: website.productsServices || '',
    location: website.location || '',
    brand_voice: website.brandVoice || 'Professional',
    additional_info: website.additionalInfo || '',
    user_id: userId || '',
    timestamp: new Date().toISOString(),
  };

  // 1. First attempt: call local server proxy to bypass CORS
  try {
    const proxyRes = await fetch('/api/webhook/website-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhookUrl: targetWebhookUrl,
        payload,
      }),
    });

    if (proxyRes.ok) {
      const result = await proxyRes.json();
      if (result.ok || result.success || (result.status >= 200 && result.status < 300)) {
        return {
          success: true,
          status: result.status || 200,
          message: 'Website analysis triggered successfully in n8n!',
          data: result.data,
        };
      }

      // Check for n8n's specific 404 test mode hint
      const errData = result.data || {};
      const errMsg = errData.message || result.error || '';
      const errHint = errData.hint || '';

      if (
        result.status === 404 &&
        (errMsg.includes('not registered') || errHint.includes('Execute workflow'))
      ) {
        return {
          success: false,
          status: 404,
          isTestModeWaiting: true,
          message:
            "Analysis service is preparing: Please ensure your automated workflow is active, then click 'Re-analyze Website' again.",
          data: errData,
        };
      }

      // 524 is Cloudflare timeout: Origin received the request and is still processing,
      // but Cloudflare cut off the HTTP connection after 100 seconds of waiting.
      if (result.status === 524) {
        return {
          success: true,
          status: 524,
          isBackgroundProcessing: true,
          message: 'Website analysis was received and is currently processing in the background.',
          data: errData,
        };
      }

      return {
        success: false,
        status: result.status,
        message: errMsg || `Analysis service responded with status ${result.status}`,
        data: errData,
      };
    }
  } catch (proxyErr) {
    console.warn('Proxy webhook call error, falling back to direct fetch:', proxyErr);
  }

  // 2. Fallback: Direct client-side fetch
  try {
    const directRes = await fetch(targetWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const directText = await directRes.text();
    let directData: any = null;
    try {
      directData = JSON.parse(directText);
    } catch {
      directData = { text: directText };
    }

    if (directRes.ok) {
      return {
        success: true,
        status: directRes.status,
        message: 'Website analysis triggered successfully!',
        data: directData,
      };
    }

    if (
      directRes.status === 404 &&
      (directData?.message?.includes('not registered') || directData?.hint)
    ) {
      return {
        success: false,
        status: 404,
        isTestModeWaiting: true,
        message:
          'Analysis service is in test mode. Please start the test session and try again.',
        data: directData,
      };
    }

    if (directRes.status === 524) {
      return {
        success: true,
        status: 524,
        isBackgroundProcessing: true,
        message: 'Website analysis was received and is currently processing in the background.',
        data: directData,
      };
    }

    return {
      success: false,
      status: directRes.status,
      message: directData?.message || `Service returned status ${directRes.status}`,
      data: directData,
    };
  } catch (directErr: any) {
    return {
      success: false,
      message:
        directErr.message?.includes('Failed to fetch')
          ? 'Network limitation communicating with the service. Please verify your connection.'
          : directErr.message || 'Failed to dispatch analysis request',
    };
  }
}
