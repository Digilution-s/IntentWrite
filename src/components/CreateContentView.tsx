import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles, ArrowLeft, Lightbulb, Bot, Check, AlertCircle, Loader2 } from 'lucide-react';
import {
  ArticleObjective,
  ContentType,
  CreateContentParams,
  Website,
  TrendingTopic,
} from '../types';
import { deepSeekAgentService } from '../services/deepSeekAgentService';

interface CreateContentViewProps {
  website: Website;
  initialTopic?: string;
  trendingTopics?: TrendingTopic[];
  onBack: () => void;
  onSubmit: (params: CreateContentParams) => void;
}

const CONTENT_TYPES: ContentType[] = [
  'SEO Article',
  'How-To Guide',
  'Listicle',
  'Comparison',
  'Buying Guide',
  'Educational',
  'Product Article',
  'Case Study',
  'Industry Analysis',
];

const OBJECTIVES: ArticleObjective[] = [
  'Increase organic traffic',
  'Educate readers',
  'Generate leads',
  'Promote a product/service',
  'Build authority',
];

const SUGGESTED_TOPICS = [
  'How AI automation changes customer support',
  'Complete guide to modern workflow optimization',
  'Evaluating operational ROI in 2026',
];

export const CreateContentView: React.FC<CreateContentViewProps> = ({
  website,
  initialTopic = '',
  trendingTopics,
  onBack,
  onSubmit,
}) => {
  const [topic, setTopic] = useState(initialTopic);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentType>('SEO Article');
  const [objective, setObjective] = useState<ArticleObjective>('Increase organic traffic');

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  const handleSelectTrendingTopic = async (topicTitle: string) => {
    setTopic(topicTitle);
    await deepSeekAgentService.copyTopic(topicTitle);
    setCopiedNotification(topicTitle);
    setTimeout(() => {
      setCopiedNotification(null);
    }, 2500);
  };
  const [targetAudience, setTargetAudience] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Advanced Options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tone, setTone] = useState(website.brandVoice || 'Professional');
  const [articleLength, setArticleLength] = useState<
    'Standard (~1,200 words)' | 'In-depth (~2,000 words)' | 'Comprehensive (~3,000+ words)'
  >('Standard (~1,200 words)');
  const [country, setCountry] = useState('United States (English)');
  const [internalLinkPreferences, setInternalLinkPreferences] = useState('');
  const [ctaPreferences, setCtaPreferences] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setSubmitError('Please enter a topic or headline idea.');
      return;
    }

    if (!website?.id) {
      setSubmitError('No website or business selected. Please select or configure a website first.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        topic: topic.trim(),
        contentType,
        objective,
        targetAudience: targetAudience.trim() || undefined,
        primaryKeyword: primaryKeyword.trim() || undefined,
        additionalInstructions: additionalInstructions.trim() || undefined,
        advancedOptions: {
          tone,
          articleLength,
          country,
          internalLinkPreferences,
          ctaPreferences,
        },
      });
    } catch (err: any) {
      console.error('Failed to submit content generation:', err);
      setSubmitError(err.message || 'Failed to submit content job.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back button */}
      <button
        id="create-content-back-btn"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors mb-6 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Dashboard</span>
      </button>

      {/* Main Creation Card */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4d23]/10 border border-[#ef4d23]/20 px-3 py-1 text-xs font-medium text-[#ef4d23] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Content Studio</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-2">
            What should we <span className="font-serif italic font-normal text-neutral-800">write about?</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
            Provide your topic or question. Our engine will research current data, craft the SEO/AEO
            strategy, write the long-form article, and ready it for publishing.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Topic - Main Input */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-neutral-900 mb-2">
              Topic or headline idea
            </label>
            <input
              id="create-topic-input"
              type="text"
              required
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. How workflow automation scales mid-market operations"
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/50 px-4 py-3.5 text-sm sm:text-base text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all shadow-inner"
            />

            {/* Quick Inspiration chips & 48h Agent Topics */}
            <div className="mt-2.5 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1 text-neutral-400">
                  <Lightbulb className="w-3 h-3 text-[#ef4d23]" />
                  <span>Try:</span>
                </span>
                {SUGGESTED_TOPICS.map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => setTopic(suggested)}
                    className="rounded-full bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-0.5 text-neutral-700 transition-colors"
                  >
                    {suggested}
                  </button>
                ))}
              </div>

              {/* 48-Hour AI Agent Brain Trending Topics */}
              {trendingTopics && trendingTopics.length > 0 && (
                <div className="rounded-2xl border border-neutral-200/80 bg-[#f9f8f6] p-3.5 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-[#ef4d23]" />
                      <span className="text-xs font-semibold text-neutral-800">
                        48h Trending Topics in {website.industry}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-[#ef4d23]/10 text-[#ef4d23] px-1.5 py-0.2 text-[10px] font-medium">
                        DeepSeek Brain
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 hidden sm:inline">
                      Click to auto-populate & copy
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {trendingTopics.slice(0, 6).map((t, idx) => {
                      const isSelected = topic === t.title;
                      return (
                        <button
                          key={t.id || `create-topic-${idx}`}
                          type="button"
                          onClick={() => handleSelectTrendingTopic(t.title)}
                          className={`group flex items-start gap-2 text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                            isSelected
                              ? 'border-[#ef4d23] bg-white text-neutral-900 shadow-xs ring-1 ring-[#ef4d23]/30'
                              : 'border-neutral-200/70 bg-white/70 hover:bg-white hover:border-[#ef4d23]/40 text-neutral-700'
                          }`}
                        >
                          <span
                            className={`shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5 ${
                              isSelected
                                ? 'bg-[#ef4d23] text-white'
                                : 'bg-neutral-100 text-neutral-600 group-hover:bg-[#ef4d23]/10 group-hover:text-[#ef4d23]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 font-medium leading-snug group-hover:text-[#ef4d23] transition-colors">
                              {t.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                              <span className="text-emerald-700 font-medium">{t.momentum}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {copiedNotification && (
                    <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-in fade-in duration-200">
                      <Check className="w-3 h-3" />
                      <span>Copied and pasted into headline: &quot;{copiedNotification}&quot;</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-2.5">
              Content Type
            </label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setContentType(type)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                    contentType === type
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Article Objective */}
          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-2.5">
              What should the article achieve?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {OBJECTIVES.map((obj) => (
                <button
                  key={obj}
                  type="button"
                  onClick={() => setObjective(obj)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left text-xs transition-all ${
                    objective === obj
                      ? 'border-[#ef4d23]/40 bg-[#ef4d23]/5 text-neutral-900 font-semibold'
                      : 'border-neutral-200/80 bg-neutral-50/50 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      objective === obj ? 'bg-[#ef4d23] ring-4 ring-[#ef4d23]/20' : 'bg-neutral-300'
                    }`}
                  />
                  <span>{obj}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience & Primary Keyword */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Target Audience <span className="text-neutral-400">(Optional)</span>
              </label>
              <input
                id="create-audience-input"
                type="text"
                placeholder={
                  website.targetAudience
                    ? `e.g. ${website.targetAudience.slice(0, 30)}...`
                    : 'e.g. Engineering leaders, COO'
                }
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Primary Keyword <span className="text-neutral-400">(Optional)</span>
              </label>
              <input
                id="create-keyword-input"
                type="text"
                placeholder="e.g. AI workflow automation"
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Additional Instructions */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Specific Instructions or Focus Points <span className="text-neutral-400">(Optional)</span>
            </label>
            <textarea
              id="create-instructions-input"
              rows={3}
              placeholder="Any specific talking points, stats, or angle the AI should incorporate..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Advanced Options - Collapsible in #f5f2ee */}
          <div className="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 sm:p-5">
            <button
              id="toggle-advanced-options-btn"
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-semibold text-neutral-800 hover:text-neutral-900"
            >
              <span>Advanced Content Controls (Tone, Length, Links)</span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4 text-neutral-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-neutral-200/80 space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                      Tone & Voice
                    </label>
                    <input
                      type="text"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      placeholder="e.g. Authoritative, analytical"
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#ef4d23]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                      Article Length
                    </label>
                    <select
                      value={articleLength}
                      onChange={(e) =>
                        setArticleLength(
                          e.target.value as
                            | 'Standard (~1,200 words)'
                            | 'In-depth (~2,000 words)'
                            | 'Comprehensive (~3,000+ words)'
                        )
                      }
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#ef4d23]"
                    >
                      <option value="Standard (~1,200 words)">Standard (~1,200 words)</option>
                      <option value="In-depth (~2,000 words)">In-depth (~2,000 words)</option>
                      <option value="Comprehensive (~3,000+ words)">
                        Comprehensive (~3,000+ words)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                      Country / Target Language
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. United States, Global"
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#ef4d23]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                      Internal Link Preferences
                    </label>
                    <input
                      type="text"
                      value={internalLinkPreferences}
                      onChange={(e) => setInternalLinkPreferences(e.target.value)}
                      placeholder="e.g. Link to /pricing and /features"
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#ef4d23]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Call-to-Action (CTA) Goal
                  </label>
                  <input
                    type="text"
                    value={ctaPreferences}
                    onChange={(e) => setCtaPreferences(e.target.value)}
                    placeholder="e.g. Invite readers to try our free interactive calculator"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-[#ef4d23]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Submit Action */}
          <div className="pt-2">
            {submitError && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-900">Unable to Start Generation</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            <button
              id="generate-content-submit-btn"
              type="submit"
              disabled={!topic.trim() || isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-8 py-4 text-sm sm:text-base font-semibold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Starting Article Generation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Article with IntentWrite</span>
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-neutral-400">
              AI multi-stage research, writing, and search-intent optimization
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
