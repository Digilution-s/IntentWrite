import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Lock,
  ChevronDown,
  Sparkles,
  Search,
} from 'lucide-react';
import { Article, Website } from '../types';
import { ArticleHtmlRenderer } from './ArticleHtmlRenderer';

export interface ArticlePreviewViewProps {
  article: Article;
  website: Website;
  onClose: () => void;
}

/**
 * Resolves the HTML content for an article.
 * Prioritizes stored `article_html`, then HTML content, then structured sections.
 */
function resolveArticleHtml(article: Article): { displayTitle: string; bodyHtml: string } {
  let rawHtml = '';

  // 1. Prioritize direct article_html or articleHtml field from Supabase
  if (article.article_html && typeof article.article_html === 'string' && article.article_html.trim()) {
    rawHtml = article.article_html.trim();
  } else if (article.articleHtml && typeof article.articleHtml === 'string' && article.articleHtml.trim()) {
    rawHtml = article.articleHtml.trim();
  } else if (article.content && typeof article.content === 'string' && /<[a-z][\s\S]*>/i.test(article.content)) {
    // 2. Direct content column if it contains HTML
    rawHtml = article.content.trim();
  } else if (article.sections && article.sections.length > 0) {
    // 3. Structured sections fallback: construct valid HTML elements
    rawHtml = article.sections
      .map((sec) => {
        if (sec.type === 'h2') {
          return `<h2>${sec.content}</h2>`;
        }
        if (sec.type === 'h3') {
          return `<h3>${sec.content}</h3>`;
        }
        if (sec.type === 'quote') {
          return `<blockquote><p>${sec.content}</p></blockquote>`;
        }
        if (sec.type === 'callout') {
          return `<div class="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 sm:p-5 text-sm font-medium text-neutral-800 my-6">${sec.content}</div>`;
        }
        if (sec.type === 'list') {
          const items = sec.items && sec.items.length > 0
            ? `<ul>${sec.items.map((it) => `<li>${it}</li>`).join('')}</ul>`
            : '';
          return `<p><strong>${sec.content}</strong></p>${items}`;
        }
        // Paragraph: if sec.content already has HTML tags, preserve them; otherwise wrap in <p>
        if (/<[a-z][\s\S]*>/i.test(sec.content)) {
          return sec.content;
        }
        return `<p>${sec.content}</p>`;
      })
      .join('\n\n');
  } else if (article.summary) {
    rawHtml = `<p>${article.summary}</p>`;
  }

  let displayTitle = article.title || 'Untitled Article';
  let bodyHtml = rawHtml;

  // If the rawHtml starts with a leading <h1>, extract title if needed and prevent duplicated stacked heading
  const matchH1 = bodyHtml.match(/^\s*<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (matchH1) {
    const extractedTitle = matchH1[1].replace(/<[^>]+>/g, '').trim();
    if (extractedTitle && (!displayTitle || displayTitle === 'Untitled Article' || extractedTitle.toLowerCase() === displayTitle.trim().toLowerCase())) {
      displayTitle = extractedTitle;
      // Remove leading duplicate H1 from body so it renders cleanly above author/hero
      bodyHtml = bodyHtml.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>/i, '').trim();
    }
  }

  return { displayTitle, bodyHtml };
}

