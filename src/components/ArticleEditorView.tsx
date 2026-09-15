import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Send,
  Eye,
  CheckCircle2,
  Trash2,
  Plus,
  Heading1,
  Heading2,
  Quote,
  Bold,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Article, ArticleSection } from '../types';

interface ArticleEditorViewProps {
  article: Article;
  onBack: () => void;
  onUpdateArticle: (updatedArticle: Article) => void;
  onOpenPreview: () => void;
  onOpenSchedule: () => void;
  onOpenPublish: () => void;
}

export const ArticleEditorView: React.FC<ArticleEditorViewProps> = ({
  article,
  onBack,
  onUpdateArticle,
  onOpenPreview,
  onOpenSchedule,
  onOpenPublish,
}) => {
  const [currentArticle, setCurrentArticle] = useState<Article>(article);

  // Helper to parse scheduled date and time
  const getScheduledInfo = (art: Article) => {
    if (art.status !== 'scheduled') return null;
    if (art.scheduledFor?.date) {
      try {
        const parts = art.scheduledFor.date.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '1', 10);
        const d = parseInt(parts[2] || '1', 10);
        const dateObj = new Date(y, m - 1, d);
        const dateStr = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        let timeStr = '09:00 AM';
        if (art.scheduledFor.time) {
          const [hStr, mStr] = art.scheduledFor.time.split(':');
          const h = parseInt(hStr, 10);
          const mn = parseInt(mStr || '0', 10);
          if (!isNaN(h)) {
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 === 0 ? 12 : h % 12;
            timeStr = `${h12}:${String(mn).padStart(2, '0')} ${period}`;
          }
        }
        const tz = art.scheduledFor.timezone || '';
        let tzTag = '';
        if (tz.includes('IST') || tz.includes('Kolkata')) tzTag = ' IST';
        else if (tz.includes('PT')) tzTag = ' PT';
        else if (tz.includes('ET')) tzTag = ' ET';
        else if (tz.includes('GMT') || tz.includes('BST')) tzTag = ' GMT';
        else if (tz.includes('CET')) tzTag = ' CET';
        else if (tz.includes('GST')) tzTag = ' GST';
        else if (tz.includes('SGT')) tzTag = ' SGT';
        else if (tz.includes('JST')) tzTag = ' JST';
        else if (tz.includes('AEST')) tzTag = ' AEST';
        else if (tz.includes('UTC')) tzTag = ' UTC';

        return { dateStr, timeStr: `${timeStr}${tzTag}` };
      } catch {
        // fallback
      }
    }
    const raw = (art as any).scheduled_at;
    if (raw) {
      try {
        const dt = new Date(raw);
        if (!isNaN(dt.getTime())) {
          return {
            dateStr: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            timeStr: dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          };
        }
      } catch {
        // fallback
      }
    }
    return { dateStr: 'Scheduled', timeStr: '' };
  };

  const schedInfo = getScheduledInfo(currentArticle);
  const [activeTab, setActiveTab] = useState<'seo' | 'aeo' | 'sources' | 'quality'>('seo');
  const [showMobileInsights, setShowMobileInsights] = useState(false);

  // Sync internal state if prop changes
  React.useEffect(() => {
    setCurrentArticle(article);
  }, [article]);

  // Helper to sync modified sections to HTML
  const sectionsToHtml = (sections: ArticleSection[]): string => {
    return sections
      .map((s) => {
        if (s.type === 'h2') return `<h2>${s.content}</h2>`;
        if (s.type === 'h3') return `<h3>${s.content}</h3>`;
        if (s.type === 'quote') return `<blockquote><p>${s.content}</p></blockquote>`;
        if (s.type === 'callout') {
          return `<div class="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 sm:p-5 text-sm font-medium text-neutral-800 my-6">${s.content}</div>`;
        }
        if (s.type === 'list') {
          const items = s.items && s.items.length > 0
            ? `<ul>${s.items.map((it) => `<li>${it}</li>`).join('')}</ul>`
            : '';
          return `<p><strong>${s.content}</strong></p>${items}`;
        }
        if (/<[a-z][\s\S]*>/i.test(s.content)) {
          return s.content;
        }
        return `<p>${s.content}</p>`;
      })
      .join('\n\n');
  };

  const handleTitleChange = (newTitle: string) => {
    const updated = { ...currentArticle, title: newTitle };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  const handleSectionContentChange = (index: number, newContent: string) => {
    const updatedSections = [...currentArticle.sections];
    updatedSections[index] = { ...updatedSections[index], content: newContent };
    const newHtml = sectionsToHtml(updatedSections);
    const updated = {
      ...currentArticle,
      sections: updatedSections,
      article_html: newHtml,
      articleHtml: newHtml,
    };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  const handleAddHeading = (level: 'h2' | 'h3') => {
    const newSec: ArticleSection = {
      id: `sec-${Date.now()}`,
      type: level,
      content: level === 'h2' ? 'New Section Heading' : 'Subheading',
    };
    const updatedSections = [...currentArticle.sections, newSec];
    const newHtml = sectionsToHtml(updatedSections);
    const updated = {
      ...currentArticle,
      sections: updatedSections,
      article_html: newHtml,
      articleHtml: newHtml,
    };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  const handleAddParagraph = () => {
    const newSec: ArticleSection = {
      id: `sec-${Date.now()}`,
      type: 'paragraph',
      content: 'Write your content here...',
    };
    const updatedSections = [...currentArticle.sections, newSec];
    const newHtml = sectionsToHtml(updatedSections);
    const updated = {
      ...currentArticle,
      sections: updatedSections,
      article_html: newHtml,
      articleHtml: newHtml,
    };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  const handleAddQuote = () => {
    const newSec: ArticleSection = {
      id: `sec-${Date.now()}`,
      type: 'quote',
      content: 'Key takeaway or quote to emphasize here...',
    };
    const updatedSections = [...currentArticle.sections, newSec];
    const newHtml = sectionsToHtml(updatedSections);
    const updated = {
      ...currentArticle,
      sections: updatedSections,
      article_html: newHtml,
      articleHtml: newHtml,
    };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  const handleAddFaq = () => {
    const newFaq = {
      question: 'New Question?',
      answer: 'Direct answer optimized for AI search engines...',
    };
    const updated = {
      ...currentArticle,
      faq: [...currentArticle.faq, newFaq],
    };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  const handleDeleteSection = (index: number) => {
    const updatedSections = currentArticle.sections.filter((_, i) => i !== index);
    const newHtml = sectionsToHtml(updatedSections);
    const updated = {
      ...currentArticle,
      sections: updatedSections,
      article_html: newHtml,
      articleHtml: newHtml,
    };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  const handleDeleteFaq = (index: number) => {
    const updatedFaq = currentArticle.faq.filter((_, i) => i !== index);
    const updated = { ...currentArticle, faq: updatedFaq };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    const updatedFaq = [...currentArticle.faq];
    updatedFaq[index] = { ...updatedFaq[index], [field]: value };
    const updated = { ...currentArticle, faq: updatedFaq };
    setCurrentArticle(updated);
    onUpdateArticle(updated);
  };

  // Word count calculation
  const wordCount = currentArticle.sections.reduce((acc, s) => {
    return acc + (s.content ? s.content.trim().split(/\s+/).length : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-[#ededed] pb-24 text-neutral-900 font-inter">
      {/* Top action bar */}
      <div className="sticky top-16 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Back & Status */}
          <div className="flex items-center gap-3">
            <button
              id="editor-back-btn"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Content</span>
            </button>

            <div className="h-3.5 w-px bg-neutral-200" />

            {/* Status indicator badge */}
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  currentArticle.status === 'published'
                    ? 'bg-emerald-500'
                    : currentArticle.status === 'scheduled'
                    ? 'bg-amber-500'
                    : 'bg-[#ef4d23]'
                }`}
              />
              <span className="text-xs font-medium text-neutral-700">
                {currentArticle.status === 'scheduled' && schedInfo
                  ? `Scheduled (${schedInfo.dateStr} · ${schedInfo.timeStr})`
                  : currentArticle.status.charAt(0).toUpperCase() + currentArticle.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Mobile toggle for AI Insights */}
            <button
              id="mobile-insights-toggle-btn"
              onClick={() => setShowMobileInsights(!showMobileInsights)}
              className="lg:hidden flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              <Sparkles className="h-3 w-3 text-[#ef4d23]" />
              <span>Insights</span>
            </button>

            {/* Preview */}
            <button
              id="editor-preview-btn"
              onClick={onOpenPreview}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-2xs"
            >
              <Eye className="h-3.5 w-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            {/* Schedule */}
            <button
              id="editor-schedule-btn"
              onClick={onOpenSchedule}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors shadow-2xs ${
                currentArticle.status === 'scheduled'
                  ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100/70'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
              }`}
            >
              <Calendar className={`h-3.5 w-3.5 ${currentArticle.status === 'scheduled' ? 'text-amber-600' : 'text-neutral-500'}`} />
              <span className="hidden sm:inline">
                {currentArticle.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
              </span>
            </button>

            {/* Publish CTA */}
            <button
              id="editor-publish-btn"
              onClick={onOpenPublish}
              className="flex items-center gap-1.5 rounded-full bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-4 py-1.5 text-xs font-semibold text-white transition-all shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Publish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main layout container: Editor (Center/Left) & AI Insight Panel (Right) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Article Editor - 8 columns on large screens */}
          <div className="lg:col-span-8">
            {/* Editor toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-1 rounded-2xl border border-neutral-200/80 bg-white p-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleAddHeading('h2')}
                title="Add Section Heading"
                className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors font-medium"
              >
                <Heading1 className="h-3.5 w-3.5" />
                <span>H2</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddHeading('h3')}
                title="Add Subheading"
                className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors font-medium"
              >
                <Heading2 className="h-3.5 w-3.5" />
                <span>H3</span>
              </button>
              <div className="h-3 w-px bg-neutral-200 mx-1" />
              <button
                type="button"
                onClick={handleAddParagraph}
                title="Add Paragraph"
                className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors font-medium"
              >
                <Bold className="h-3.5 w-3.5" />
                <span>Paragraph</span>
              </button>
              <button
                type="button"
                onClick={handleAddQuote}
                title="Add Quote / Takeaway"
                className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors font-medium"
              >
                <Quote className="h-3.5 w-3.5" />
                <span>Quote</span>
              </button>
              <button
                type="button"
                onClick={handleAddFaq}
                title="Add FAQ Question"
                className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>FAQ</span>
              </button>

              <div className="ml-auto flex items-center gap-3 pr-2 text-[11px] text-neutral-400">
                <span>{wordCount} words</span>
                <span>·</span>
                <span>{currentArticle.readingTime}</span>
              </div>
            </div>

            {/* Scheduled publication info banner */}
            {currentArticle.status === 'scheduled' && schedInfo && (
              <div className="mb-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-950">
                      Publication Scheduled
                    </p>
                    <p className="text-amber-800/90 mt-0.5">
                      Scheduled for <strong className="font-semibold text-amber-950">{schedInfo.dateStr}</strong> at <strong className="font-semibold text-amber-950">{schedInfo.timeStr}</strong>
                      {currentArticle.scheduledFor?.destination ? ` · Destination: ${currentArticle.scheduledFor.destination}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenSchedule}
                  className="self-start sm:self-auto rounded-full bg-white border border-amber-300 px-3.5 py-1.5 font-semibold text-amber-900 hover:bg-amber-100/60 transition-colors shadow-2xs shrink-0"
                >
                  Change schedule
                </button>
              </div>
            )}

            {/* Document Surface */}
            <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-12 shadow-sm">
              {/* Category & meta */}
              <div className="flex items-center gap-2 mb-4">
                <span className="rounded-full bg-[#ef4d23]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#ef4d23] border border-[#ef4d23]/20">
                  {currentArticle.category}
                </span>
                <span className="text-xs text-neutral-300">·</span>
                <span className="text-xs text-neutral-500">By {currentArticle.author}</span>
              </div>

              {/* Title (Editable) */}
              <textarea
                id="editor-title-input"
                rows={2}
                value={currentArticle.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article Title..."
                className="w-full bg-transparent text-2xl sm:text-4xl font-semibold tracking-tight text-neutral-900 focus:outline-none resize-none border-b border-transparent focus:border-[#ef4d23]/40 pb-2 transition-colors"
              />

              {/* Hero Image representation */}
              {currentArticle.heroImageUrl && (
                <div className="my-6 relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 group shadow-sm">
                  <img
                    src={currentArticle.heroImageUrl}
                    alt={currentArticle.title}
                    className="w-full h-56 sm:h-72 object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-4 text-[11px] text-white font-medium bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    Featured Visual Asset
                  </div>
                </div>
              )}

              {/* Article Content Sections */}
              <div className="space-y-6 mt-8">
                {currentArticle.sections.map((section, idx) => {
                  return (
                    <div key={section.id} className="group relative">
                      {/* Section type styling */}
                      {section.type === 'h2' && (
                        <div className="flex items-start gap-2">
                          <input
                            type="text"
                            value={section.content}
                            onChange={(e) => handleSectionContentChange(idx, e.target.value)}
                            className="w-full bg-transparent text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight focus:outline-none border-b border-transparent focus:border-[#ef4d23]/40 pb-1"
                          />
                          <button
                            onClick={() => handleDeleteSection(idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                            title="Remove section"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {section.type === 'h3' && (
                        <div className="flex items-start gap-2">
                          <input
                            type="text"
                            value={section.content}
                            onChange={(e) => handleSectionContentChange(idx, e.target.value)}
                            className="w-full bg-transparent text-base sm:text-lg font-semibold text-neutral-800 focus:outline-none border-b border-transparent focus:border-[#ef4d23]/40 pb-1"
                          />
                          <button
                            onClick={() => handleDeleteSection(idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {section.type === 'paragraph' && (
                        <div className="flex items-start gap-2">
                          <textarea
                            rows={Math.max(2, Math.ceil(section.content.length / 80))}
                            value={section.content}
                            onChange={(e) => handleSectionContentChange(idx, e.target.value)}
                            className="w-full bg-transparent text-sm sm:text-base text-neutral-700 leading-relaxed focus:outline-none resize-none border-b border-transparent focus:border-neutral-300 pb-1 font-normal"
                          />
                          <button
                            onClick={() => handleDeleteSection(idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {section.type === 'callout' && (
                        <div className="flex items-start gap-2 rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 text-xs sm:text-sm text-neutral-800">
                          <textarea
                            rows={2}
                            value={section.content}
                            onChange={(e) => handleSectionContentChange(idx, e.target.value)}
                            className="w-full bg-transparent focus:outline-none resize-none text-neutral-800 font-medium"
                          />
                          <button
                            onClick={() => handleDeleteSection(idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      {section.type === 'list' && (
                        <div className="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4">
                          <p className="text-xs font-semibold text-neutral-900 mb-2">
                            {section.content}
                          </p>
                          <ul className="space-y-2">
                            {section.items?.map((item, itemIdx) => (
                              <li key={itemIdx} className="flex items-start gap-2 text-xs sm:text-sm text-neutral-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#ef4d23] mt-2 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {section.type === 'quote' && (
                        <div className="flex items-start gap-2 border-l-2 border-[#ef4d23] pl-4 py-1 italic text-sm sm:text-base text-neutral-800">
                          <textarea
                            rows={2}
                            value={section.content}
                            onChange={(e) => handleSectionContentChange(idx, e.target.value)}
                            className="w-full bg-transparent focus:outline-none resize-none text-neutral-800 italic"
                          />
                          <button
                            onClick={() => handleDeleteSection(idx)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add section divider button */}
              <div className="my-8 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleAddParagraph}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-[#ef4d23]" />
                  <span>Add Paragraph</span>
                </button>
              </div>

              {/* FAQ Section */}
              <div className="mt-12 pt-8 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-neutral-900">Frequently Asked Questions</h3>
                  <button
                    onClick={handleAddFaq}
                    className="flex items-center gap-1 text-xs text-[#ef4d23] hover:underline font-medium"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {currentArticle.faq.map((faqItem, fIdx) => (
                    <div
                      key={fIdx}
                      className="group rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 relative"
                    >
                      <input
                        type="text"
                        value={faqItem.question}
                        onChange={(e) => handleFaqChange(fIdx, 'question', e.target.value)}
                        placeholder="Question..."
                        className="w-full bg-transparent text-sm font-semibold text-neutral-900 focus:outline-none border-b border-transparent focus:border-[#ef4d23]/40 pb-1 mb-2"
                      />
                      <textarea
                        rows={2}
                        value={faqItem.answer}
                        onChange={(e) => handleFaqChange(fIdx, 'answer', e.target.value)}
                        placeholder="Direct Answer..."
                        className="w-full bg-transparent text-xs text-neutral-600 focus:outline-none resize-none border-b border-transparent focus:border-[#ef4d23]/40"
                      />
                      <button
                        onClick={() => handleDeleteFaq(fIdx)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call To Action Banner */}
              {currentArticle.cta && (
                <div className="mt-12 rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-6 text-center">
                  <h4 className="text-base font-semibold text-neutral-900 mb-2">
                    {currentArticle.cta.title}
                  </h4>
                  <p className="text-xs text-neutral-600 mb-4 max-w-md mx-auto">
                    {currentArticle.cta.description}
                  </p>
                  <button
                    type="button"
                    className="rounded-full bg-neutral-900 hover:bg-neutral-800 px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
                  >
                    {currentArticle.cta.buttonText}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Insight Panel - 4 columns on desktop, drawer/modal on mobile */}
          <div
            className={`lg:col-span-4 ${
              showMobileInsights
                ? 'fixed inset-x-0 bottom-0 z-50 p-4 bg-white border-t border-neutral-200 rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl'
                : 'hidden lg:block'
            }`}
          >
            {/* Mobile close button */}
            {showMobileInsights && (
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
                <span className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                  AI Insights
                </span>
                <button
                  onClick={() => setShowMobileInsights(false)}
                  className="text-xs text-neutral-500 hover:text-neutral-900"
                >
                  Close
                </button>
              </div>
            )}

            <div className="sticky top-24 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
              {/* Insight Tabs */}
              <div className="flex items-center gap-1 border-b border-neutral-100 pb-3 mb-5">
                {(['seo', 'aeo', 'sources', 'quality'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 rounded-full py-1.5 text-xs font-medium uppercase tracking-wider transition-all ${
                      activeTab === tab
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab: SEO */}
              {activeTab === 'seo' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Primary Keyword
                    </span>
                    <p className="font-semibold text-neutral-900">{currentArticle.seoInsights.primaryKeyword}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{currentArticle.seoInsights.keywordUsage}</span>
                    </p>
                  </div>

                  <div className="border-t border-neutral-100 pt-3">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Meta Title
                    </span>
                    <p className="text-neutral-700 text-[11px] line-clamp-2">{currentArticle.metaTitle}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{currentArticle.seoInsights.metaTitleStatus}</span>
                    </p>
                  </div>

                  <div className="border-t border-neutral-100 pt-3">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Meta Description
                    </span>
                    <p className="text-neutral-700 text-[11px] line-clamp-2">
                      {currentArticle.metaDescription}
                    </p>
                    <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{currentArticle.seoInsights.metaDescStatus}</span>
                    </p>
                  </div>

                  <div className="border-t border-neutral-100 pt-3">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Structure
                    </span>
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{currentArticle.seoInsights.structureStatus}</span>
                    </p>
                  </div>

                  <div className="border-t border-neutral-100 pt-3 flex items-center justify-between">
                    <span className="text-neutral-500">Content Length</span>
                    <span className="font-semibold text-neutral-900">{wordCount} words</span>
                  </div>
                </div>
              )}

              {/* Tab: AEO */}
              {activeTab === 'aeo' && (
                <div className="space-y-3.5 text-xs">
                  <div className="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-neutral-800">
                        Answer Engine Optimization
                      </span>
                      <span className="text-xs font-bold text-[#ef4d23]">
                        {currentArticle.aeoScore} / 100
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Optimized for citations in Perplexity, ChatGPT Search, and Google AI Overviews.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-neutral-900 block">Direct answers</span>
                      <span className="text-[11px] text-neutral-500">
                        {currentArticle.aeoInsights.directAnswers}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-neutral-900 block">FAQ coverage</span>
                      <span className="text-[11px] text-neutral-500">
                        {currentArticle.aeoInsights.faqCoverage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-neutral-900 block">Question-based headings</span>
                      <span className="text-[11px] text-neutral-500">
                        {currentArticle.aeoInsights.questionHeadings}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-neutral-900 block">Clear definitions</span>
                      <span className="text-[11px] text-neutral-500">
                        {currentArticle.aeoInsights.clearDefinitions}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Sources */}
              {activeTab === 'sources' && (
                <div className="space-y-3 text-xs">
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Sources the AI cited during background research:
                  </p>

                  {currentArticle.sources.map((src) => (
                    <div
                      key={src.id}
                      className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-3 hover:bg-neutral-50 transition-colors"
                    >
                      <p className="font-medium text-neutral-900 text-xs line-clamp-2">{src.title}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
                        <span>{src.domain}</span>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[#ef4d23] hover:underline font-medium"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Quality */}
              {activeTab === 'quality' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <span className="text-neutral-500 font-medium">Content Quality</span>
                    <span className="text-base font-bold text-emerald-600">
                      {currentArticle.qualityScore} / 100
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-neutral-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Original structure & insights</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Claims fact-checked against citations</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Readability ({currentArticle.qualityInsights.readabilityScore})</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Search intent aligned</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
