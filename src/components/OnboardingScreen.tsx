import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Loader2,
  Check,
} from 'lucide-react';
import { BrandVoice, Website } from '../types';

interface OnboardingScreenProps {
  initialWebsite?: Website;
  onComplete: (website: Website) => void;
  onBack?: () => void;
}

const BRAND_VOICES: BrandVoice[] = [
  'Professional',
  'Friendly',
  'Technical',
  'Premium',
  'Conversational',
];

const SCAN_STEPS = [
  'Connecting to website...',
  'Reading important pages...',
  'Understanding your business...',
  'Building content knowledge...',
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  initialWebsite,
  onComplete,
  onBack,
}) => {
  const [formData, setFormData] = useState({
    url: initialWebsite?.url || '',
    name: initialWebsite?.name || '',
    businessDescription: initialWebsite?.businessDescription || '',
    industry: initialWebsite?.industry || '',
    targetAudience: initialWebsite?.targetAudience || '',
    productsServices: initialWebsite?.productsServices || '',
    location: initialWebsite?.location || '',
    brandVoice: (initialWebsite?.brandVoice || 'Professional') as BrandVoice,
    additionalInfo: initialWebsite?.additionalInfo || '',
  });

  // Flow states: 'form' | 'analyzing' | 'ready'
  const [step, setStep] = useState<'form' | 'analyzing' | 'ready'>('form');
  const [currentScanIndex, setCurrentScanIndex] = useState(0);

  // Animated progress state
  useEffect(() => {
    if (step === 'analyzing') {
      const interval = setInterval(() => {
        setCurrentScanIndex((prev) => {
          if (prev < SCAN_STEPS.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            setTimeout(() => {
              setStep('ready');
            }, 600);
            return prev;
          }
        });
      }, 700);

      return () => clearInterval(interval);
    }
  }, [step]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('analyzing');
    setCurrentScanIndex(0);
  };

  const handleFinish = () => {
    const finalWebsite: Website = {
      id: initialWebsite?.id || 'site-' + Date.now(),
      url: formData.url,
      name: formData.name,
      businessDescription: formData.businessDescription,
      industry: formData.industry,
      targetAudience: formData.targetAudience,
      productsServices: formData.productsServices,
      location: formData.location,
      brandVoice: formData.brandVoice,
      additionalInfo: formData.additionalInfo,
      isAnalyzed: true,
      analyzedAt: new Date().toISOString(),
      stats: {
        totalPagesIndexed: 42,
        topTopics: [formData.industry, 'Workflow Automation', 'Market Leadership'],
      },
    };
    onComplete(finalWebsite);
  };

  return (
    <div className="min-h-screen bg-[#ededed] text-neutral-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-inter">
      <div className="w-full max-w-2xl">
        {/* Step: Form Input */}
        {step === 'form' && (
          <div>
            {/* Back button to Main Page */}
            {onBack && (
              <div className="mb-6">
                <button
                  id="onboarding-top-back-btn"
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 shadow-2xs transition-all group"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-neutral-500" />
                  <span>Back to main page</span>
                </button>
              </div>
            )}

            {/* Header */}
            <div className="mb-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ef4d23]/20 bg-[#ef4d23]/10 px-3 py-1 text-xs font-semibold text-[#ef4d23] mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>One-Time Business Setup</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
                Tell us about your business
              </h1>
              <p className="mt-2 text-sm text-neutral-500 leading-relaxed max-w-xl">
                Add your website and business information once. IntentWrite uses this knowledge to
                research and create content tailored to your target audience.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
                {/* Website URL */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Website URL
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Globe className="h-4 w-4" />
                    </div>
                    <input
                      id="onboarding-url-input"
                      type="url"
                      required
                      placeholder="https://example.com"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 pl-10 pr-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Business Name & Industry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Business Name
                    </label>
                    <input
                      id="onboarding-name-input"
                      type="text"
                      required
                      placeholder="e.g. Nova SaaS"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Industry
                    </label>
                    <input
                      id="onboarding-industry-input"
                      type="text"
                      required
                      placeholder="e.g. B2B Software, E-Commerce, Consulting"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* What does your business do? */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    What does your business do?
                  </label>
                  <textarea
                    id="onboarding-description-input"
                    rows={3}
                    required
                    placeholder="Describe your business model, value proposition, and the main problem you solve..."
                    value={formData.businessDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, businessDescription: e.target.value })
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Target Audience
                  </label>
                  <input
                    id="onboarding-audience-input"
                    type="text"
                    required
                    placeholder="e.g. Engineering managers, marketing directors, small business owners"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Products / Services */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Products / Services
                  </label>
                  <textarea
                    id="onboarding-products-input"
                    rows={2}
                    required
                    placeholder="List your core products, flagship offerings, tiers or services..."
                    value={formData.productsServices}
                    onChange={(e) => setFormData({ ...formData, productsServices: e.target.value })}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Location / Market & Brand Voice */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                      Location / Market
                    </label>
                    <input
                      id="onboarding-location-input"
                      type="text"
                      placeholder="e.g. United States, Global, London"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 mb-2">
                      Brand Voice
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {BRAND_VOICES.map((voice) => (
                        <button
                          key={voice}
                          type="button"
                          onClick={() => setFormData({ ...formData, brandVoice: voice })}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
                </div>

                {/* Additional Information (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                    Additional Information <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="onboarding-additional-input"
                    rows={2}
                    placeholder="Specific messaging rules, competitor positioning, or key terms to emphasize..."
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:bg-white focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {onBack ? (
                  <button
                    id="onboarding-cancel-back-btn"
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to main page</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  id="onboarding-save-btn"
                  type="submit"
                  className="flex items-center gap-2 rounded-full bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-6 py-3 text-sm font-semibold text-white transition-all shadow-sm"
                >
                  <span>Save & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step: Analyzing / Understanding your website */}
        {step === 'analyzing' && (
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 sm:p-12 text-center shadow-lg max-w-md mx-auto">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ef4d23]/10 text-[#ef4d23] border border-[#ef4d23]/20 mb-6">
              <Loader2 className="h-6 w-6 animate-spin text-[#ef4d23]" />
            </div>

            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight mb-2">
              Understanding your website
            </h2>
            <p className="text-xs text-neutral-500 mb-8 max-w-xs mx-auto">
              IntentWrite is synthesizing your business context to ground future research and strategy.
            </p>

            {/* Vertical progress state */}
            <div className="space-y-4 text-left border border-neutral-200/80 bg-[#f5f2ee] rounded-2xl p-5">
              {SCAN_STEPS.map((stepText, idx) => {
                const isCompleted = idx < currentScanIndex;
                const isCurrent = idx === currentScanIndex;

                return (
                  <div key={stepText} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isCompleted ? (
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      ) : isCurrent ? (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#ef4d23] animate-pulse" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-neutral-300" />
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        isCompleted
                          ? 'text-neutral-500 font-normal'
                          : isCurrent
                          ? 'text-neutral-900 font-semibold'
                          : 'text-neutral-400'
                      }`}
                    >
                      {stepText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: Ready confirmation */}
        {step === 'ready' && (
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 sm:p-12 text-center shadow-lg max-w-md mx-auto">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 mb-6">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>

            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight mb-2">
              Your website is ready
            </h2>
            <p className="text-xs text-neutral-500 mb-8 max-w-xs mx-auto">
              We've connected to {formData.name} and mapped your key business domains. You're ready
              to generate high-ranking content.
            </p>

            <button
              id="onboarding-go-to-dashboard-btn"
              type="button"
              onClick={handleFinish}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-5 py-3 text-sm font-semibold text-white transition-all shadow-sm"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
