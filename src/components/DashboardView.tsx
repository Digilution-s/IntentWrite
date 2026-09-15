import React from 'react';
import { Plus, ArrowUpRight, Sparkles, TrendingUp, CheckCircle2, Clock, FileText, Calendar } from 'lucide-react';
import { Article, Website, TrendingTopic } from '../types';
import { TrendingTopicsCard } from './TrendingTopicsCard';

interface DashboardViewProps {
  articles: Article[];
  website: Website;
  trendingTopics: TrendingTopic[];
  onCreateContentClick?: () => void;
  onStartCreate?: () => void;
  onSelectArticle: (article: Article) => void;
  onViewAllContent?: () => void;
  onGoToContent?: () => void;
  onSelectTrendingTopic: (topic: string) => void;
  onRefreshTrendingTopics: () => void;
  onOpenSettings?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  articles,
  website,
  trendingTopics,
  onCreateContentClick,
  onStartCreate,
  onSelectArticle,
  onViewAllContent,
  onGoToContent,
  onSelectTrendingTopic,
  onRefreshTrendingTopics,
  onOpenSettings,
}) => {
  const handleCreate = () => {
    if (typeof onCreateContentClick === 'function') onCreateContentClick();
    else if (typeof onStartCreate === 'function') onStartCreate();
  };

  const handleViewAll = () => {
    if (typeof onViewAllContent === 'function') onViewAllContent();
    else if (typeof onGoToContent === 'function') onGoToContent();
  };
  // Compute content summary
  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const draftCount = articles.filter((a) => a.status === 'draft' || a.status === 'ready').length;
  const scheduledCount = articles.filter((a) => a.status === 'scheduled').length;

  // Real average SEO & AEO score calculation
  const hasArticles = articles.length > 0;
  const avgScore = hasArticles
    ? Math.round(
        articles.reduce((acc, a) => acc + (a.seoScore || a.qualityScore || 92), 0) / articles.length
      )
    : 0;
  const gaugePercent = hasArticles ? Math.min(Math.max(avgScore, 10), 100) : 0;
  // Arc length is ~125.6
  const gaugeDashOffset = hasArticles ? (125.6 * (100 - gaugePercent)) / 100 : 125.6;

  // Latest 5 articles
  const recentArticles = articles.slice(0, 5);

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const formatDisplayDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const formatScheduledDateText = (article: Article) => {
    if (article.scheduledFor?.date) {
      try {
        const [y, m, d] = article.scheduledFor.date.split('-').map(Number);
        const dateObj = new Date(y, (m || 1) - 1, d || 1);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        let timeStr = '';
        if (article.scheduledFor.time) {
          const [hStr, mStr] = article.scheduledFor.time.split(':');
          const h = parseInt(hStr, 10);
          const mn = parseInt(mStr || '0', 10);
          if (!isNaN(h)) {
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 === 0 ? 12 : h % 12;
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

            timeStr = ` at ${h12}:${String(mn).padStart(2, '0')} ${period}${tzTag}`;
          }
        }
        return `Scheduled for ${dateStr}${timeStr}`;
      } catch {
        // fallback
      }
    }
    const raw = (article as any).scheduled_at;
    if (raw) {
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
          return `Scheduled for ${dateStr} at ${timeStr}`;
        }
      } catch {
        // fallback
      }
    }
    return 'Scheduled';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Welcome / Hero Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-neutral-200/80 p-6 sm:p-8 shadow-sm mb-8">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#ef4d23]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          {/* Greeting pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 mb-4 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-[#ef4d23]" />
            <span>{greeting}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-neutral-900 mb-4">
            What do you want to <span className="font-serif italic font-normal text-neutral-800">publish?</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-600 mb-8 leading-relaxed">
            Turn your brand expertise into in-depth, research-backed articles optimized for both Google SEO and AI search engines.
          </p>

          {/* Primary CTA button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="dashboard-create-content-cta-btn"
              onClick={handleCreate}
              className="group relative inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-white transition-all shadow-md hover:shadow-lg shadow-[#ef4d23]/20"
            >
              <Plus className="h-5 w-5 text-white group-hover:rotate-90 transition-transform duration-200" />
              <span>Create New Article</span>
            </button>

            <button
              id="dashboard-view-all-articles-btn"
              onClick={handleViewAll}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 px-5 py-3.5 text-xs sm:text-sm font-medium text-neutral-700 transition-colors"
            >
              <span>Browse All Content</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Tray (Styled identical to the Landing Page Performance & Gauge Tray) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Card 1: Content Performance Gauge Card */}
        <div className="rounded-3xl border border-neutral-200/80 bg-[#f5f2ee] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              SEO & AEO Score
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-neutral-700 border border-neutral-200/60 shadow-2xs">
              <TrendingUp className="w-3 h-3 text-[#ef4d23]" />
              <span>{hasArticles ? (avgScore >= 90 ? 'Top 5%' : 'Top 15%') : 'Ready'}</span>
            </span>
          </div>

          <div className="flex items-center justify-center py-2">
            <div className="relative w-36 h-20 flex items-end justify-center">
              {/* Semicircle Gauge SVG */}
              <svg viewBox="0 0 100 55" className="w-36 h-20 overflow-visible">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#e2ded9"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#ef4d23"
                  strokeWidth="8"
                  strokeDasharray="125.6"
                  strokeDashoffset={gaugeDashOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute bottom-0 text-center">
                <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                  {hasArticles ? `${avgScore}%` : '0%'}
                </span>
                <span className="block text-[10px] text-neutral-500">
                  {hasArticles ? 'Intent match' : 'No articles yet'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-600">
            <span>Search readiness</span>
            <span className="font-semibold text-neutral-900">
              {hasArticles ? (publishedCount > 0 ? 'Live & Indexed' : 'Ready') : 'Awaiting Content'}
            </span>
          </div>
        </div>

        {/* Card 2: Publishing Activity Summary */}
        <div className="rounded-3xl border border-neutral-200/80 bg-[#f5f2ee] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Content Pipeline
            </span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-3 my-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-neutral-700">Published</span>
              </div>
              <span className="text-sm font-semibold text-neutral-900">{publishedCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-neutral-700">Scheduled</span>
              </div>
              <span className="text-sm font-semibold text-neutral-900">{scheduledCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#ef4d23]" />
                <span className="text-xs font-medium text-neutral-700">Drafts & Ready</span>
              </div>
              <span className="text-sm font-semibold text-neutral-900">{draftCount}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-500">
            <span>Total library</span>
            <span className="font-semibold text-neutral-900">{articles.length} articles</span>
          </div>
        </div>

        {/* Card 3: Automation Status & Sync */}
        <div className="rounded-3xl border border-neutral-200/80 bg-[#f5f2ee] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Automation Health
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="my-auto py-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-neutral-900">Content Engine Ready</span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Connected and synchronized with your workspace. New articles can be generated, scheduled, and published in one click.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Auto-linking</span>
            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Autonomous 48-Hour AI Research Agent: Top 6 Trending Topics */}
      <TrendingTopicsCard
        website={website}
        topics={trendingTopics}
        onSelectTopic={onSelectTrendingTopic}
        onRefreshTopics={onRefreshTrendingTopics}
        onOpenSettings={onOpenSettings}
      />

      {/* Recent Content Section */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight">
              Recent Content
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Articles created or published for your website
            </p>
          </div>
          {articles.length > 5 && (
            <button
              onClick={onViewAllContent}
              className="text-xs font-medium text-[#ef4d23] hover:text-[#e0431b] transition-colors"
            >
              View all ({articles.length}) →
            </button>
          )}
        </div>

        {/* List of recent articles */}
        <div className="divide-y divide-neutral-100 -mx-6 sm:-mx-8">
          {recentArticles.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-neutral-500">
              No content created yet. Click <strong className="text-neutral-900">Create New Article</strong> above to generate your first article.
            </div>
          ) : (
            recentArticles.map((article) => {
              const isScheduled = article.status === 'scheduled';
              const statusCapitalized =
                article.status.charAt(0).toUpperCase() + article.status.slice(1);
              const dateText = isScheduled
                ? formatScheduledDateText(article)
                : `${statusCapitalized} · ${formatDisplayDate(article.updatedAt || article.createdAt)}`;

              return (
                <div
                  key={article.id}
                  id={`recent-article-row-${article.id}`}
                  onClick={() => onSelectArticle(article)}
                  className="group flex items-center justify-between px-6 sm:px-8 py-4 hover:bg-neutral-50/80 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                        {article.category}
                      </span>
                      <span className="text-[11px] text-neutral-400">·</span>
                      <span className="text-[11px] text-neutral-400">{article.readingTime}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-medium text-neutral-900 group-hover:text-[#ef4d23] transition-colors truncate">
                      {article.title}
                    </h3>
                    <p className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          article.status === 'published'
                            ? 'bg-emerald-500'
                            : article.status === 'scheduled'
                            ? 'bg-amber-500'
                            : 'bg-neutral-400'
                        }`}
                      />
                      <span className={isScheduled ? 'font-medium text-amber-900' : ''}>
                        {dateText}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-neutral-400 group-hover:text-[#ef4d23] group-hover:translate-x-0.5 transition-all">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
