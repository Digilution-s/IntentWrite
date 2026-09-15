import React, { useState } from 'react';
import { Plus, ArrowUpRight, Search, FileText, Calendar, Clock } from 'lucide-react';
import { Article, ArticleStatus } from '../types';

interface ContentViewProps {
  articles: Article[];
  onCreateClick?: () => void;
  onStartCreate?: () => void;
  onSelectArticle: (article: Article) => void;
  onDeleteArticle?: (articleId: string) => void;
}

export const ContentView: React.FC<ContentViewProps> = ({
  articles,
  onCreateClick,
  onStartCreate,
  onSelectArticle,
  onDeleteArticle,
}) => {
  const [filter, setFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreate = () => {
    if (typeof onCreateClick === 'function') onCreateClick();
    else if (typeof onStartCreate === 'function') onStartCreate();
  };

  const filteredArticles = articles.filter((art) => {
    if (filter === 'published' && art.status !== 'published') return false;
    if (filter === 'scheduled' && art.status !== 'scheduled') return false;
    if (filter === 'draft' && art.status !== 'draft' && art.status !== 'ready') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q) ||
        art.seoInsights?.primaryKeyword?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  // Helper to format 12-hour time from "09:00" or similar
  const formatTimeStr = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const [hStr, mStr] = timeStr.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr || '0', 10);
      if (isNaN(h)) return '';
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    } catch {
      return '';
    }
  };

  // Comprehensive helper to parse scheduled date and time from scheduledFor or scheduled_at
  const getScheduledInfo = (article: Article): { dateStr: string; timeStr: string; fullStr: string } | null => {
    if (article.status !== 'scheduled') return null;

    // 1. Check structured scheduledFor
    if (article.scheduledFor?.date) {
      try {
        const parts = article.scheduledFor.date.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1] || '1', 10);
        const day = parseInt(parts[2] || '1', 10);
        const d = new Date(year, month - 1, day);
        const dateStr = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const baseTime = formatTimeStr(article.scheduledFor.time) || '09:00 AM';
        const tz = article.scheduledFor.timezone || '';
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

        const timeStr = `${baseTime}${tzTag}`;
        return {
          dateStr,
          timeStr,
          fullStr: `${dateStr} · ${timeStr}`,
        };
      } catch {
        // continue
      }
    }

    // 2. Check scheduled_at string (e.g. from database)
    const rawScheduled = (article as any).scheduled_at;
    if (rawScheduled) {
      try {
        const d = new Date(rawScheduled);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          const timeStr = d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          return {
            dateStr,
            timeStr,
            fullStr: `${dateStr} · ${timeStr}`,
          };
        }
      } catch {
        // continue
      }
    }

    // 3. Fallback for scheduled article (tomorrow 09:00 AM)
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return {
        dateStr,
        timeStr: '09:00 AM',
        fullStr: `${dateStr} · 09:00 AM`,
      };
    } catch {
      return {
        dateStr: 'Scheduled',
        timeStr: '',
        fullStr: 'Scheduled',
      };
    }
  };

  const getStatusBadge = (status: ArticleStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Published</span>
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Scheduled</span>
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4d23]/10 px-2.5 py-0.5 text-xs font-medium text-[#ef4d23] border border-[#ef4d23]/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ef4d23] animate-pulse" />
            <span>Generating</span>
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4d23]/10 px-2.5 py-0.5 text-xs font-medium text-[#ef4d23] border border-[#ef4d23]/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ef4d23]" />
            <span>Ready</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 border border-neutral-200">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
            <span>Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
            Content Library
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Researched, SEO/AEO-optimized articles created for your connected website.
          </p>
        </div>

        <button
          id="content-create-btn"
          onClick={handleCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Create Article</span>
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-2xs">
          {(['all', 'published', 'scheduled', 'draft'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1 text-xs font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              {f === 'draft' ? 'Drafts' : f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by title, category, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-neutral-200 bg-white pl-9 pr-3.5 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-[#ef4d23] focus:ring-2 focus:ring-[#ef4d23]/20 focus:outline-none shadow-2xs transition-all"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white overflow-hidden shadow-sm">
        {filteredArticles.length === 0 ? (
          <div className="py-16 px-6 text-center text-xs sm:text-sm text-neutral-500">
            <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p>No articles found matching this filter.</p>
            <button
              onClick={handleCreate}
              className="text-[#ef4d23] hover:underline font-semibold mt-2 inline-block"
            >
              Create new content →
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 px-6 py-3.5 border-b border-neutral-100 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-50/50">
              <div className="col-span-5">Article</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-3 text-right">Published / Scheduled</div>
            </div>

            {/* Desktop Rows & Mobile Cards */}
            <div className="divide-y divide-neutral-100">
              {filteredArticles.map((article) => {
                const isPublished = article.status === 'published';
                const isScheduled = article.status === 'scheduled';
                const schedInfo = getScheduledInfo(article);

                return (
                  <div
                    key={article.id}
                    id={`content-article-row-${article.id}`}
                    onClick={() => onSelectArticle(article)}
                    className="group cursor-pointer hover:bg-neutral-50/70 transition-colors"
                  >
                    {/* Desktop Row View */}
                    <div className="hidden md:grid grid-cols-12 px-6 py-4 items-center">
                      <div className="col-span-5 pr-4">
                        <h2 className="text-sm font-semibold text-neutral-900 group-hover:text-[#ef4d23] transition-colors truncate">
                          {article.title}
                        </h2>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                          <span className="font-medium text-neutral-700">{article.category}</span>
                          <span>·</span>
                          <span>{article.readingTime}</span>
                          {article.seoInsights?.primaryKeyword && (
                            <>
                              <span>·</span>
                              <span className="text-neutral-400 truncate">
                                Key: {article.seoInsights.primaryKeyword}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="col-span-2">{getStatusBadge(article.status)}</div>

                      <div className="col-span-2 text-xs text-neutral-500">
                        {formatDate(article.createdAt)}
                      </div>

                      <div className="col-span-3 text-right flex items-center justify-end gap-3 text-xs">
                        {isScheduled && schedInfo ? (
                          <div className="flex flex-col items-end leading-tight">
                            <span className="font-semibold text-neutral-900 flex items-center gap-1.5 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>{schedInfo.dateStr}</span>
                            </span>
                            <span className="text-[11px] text-amber-700/90 font-medium flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-amber-600/70 shrink-0" />
                              <span>{schedInfo.timeStr}</span>
                            </span>
                          </div>
                        ) : isPublished ? (
                          <div className="flex flex-col items-end leading-tight">
                            <span className="font-medium text-neutral-900 text-xs">
                              {formatDate(article.published_at || article.updatedAt)}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-medium mt-0.5">
                              Published
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                        <ArrowUpRight className="h-4 w-4 text-neutral-400 group-hover:text-[#ef4d23] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-sm font-semibold text-neutral-900 group-hover:text-[#ef4d23] transition-colors leading-snug">
                          {article.title}
                        </h2>
                        {getStatusBadge(article.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                        <span>{article.category} · {article.readingTime}</span>
                        <span>Created {formatDate(article.createdAt)}</span>
                      </div>
                      {isScheduled && schedInfo && (
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2.5 py-1.5 rounded-xl">
                          <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>Scheduled for <strong className="font-semibold text-amber-950">{schedInfo.dateStr}</strong> at <strong className="font-semibold text-amber-950">{schedInfo.timeStr}</strong></span>
                        </div>
                      )}
                      {isPublished && (
                        <div className="text-xs text-neutral-600 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Published on {formatDate(article.published_at || article.updatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
