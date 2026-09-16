import React from 'react';
import { useWebhookEnv } from '../services/webhookEnvService';
import { FlaskConical, Rocket } from 'lucide-react';

interface WebhookEnvToggleProps {
  id?: string;
  className?: string;
  showUrlTooltip?: boolean;
}

export const WebhookEnvToggle: React.FC<WebhookEnvToggleProps> = ({
  id = 'webhook-env-toggle-btn',
  className = '',
  showUrlTooltip = true,
}) => {
  const { mode, url, toggleMode, isProduction } = useWebhookEnv();

  return (
    <button
      id={id}
      type="button"
      onClick={toggleMode}
      title={
        showUrlTooltip
          ? `Active Webhook (${mode.toUpperCase()}):\n${url}\nClick to switch to ${
              isProduction ? 'Test' : 'Production'
            } mode`
          : `Click to switch to ${isProduction ? 'Test' : 'Production'} mode`
      }
      aria-label={`Toggle webhook environment mode (currently ${mode})`}
      className={`group relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none shadow-2xs hover:shadow-xs active:scale-[0.97] cursor-pointer ${
        isProduction
          ? 'border-emerald-200/90 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300'
          : 'border-amber-200/90 bg-amber-50/90 text-amber-800 hover:bg-amber-100 hover:border-amber-300'
      } ${className}`}
    >
      {/* Visual Mode Indicator Dot / Icon */}
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
        <span
          className={`h-2 w-2 rounded-full transition-colors ${
            isProduction ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        {isProduction && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
      </span>

      {/* Mode Icon */}
      {isProduction ? (
        <Rocket className="h-3 w-3 text-emerald-700 shrink-0" />
      ) : (
        <FlaskConical className="h-3 w-3 text-amber-700 shrink-0" />
      )}

      {/* Segment Text */}
      <span className="font-semibold tracking-tight text-[11px]">
        {isProduction ? 'Production' : 'Test'}
      </span>

      {/* Interactive Switch pill */}
      <span
        className={`ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider transition-colors ${
          isProduction
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-600 text-white'
        }`}
      >
        {isProduction ? 'PROD' : 'TEST'}
      </span>
    </button>
  );
};
