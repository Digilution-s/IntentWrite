import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Flame,
  ArrowRight,
  Clock,
  Check,
  ExternalLink,
  Bot,
  Zap,
} from 'lucide-react';
import { TrendingTopic, Website } from '../types';
import { deepSeekAgentService } from '../services/deepSeekAgentService';

interface TrendingTopicsCardProps {
  website: Website;
  topics: TrendingTopic[];
  onSelectTopic: (topicTitle: string) => void;
  onRefreshTopics?: () => void;
  onOpenSettings?: () => void;
}

export const TrendingTopicsCard: React.FC<TrendingTopicsCardProps> = ({
  website,
  topics,
  onSelectTopic,
  onRefreshTopics,
  onOpenSettings,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedTopicId, setCopiedTopicId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const config = deepSeekAgentService.getConfig();
  const { formatted: nextRunFormatted } = deepSeekAgentService.calculateNextRunTime(config.scheduledHour);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await deepSeekAgentService.runResearchCycle(website);
      if (onRefreshTopics) {
        onRefreshTopics();
      }
    } catch (err) {
      console.error('Failed to refresh trending topics', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 700);
    }
  };

  const handleTopicClick = async (topic: TrendingTopic) => {
    setCopiedTopicId(topic.id);
    await deepSeekAgentService.copyTopic(topic.title);

    setToastMessage(`Copied & pasted into Topic or headline idea`);

    // Give visual feedback for 200ms before navigating
    setTimeout(() => {
      onSelectTopic(topic.title);
    }, 250);

    setTimeout(() => {
      setCopiedTopicId(null);
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="relative rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm mb-8 overflow-hidden">
      {/* Decorative subtle ambient backdrop */}
      <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-[#ef4d23]/5 via-amber-500/5 to-transparent blur-2xl pointer-events-none" />

      {/* Header section */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
        <div>
          {/* Agent status pills */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4d23]/10 border border-[#ef4d23]/20 px-3 py-1 text-xs font-semibold text-[#ef4d23]">
              <Bot className="w-3.5 h-3.5" />
              <span>48h AI Agent Brain</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/70 px-2.5 py-1 text-xs text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Runs every {config.intervalHours}h at {config.scheduledHour} AM</span>
            </span>

            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-neutral-400">
              <Clock className="w-3 h-3" />
              <span>Next cycle: {nextRunFormatted}</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
            Trending Topics in <span className="font-serif italic font-normal text-neutral-800">{website.industry || 'Your Industry'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
            Researched across the last 48 hours of industry news, breakthrough discussions, and high-velocity searches around {website.name || 'your business'}. Click any topic to paste it directly into your headline generator.
          </p>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            id="agent-run-research-now-btn"
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-95 px-4 py-2.5 text-xs font-medium text-neutral-700 shadow-2xs transition-all disabled:opacity-60"
            title="Trigger immediate 48-hour DeepSeek research cycle"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#ef4d23] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Researching 48h news...' : 'Run Agent Now'}</span>
          </button>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2.5 rounded-2xl border border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
              title="Configure 48-hour schedule & DeepSeek API"
            >
              <Zap className="w-4 h-4 text-neutral-600" />
            </button>
          )}
        </div>
      </div>

      {/* Trending Topics Grid or Empty State */}
      {topics.length === 0 ? (
        <div className="relative z-10 py-10 px-4 text-center">
          <div className="w-10 h-10 rounded-2xl bg-[#ef4d23]/10 border border-[#ef4d23]/20 flex items-center justify-center mx-auto mb-3 text-[#ef4d23]">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">
            No research topics generated yet
          </h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mb-4">
            Click &quot;Run Agent Now&quot; to discover top trending topics from the last 48 hours tailored specifically to {website.name || 'your business'}.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 text-xs font-medium transition-all shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Researching 48h news...' : 'Run Agent Now'}</span>
          </button>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-6">
        {topics.slice(0, 6).map((topic, index) => {
          const isCopied = copiedTopicId === topic.id;
          const isTopThree = index < 3;

          return (
            <div
              key={topic.id || `topic-${index}`}
              id={`trending-topic-card-${index + 1}`}
              onClick={() => handleTopicClick(topic)}
              className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-[#f9f8f6] hover:bg-white hover:border-[#ef4d23]/50 hover:shadow-md transition-all duration-200 p-4 sm:p-5 cursor-pointer text-left select-none"
            >
              <div>
                {/* Header row: Rank badge + Momentum tag */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                        isTopThree
                          ? 'bg-[#ef4d23] text-white shadow-xs'
                          : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {topic.rank || index + 1}
                    </span>

                    {index === 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-md">
                        <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        Top Velocity
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                    {topic.momentum}
                  </span>
                </div>

                {/* Topic Headline */}
                <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-[#ef4d23] transition-colors leading-snug line-clamp-2 mb-2">
                  {topic.title}
                </h3>

                {/* Little details: 1 sentence summary / context */}
                <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-3">
                  {topic.context}
                </p>
              </div>

              {/* Bottom footer: Source & Click to Copy CTA */}
              <div className="pt-2.5 border-t border-neutral-200/60 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400 truncate max-w-[140px]" title={topic.source}>
                  {topic.source}
                </span>

                <span className="inline-flex items-center gap-1 font-medium text-[#ef4d23] group-hover:translate-x-0.5 transition-transform">
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <span>Use Headline</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Bottom Footer Note */}
      <div className="mt-5 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-neutral-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ef4d23]" />
          <span>Clicking any topic copies it and pastes it directly into the Article Studio headline idea area.</span>
        </div>
        <span className="text-[11px] text-neutral-400">
          Powered by DeepSeek Research Brain
        </span>
      </div>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-neutral-900 text-white px-4 py-3 text-xs font-medium shadow-2xl border border-neutral-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
