/**
 * Webhook Environment Service
 *
 * Manages switching between Test and Production webhook modes for n8n content generation.
 *
 * Test: https://n8n.kuhaanelectric.com/webhook-test/content/generate
 * Production: https://n8n.kuhaanelectric.com/webhook/content/generate
 */

export type WebhookEnvMode = 'test' | 'production';

export const WEBHOOK_URLS = {
  test: 'https://n8n.kuhaanelectric.com/webhook-test/content/generate',
  production: 'https://n8n.kuhaanelectric.com/webhook/content/generate',
} as const;

const STORAGE_KEY = 'intentwrite_webhook_env_mode';
const CHANGE_EVENT = 'intentwrite_webhook_env_change';

/**
 * Reads the current webhook environment mode.
 * Defaults to 'test' if not explicitly set.
 */
export function getWebhookEnvMode(): WebhookEnvMode {
  if (typeof window === 'undefined') return 'test';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'production' || saved === 'test') {
      return saved;
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return 'test';
}

/**
 * Sets the webhook environment mode and dispatches a cross-component change event.
 */
export function setWebhookEnvMode(mode: WebhookEnvMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, {
        detail: { mode, url: WEBHOOK_URLS[mode] },
      })
    );
  } catch {
    // Ignore localStorage access restrictions
  }
}

/**
 * Returns the currently active n8n content generation webhook URL.
 */
export function getContentGenerateWebhookUrl(): string {
  const mode = getWebhookEnvMode();
  return WEBHOOK_URLS[mode];
}

/**
 * React hook to observe and change the webhook environment mode.
 */
import { useState, useEffect } from 'react';

export function useWebhookEnv(): {
  mode: WebhookEnvMode;
  url: string;
  setMode: (mode: WebhookEnvMode) => void;
  toggleMode: () => void;
  isProduction: boolean;
} {
  const [mode, setModeState] = useState<WebhookEnvMode>(() => getWebhookEnvMode());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'test' || e.newValue === 'production')) {
        setModeState(e.newValue);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: WebhookEnvMode }>;
      if (customEvent.detail?.mode) {
        setModeState(customEvent.detail.mode);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CHANGE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CHANGE_EVENT, handleCustomEvent);
    };
  }, []);

  const setMode = (newMode: WebhookEnvMode) => {
    setModeState(newMode);
    setWebhookEnvMode(newMode);
  };

  const toggleMode = () => {
    const nextMode: WebhookEnvMode = mode === 'test' ? 'production' : 'test';
    setMode(nextMode);
  };

  return {
    mode,
    url: WEBHOOK_URLS[mode],
    setMode,
    toggleMode,
    isProduction: mode === 'production',
  };
}