export const ArticlePreviewView: React.FC<ArticlePreviewViewProps> = ({
  article,
  website,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'website' | 'search'>('website');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  const cleanDomain = website?.url
    ? website.url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    : 'example.com';
  const simulatedUrl = `https://${cleanDomain}/blog/${article.slug || 'article'}`;

  const { displayTitle, bodyHtml } = useMemo(() => {
    return resolveArticleHtml(article);
  }, [article]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-md flex flex-col font-inter">
      {/* Top Preview Control Header */}
      <div className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/95 px-4 py-3 sm:px-6 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Back button */}
          <button
            id="preview-back-to-editor-btn"
            onClick={onClose}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Editor</span>
          </button>

          {/* Mode switchers */}
          <div className="flex items-center gap-3">
            {/* Website Preview vs Search Preview */}
            <div className="flex items-center rounded-full border border-neutral-200 bg-neutral-100 p-1">
              <button
                id="preview-website-tab-btn"
                onClick={() => setViewMode('website')}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'website'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Website Preview
              </button>
              <button
                id="preview-search-tab-btn"
                onClick={() => setViewMode('search')}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'search'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Search className="h-3 w-3" />
                <span>Search & AEO</span>
              </button>
            </div>

            {/* Desktop vs Mobile Toggle */}
            <div className="hidden sm:flex items-center rounded-full border border-neutral-200 bg-neutral-100 p-1">
              <button
                id="preview-device-desktop-btn"
                onClick={() => setDeviceMode('desktop')}
                title="Desktop View"
                className={`p-1.5 rounded-full transition-colors ${
                  deviceMode === 'desktop'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                id="preview-device-mobile-btn"
                onClick={() => setDeviceMode('mobile')}
                title="Mobile View"
                className={`p-1.5 rounded-full transition-colors ${
                  deviceMode === 'mobile'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Preview Canvas */}
      <div className="flex-1 p-4 sm:p-8 flex justify-center items-start bg-[#ededed]">
        {/* VIEW 1: WEBSITE SIMULATED BROWSER */}
        {viewMode === 'website' && (
          <div
            className={`w-full transition-all duration-300 ${
              deviceMode === 'mobile'
                ? 'max-w-[390px] border-8 border-neutral-900 rounded-[44px] shadow-2xl overflow-hidden my-4'
                : 'max-w-5xl rounded-3xl border border-neutral-200/80 shadow-2xl overflow-hidden'
            } bg-white`}
          >
            {/* Simulated Browser Chrome Top Bar */}
            <div className="border-b border-neutral-200/80 bg-neutral-100/90 px-4 py-2.5 flex items-center justify-between">
              {/* Traffic lights on desktop */}
              {deviceMode === 'desktop' && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
              )}

              {/* URL Address Bar */}
              <div
                className={`flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-neutral-600 border border-neutral-200 shadow-2xs ${
                  deviceMode === 'desktop' ? 'w-full max-w-md mx-auto' : 'w-full'
                }`}
              >
                <Lock className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="truncate text-[11px] select-all font-mono">{simulatedUrl}</span>
              </div>

              {deviceMode === 'desktop' && <div className="w-10" />}
            </div>

            {/* Simulated Website Internal Container */}
            <div className="bg-white text-neutral-900 min-h-[600px] overflow-y-auto max-h-[80vh]">
              {/* Simulated Website Header */}
              <header className="border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                    {(website?.name || 'W').charAt(0)}
                  </div>
                  <span className="font-semibold text-sm tracking-tight text-neutral-900">
                    {website?.name || 'Website'}
                  </span>
                </div>

                {deviceMode === 'desktop' && (
                  <nav className="flex items-center gap-6 text-xs text-neutral-500 font-medium">
                    <span className="hover:text-neutral-900 cursor-pointer">Platform</span>
                    <span className="hover:text-neutral-900 cursor-pointer">Solutions</span>
                    <span className="hover:text-neutral-900 cursor-pointer text-neutral-900 font-semibold">
                      Blog
                    </span>
                    <span className="hover:text-neutral-900 cursor-pointer">Pricing</span>
                  </nav>
                )}

                <div className="flex items-center gap-2">
                  <button className="rounded-full bg-neutral-900 text-white text-xs px-3.5 py-1.5 font-medium transition-colors">
                    {deviceMode === 'mobile' ? 'App' : 'Get Started'}
                  </button>
                </div>
              </header>

              {/* Article Presentation Container */}
              <article
                className={`mx-auto px-6 py-10 sm:py-16 ${
                  deviceMode === 'mobile' ? 'max-w-full' : 'max-w-3xl'
                }`}
              >
                {/* Meta details */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="rounded-full bg-[#ef4d23]/10 px-2.5 py-0.5 text-xs font-semibold text-[#ef4d23] border border-[#ef4d23]/20">
                    {article.category || 'Industry Insights'}
                  </span>
                  <span className="text-xs text-neutral-300">·</span>
                  <span className="text-xs text-neutral-500">{article.readingTime || '5 min read'}</span>
                </div>

                {/* Main Article Title */}
                <h1
                  className={`font-semibold tracking-tight text-neutral-900 mb-6 leading-tight ${
                    deviceMode === 'mobile' ? 'text-2xl' : 'text-3xl sm:text-4xl'
                  }`}
                >
                  {displayTitle}
                </h1>

                {/* Author row */}
                <div className="flex items-center gap-3 pb-8 border-b border-neutral-100 mb-8">
                  <div className="h-9 w-9 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-700">
                    {(article.author || 'A').charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">{article.author || 'IntentWrite Team'}</p>
                    <p className="text-[11px] text-neutral-500">
                      Published {new Date(article.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Hero visual */}
                {article.heroImageUrl && (
                  <div className="mb-10 rounded-2xl overflow-hidden border border-neutral-200 shadow-sm">
                    <img
                      src={article.heroImageUrl}
                      alt={displayTitle}
                      className="w-full h-48 sm:h-72 object-cover"
                    />
                  </div>
                )}

                {/* Rendered HTML Body Content */}
                <ArticleHtmlRenderer html={bodyHtml} />

                {/* FAQ Accordion in preview */}
                {article.faq && article.faq.length > 0 && (
                  <div className="mt-14 pt-10 border-t border-neutral-100">
                    <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-4">
                      Frequently Asked Questions
                    </h3>
                    <div className="space-y-3">
                      {article.faq.map((item, idx) => {
                        const isOpen = expandedFaqIndex === idx;
                        return (
                          <div
                            key={idx}
                            className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                              className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-neutral-900 hover:bg-neutral-100/50 transition-colors"
                            >
                              <span>{item.question}</span>
                              <ChevronDown
                                className={`h-4 w-4 text-neutral-500 transition-transform ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div className="px-4 pb-4 pt-1 text-xs text-neutral-600 leading-relaxed border-t border-neutral-200/60">
                                {item.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Call To Action in preview */}
                {article.cta && (
                  <div className="mt-14 rounded-3xl border border-neutral-200/80 bg-[#f5f2ee] p-6 sm:p-8 text-center shadow-sm">
                    <h4 className="text-lg sm:text-xl font-semibold text-neutral-900 mb-2">
                      {article.cta.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-600 mb-6 max-w-md mx-auto">
                      {article.cta.description}
                    </p>
                    <a
                      href={article.cta.buttonUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-full bg-neutral-900 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
                    >
                      {article.cta.buttonText}
                    </a>
                  </div>
                )}
              </article>

              {/* Simulated Footer */}
              <footer className="border-t border-neutral-100 px-6 py-8 text-center text-xs text-neutral-400">
                <p>© {new Date().getFullYear()} {website?.name || 'IntentWrite'}. All rights reserved.</p>
              </footer>
            </div>
          </div>
        )}

        {/* VIEW 2: SEARCH ENGINE & AI CITATION PREVIEW */}
        {viewMode === 'search' && (
          <div className="w-full max-w-3xl space-y-6">
            {/* Google Search Result Card */}
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-5 rounded-full bg-neutral-900 flex items-center justify-center text-[10px] text-white font-bold">
                  {(website?.name || 'W').charAt(0)}
                </div>
                <span className="text-xs text-neutral-700 font-medium">{website?.name || 'Website'}</span>
                <span className="text-xs text-neutral-400">› blog › {article.slug}</span>
              </div>

              <h2 className="text-lg font-medium text-blue-700 hover:underline cursor-pointer mb-2">
                {article.metaTitle || displayTitle}
              </h2>

              <p className="text-xs text-neutral-600 leading-relaxed">
                <span className="text-neutral-400">
                  {new Date(article.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} —{' '}
                </span>
                {article.metaDescription || article.summary}
              </p>
            </div>

            {/* AI Answer Engine Citation Card (Perplexity & ChatGPT Search Simulation) */}
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#ef4d23]/10 text-[#ef4d23]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-900">
                    AI Answer Engine Overview (Perplexity / ChatGPT Search / Gemini)
                  </span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  AEO Score: {article.aeoScore || 92}/100
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed mb-4">
                "{article.summary || article.metaDescription}"
              </p>

              {/* Direct Cited Box */}
              <div className="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 flex items-center justify-between text-xs">
                <div className="truncate pr-4">
                  <span className="text-[11px] text-neutral-500 block">Primary Source Citation:</span>
                  <span className="font-semibold text-neutral-900 truncate block">{displayTitle}</span>
                  <span className="text-[11px] text-[#ef4d23] truncate block">{simulatedUrl}</span>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-neutral-700 border border-neutral-200/80 shadow-2xs">
                  Cited Source #1
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Also export as ArticlePreviewModal for full backward-compatibility
export const ArticlePreviewModal = ArticlePreviewView;
export default ArticlePreviewView;
