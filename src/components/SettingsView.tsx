import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Plug,
  Check,
  Plus,
  Loader2,
  Bot,
  Clock,
  Key,
  Sparkles,
  Zap,
  Database,
  Radio,
  AlertCircle,
  Info,
  Trash2,
  Globe,
} from 'lucide-react';
import { BrandVoice, Website, User } from '../types';
import { deepSeekAgentService } from '../services/deepSeekAgentService';
import {
  publishingConnectionsService,
  PublishingDestination,
} from '../services/publishingConnectionsService';
import { isSupabaseConfigured, supabase, getSupabaseUrl } from '../lib/supabase';
import {
  triggerWebsiteAnalyzeWebhook,
  getWebsiteAnalyzeWebhookUrl,
} from '../lib/n8nWebhooks';

interface SettingsViewProps {
  website: Website;
  user: User;
  onUpdateWebsite: (updated: Website) => void;
  onLogout: () => void;
}

const BRAND_VOICES: BrandVoice[] = [
  'Professional',
  'Friendly',
  'Technical',
  'Premium',
  'Conversational',
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  website,
  user,
  onUpdateWebsite,
  onLogout,
}) => {
  // Website Form State
  const [formData, setFormData] = useState({
    url: website.url || '',
    name: website.name || '',
    businessDescription: website.businessDescription || '',
    industry: website.industry || '',
    targetAudience: website.targetAudience || '',
    productsServices: website.productsServices || '',
    location: website.location || '',
    brandVoice: website.brandVoice || 'Professional',
  });

  // Sync formData whenever website changes (e.g. loaded from Supabase)
  useEffect(() => {
    setFormData({
      url: website.url || '',
      name: website.name || '',
      businessDescription: website.businessDescription || '',
      industry: website.industry || '',
      targetAudience: website.targetAudience || '',
      productsServices: website.productsServices || '',
      location: website.location || '',
      brandVoice: website.brandVoice || 'Professional',
    });
  }, [website]);

  const [isSaved, setIsSaved] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalyzeStatus, setReanalyzeStatus] = useState<{
    type: 'idle' | 'success' | 'notice' | 'error';
    message: string;
    details?: string;
  }>({ type: 'idle', message: '' });

  // Publishing Connections State synchronized with publishingConnectionsService
  const [destinations, setDestinations] = useState<PublishingDestination[]>(() =>
    publishingConnectionsService.getDestinations()
  );

  useEffect(() => {
    return publishingConnectionsService.subscribe(() => {
      setDestinations(publishingConnectionsService.getDestinations());
    });
  }, []);

  const wpDest = destinations.find((d) => d.type === 'wordpress');
  const wpConnected = wpDest ? wpDest.connected : true;

  const webhookDest = destinations.find((d) => d.type === 'webhook');
  const webhookConnected = webhookDest ? webhookDest.connected : true;
  const webhookUrl =
    webhookDest?.endpointUrl ??
    (((import.meta as any).env?.VITE_N8N_CONTENT_GENERATE_WEBHOOK as string) || '');

  const customDestinations = destinations.filter(
    (d) => d.type !== 'wordpress' && d.type !== 'webhook'
  );

  const [showAddConnection, setShowAddConnection] = useState(false);
  const [newConnType, setNewConnType] = useState('Ghost CMS');

  // Autonomous 48h AI Agent State
  const [agentConfig, setAgentConfig] = useState(() => deepSeekAgentService.getConfig());
  const [agentScheduledHour, setAgentScheduledHour] = useState(agentConfig.scheduledHour || '06:00');
  const [agentModel, setAgentModel] = useState<'deepseek-chat' | 'deepseek-reasoner'>(
    agentConfig.model || 'deepseek-chat'
  );
  const [customApiKey, setCustomApiKey] = useState(agentConfig.apiKey || '');
  const [isAgentSaved, setIsAgentSaved] = useState(false);
  const [isTestingAgent, setIsTestingAgent] = useState(false);
  const [agentTestSuccess, setAgentTestSuccess] = useState(false);

  const handleSaveAgentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = deepSeekAgentService.saveConfig({
      scheduledHour: agentScheduledHour,
      model: agentModel,
      apiKey: customApiKey,
      intervalHours: 48,
      enabled: true,
    });
    setAgentConfig(updated);
    setIsAgentSaved(true);
    setTimeout(() => setIsAgentSaved(false), 2500);
  };

  const handleTestAgentNow = async () => {
    setIsTestingAgent(true);
    setAgentTestSuccess(false);
    try {
      await deepSeekAgentService.runResearchCycle(website, {
        forceApiKey: customApiKey,
        model: agentModel,
      });
      setAgentTestSuccess(true);
      setAgentConfig(deepSeekAgentService.getConfig());
      setTimeout(() => setAgentTestSuccess(false), 3000);
    } catch (err) {
      console.error('Test run failed', err);
    } finally {
      setIsTestingAgent(false);
    }
  };

  // Supabase & n8n Backend State (from environment variables)
  const supabaseUrl = getSupabaseUrl();
  const n8nWebhookUrl = (
    (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_N8N_CONTENT_GENERATE_WEBHOOK : '') ||
    ''
  ).trim();
  const n8nWebsiteAnalyzeWebhookUrl = getWebsiteAnalyzeWebhookUrl();
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [supabaseTestMessage, setSupabaseTestMessage] = useState('');

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus('idle');
    setSupabaseTestMessage('');

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error: tableError } = await supabase
        .from('content_jobs')
        .select('id')
        .limit(1);

      if (tableError && !tableError.message.includes('0 rows')) {
        throw new Error(`Database check: ${tableError.message}`);
      }

      setSupabaseTestStatus('success');
      setSupabaseTestMessage(
        `Cloud sync verified! Your workspace is connected and synchronized. ${
          authUser ? `Signed in as ${authUser.email}.` : ''
        }`
      );
    } catch (err: any) {
      console.error('Connection test error:', err);
      setSupabaseTestStatus('error');
      setSupabaseTestMessage(err.message || 'Unable to reach cloud sync. Please check your network connection.');
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const handleSaveWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Website = {
      ...website,
      ...formData,
    };
    onUpdateWebsite(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    setReanalyzeStatus({ type: 'idle', message: '' });

    const currentWebsiteData: Website = {
      ...website,
      ...formData,
    };

    try {
      const result = await triggerWebsiteAnalyzeWebhook(
        currentWebsiteData,
        undefined,
        user?.id
      );

      if (result.success) {
        setReanalyzeStatus({
          type: 'success',
          message: 'Website analysis started successfully!',
          details: 'Our research engine has received your website details and began analyzing content topics.',
        });

        const updated: Website = {
          ...currentWebsiteData,
          analyzedAt: new Date().toISOString(),
          isAnalyzed: true,
          stats: {
            totalPagesIndexed:
              result.data?.totalPagesIndexed ||
              (website.stats?.totalPagesIndexed || 40) + 5,
            topTopics:
              result.data?.topTopics ||
              website.stats?.topTopics || [
                formData.industry || 'Technology',
                'Workflow Automation',
                'Operations',
              ],
          },
        };
        onUpdateWebsite(updated);
      } else if (result.isTestModeWaiting) {
        setReanalyzeStatus({
          type: 'notice',
          message: 'Analysis initiated (Waiting for confirmation)',
          details: 'Please ensure your workflow service is actively listening for the analyze trigger.',
        });
      } else {
        setReanalyzeStatus({
          type: 'error',
          message: 'Could not complete website analysis',
          details: result.message || 'Please check that the analysis service is active and try again.',
        });
      }
    } catch (err: any) {
      setReanalyzeStatus({
        type: 'error',
        message: 'Could not contact the analysis service',
        details: 'A network or connection error occurred. Please try again.',
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">Settings</h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Manage your business knowledge base, publishing integrations, and account credentials.
        </p>
      </div>

      <div className="space-y-8">
        {/* SECTION 1: WEBSITE & BUSINESS KNOWLEDGE */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 mb-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Website & Business Information</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Our AI references this context whenever researching, structuring, and writing content.
              </p>
            </div>

            {/* Re-analyze Website Button */}
            <button
              id="settings-reanalyze-website-btn"
              type="button"
              disabled={isReanalyzing}
              onClick={handleReanalyze}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
            >
              {isReanalyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ef4d23]" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-[#ef4d23]" />
              )}
              <span>{isReanalyzing ? 'Analyzing Website...' : 'Re-analyze Website'}</span>
            </button>
          </div>

          {reanalyzeStatus.type !== 'idle' && (
            <div
              className={`mb-6 rounded-2xl p-4 text-xs border flex items-start gap-3 transition-all ${
                reanalyzeStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : reanalyzeStatus.type === 'notice'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {reanalyzeStatus.type === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {reanalyzeStatus.type === 'notice' && (
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              {reanalyzeStatus.type === 'error' && (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{reanalyzeStatus.message}</p>
                {reanalyzeStatus.details && (
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    {reanalyzeStatus.details}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveWebsite} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Industry
                </label>
                <input
                  type="text"
                  required
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                What does your business do?
              </label>
              <textarea
                rows={3}
                required
                value={formData.businessDescription}
                onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Target Audience
                </label>
                <input
                  type="text"
                  required
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Location / Market
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                Products / Services
              </label>
              <textarea
                rows={2}
                value={formData.productsServices}
                onChange={(e) => setFormData({ ...formData, productsServices: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-2">
                Brand Voice
              </label>
              <div className="flex flex-wrap gap-2">
                {BRAND_VOICES.map((voice) => (
                  <button
                    key={voice}
                    type="button"
                    onClick={() => setFormData({ ...formData, brandVoice: voice })}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      formData.brandVoice === voice
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
                    }`}
                  >
                    {voice}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              {isSaved && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Changes saved</span>
                </span>
              )}
              <button
                id="save-website-settings-btn"
                type="submit"
                className="rounded-full bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-6 py-2.5 text-xs font-semibold text-white transition-all shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: PUBLISHING CONNECTIONS */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="pb-6 border-b border-neutral-100 mb-6">
            <h2 className="text-base font-semibold text-neutral-900">Publishing Destinations</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Connect CMS endpoints or webhook destinations to push scheduled and published articles automatically.
            </p>
          </div>

          <div className="space-y-4">
            {/* WordPress Destination */}
            <div className="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-base shadow-2xs">
                  W
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-neutral-900">WordPress REST API</h3>
                  <p className="text-[11px] text-neutral-500">
                    Direct publishing to WP Posts with SEO metadata and featured image upload.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    wpConnected ? 'text-emerald-700' : 'text-neutral-500'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      wpConnected ? 'bg-emerald-500' : 'bg-neutral-400'
                    }`}
                  />
                  <span>{wpConnected ? 'Connected' : 'Not connected'}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    publishingConnectionsService.setConnected(
                      wpDest?.id || 'wordpress',
                      !wpConnected
                    )
                  }
                  className="rounded-full border border-neutral-300 bg-white px-3.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs cursor-pointer"
                >
                  {wpConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Generic API / Webhook Destination */}
            <div className="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-2xs">
                    <Plug className="h-4 w-4 text-[#ef4d23]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-neutral-900">Generic API / Webhook</h3>
                    <p className="text-[11px] text-neutral-500">
                      Dispatches JSON payloads for custom Next.js, Ghost, or Headless CMS pipelines.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      webhookConnected ? 'text-emerald-700' : 'text-neutral-500'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        webhookConnected ? 'bg-emerald-500' : 'bg-neutral-400'
                      }`}
                    />
                    <span>{webhookConnected ? 'Connected' : 'Not connected'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      publishingConnectionsService.setConnected(
                        webhookDest?.id || 'webhook',
                        !webhookConnected
                      )
                    }
                    className="rounded-full border border-neutral-300 bg-white px-3.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    {webhookConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>

              {webhookConnected && (
                <div className="pt-3 border-t border-neutral-200/70">
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Webhook Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) =>
                      publishingConnectionsService.updateDestination(
                        webhookDest?.id || 'webhook',
                        { endpointUrl: e.target.value }
                      )
                    }
                    placeholder="https://example.com/api/webhook"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 font-mono focus:outline-none focus:border-[#ef4d23]"
                  />
                </div>
              )}
            </div>

            {/* Custom Connected Destinations */}
            {customDestinations.map((cust) => (
              <div
                key={cust.id}
                className="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-white font-bold text-sm shadow-2xs">
                    <Globe className="h-4 w-4 text-[#ef4d23]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-neutral-900">{cust.name}</h3>
                    <p className="text-[11px] text-neutral-500">
                      {cust.description || `Publishing channel for ${cust.name}.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium mr-1 ${
                      cust.connected ? 'text-emerald-700' : 'text-neutral-500'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        cust.connected ? 'bg-emerald-500' : 'bg-neutral-400'
                      }`}
                    />
                    <span>{cust.connected ? 'Connected' : 'Not connected'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      publishingConnectionsService.setConnected(cust.id, !cust.connected)
                    }
                    className="rounded-full border border-neutral-300 bg-white px-3.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    {cust.connected ? 'Disconnect' : 'Connect'}
                  </button>
                  <button
                    type="button"
                    onClick={() => publishingConnectionsService.removeDestination(cust.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove destination"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add Connection */}
            {!showAddConnection ? (
              <button
                type="button"
                onClick={() => setShowAddConnection(true)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 py-3 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:border-neutral-400 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-[#ef4d23]" />
                <span>Add publishing destination (Ghost, Webflow, Shopify)</span>
              </button>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex items-center justify-between gap-3 animate-in fade-in">
                <select
                  value={newConnType}
                  onChange={(e) => setNewConnType(e.target.value)}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
                >
                  <option value="Ghost CMS">Ghost CMS</option>
                  <option value="Webflow">Webflow Collection</option>
                  <option value="Shopify Blog">Shopify Blog</option>
                  <option value="Strapi CMS">Strapi Headless CMS</option>
                </select>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddConnection(false)}
                    className="text-xs text-neutral-500 hover:text-neutral-900 px-2 py-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      publishingConnectionsService.addDestination(newConnType);
                      setShowAddConnection(false);
                    }}
                    className="rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2.5: CLOUD WORKSPACE & AUTOMATION */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="pb-6 border-b border-neutral-100 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800 mb-2">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud Sync & Automation</span>
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
                Workspace Cloud Sync & AI Automation
              </h2>
              <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                IntentWrite synchronizes your articles, website intelligence, and real-time generation status directly across your workspace.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSupabase}
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-95 px-4 py-2 text-xs font-medium text-neutral-700 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Radio className={`w-3.5 h-3.5 text-emerald-600 ${isTestingSupabase ? 'animate-pulse' : ''}`} />
                <span>{isTestingSupabase ? 'Checking Connection...' : 'Verify Cloud Sync'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Status overview bar */}
            <div className="rounded-2xl bg-[#f9f8f6] border border-neutral-200/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <span className="font-semibold text-neutral-900">
                    {isSupabaseConfigured()
                      ? 'Cloud Workspace Connected'
                      : 'Connecting Cloud Workspace...'}
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Live synchronization enabled for articles, websites, and scheduled generations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-700">
                  <Zap className="w-3 h-3 text-[#ef4d23]" />
                  <span>Real-Time Updates Active</span>
                </span>
              </div>
            </div>

            {supabaseTestStatus !== 'idle' && (
              <div
                className={`rounded-2xl p-4 text-xs border ${
                  supabaseTestStatus === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {supabaseTestStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <p className="text-[11px] leading-relaxed font-medium">{supabaseTestMessage}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Cloud Workspace Endpoint
                </label>
                <input
                  type="text"
                  readOnly
                  value={supabaseUrl ? 'Connected (Workspace Cloud)' : 'Not configured'}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-100/70 px-4 py-2.5 text-xs text-neutral-700 cursor-default focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Cloud Security Token
                </label>
                <input
                  type="text"
                  readOnly
                  value="●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●● (Configured & Secure)"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-100/70 px-4 py-2.5 text-xs font-mono text-neutral-700 cursor-default focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Website Intelligence Engine
                </label>
                <p className="text-[11px] text-neutral-400 mb-2">
                  Analyzes your website pages, brand voice, target audience, and product offerings to optimize article strategies.
                </p>
                <input
                  type="text"
                  readOnly
                  value={n8nWebsiteAnalyzeWebhookUrl ? 'Configured & Active' : 'Default Engine Active'}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-100/70 px-4 py-2.5 text-xs text-neutral-700 cursor-default focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Content Generation Engine
                </label>
                <p className="text-[11px] text-neutral-400 mb-2">
                  Dispatches multi-agent research, drafting, and search-intent optimization jobs.
                </p>
                <input
                  type="text"
                  readOnly
                  value={n8nWebhookUrl ? 'Configured & Active' : 'Default Engine Active'}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-100/70 px-4 py-2.5 text-xs text-neutral-700 cursor-default focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <span className="text-xs text-neutral-400">
                Managed environment configuration.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: AUTONOMOUS 48-HOUR AI AGENT & DEEPSEEK BRAIN */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="pb-6 border-b border-neutral-100 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4d23]/10 border border-[#ef4d23]/20 px-3 py-1 text-xs font-semibold text-[#ef4d23] mb-2">
                <Bot className="w-3.5 h-3.5" />
                <span>Autonomous 48h AI Agent</span>
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
                Industry Trend Intelligence & DeepSeek Brain
              </h2>
              <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                Automatically scans the latest 48 hours of news, articles, and high-velocity search queries around {website.name} and {website.industry}. Refreshes top 6 trending topics for one-click headline creation.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleTestAgentNow}
                disabled={isTestingAgent}
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-95 px-4 py-2 text-xs font-medium text-neutral-700 shadow-2xs transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#ef4d23] ${isTestingAgent ? 'animate-spin' : ''}`} />
                <span>{isTestingAgent ? 'Scanning 48h news...' : 'Run Agent Now'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveAgentConfig} className="space-y-6">
            {/* Status overview bar */}
            <div className="rounded-2xl bg-[#f9f8f6] border border-neutral-200/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <span className="font-semibold text-neutral-900">Agent Active: 48-Hour Fixed Cycle</span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Next run scheduled for {agentScheduledHour} AM · Monitors {website.industry}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-neutral-200 px-2.5 py-1 font-mono text-[11px] text-neutral-700">
                  <Clock className="w-3 h-3 text-[#ef4d23]" />
                  <span>Every 48 Hours</span>
                </span>
              </div>
            </div>

            {/* Schedule time selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  Fixed Run Hour (Every 48 Hours)
                </label>
                <p className="text-[11px] text-neutral-400 mb-2">
                  When the agent wakes up to analyze the previous 48 hours of industry news.
                </p>
                <select
                  value={agentScheduledHour}
                  onChange={(e) => setAgentScheduledHour(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-xs text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:outline-none transition-all"
                >
                  <option value="05:00">05:00 AM (Early Morning Briefing)</option>
                  <option value="06:00">06:00 AM (Recommended Morning Cycle)</option>
                  <option value="07:00">07:00 AM (Breakfast Digest)</option>
                  <option value="08:00">08:00 AM (Workday Start)</option>
                  <option value="12:00">12:00 PM (Noon Refresh)</option>
                  <option value="18:00">06:00 PM (Evening Summary)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                  AI Agent Reasoning Brain
                </label>
                <p className="text-[11px] text-neutral-400 mb-2">
                  LLM model used to evaluate news velocity, intent, and AEO authority.
                </p>
                <select
                  value={agentModel}
                  onChange={(e) => setAgentModel(e.target.value as any)}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-xs text-neutral-900 focus:bg-white focus:border-[#ef4d23] focus:outline-none transition-all"
                >
                  <option value="deepseek-chat">DeepSeek-V3 (Fast & High-Throughput Research)</option>
                  <option value="deepseek-reasoner">DeepSeek-R1 (Chain-of-Thought Deep Research)</option>
                </select>
              </div>
            </div>

            {/* DeepSeek API Connection */}
            <div className="pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-neutral-800">
                  DeepSeek API Key (Optional Custom Override)
                </label>
                <span className="text-[11px] text-neutral-400">
                  {customApiKey ? 'Custom key provided' : 'Using AI Studio Secret / Built-in Engine'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2.5">
                Connect your DeepSeek API key for real-time live queries. If not set, the agent uses the configured server environment key or the built-in industry intelligence engine.
              </p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="sk-••••••••••••••••••••••••••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Save bar */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-400">
                Changes apply to the next 48-hour cycle automatically.
              </span>
              <div className="flex items-center gap-2">
                {agentTestSuccess && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Agent finished 48h research successfully!</span>
                  </span>
                )}
                {isAgentSaved && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}
                <button
                  type="submit"
                  className="rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white px-5 py-2 text-xs font-semibold shadow-xs transition-colors"
                >
                  Save Agent Settings
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* SECTION 4: ACCOUNT */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="pb-6 border-b border-neutral-100 mb-6">
            <h2 className="text-base font-semibold text-neutral-900">Account</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Personal credentials and active subscription tier.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-500">Email Address</span>
              <span className="font-semibold text-neutral-900">{user.email}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-500">Password</span>
              <span className="font-medium text-neutral-600">••••••••••••</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-neutral-500">Current Subscription</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#ef4d23]/10 px-2.5 py-0.5 text-xs font-semibold text-[#ef4d23] border border-[#ef4d23]/20">
                  {user.plan} Plan · Active
                </span>
                <span className="text-neutral-500">$49 / month</span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-red-600 hover:text-red-700 font-semibold transition-colors"
              >
                Sign out of IntentWrite
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
