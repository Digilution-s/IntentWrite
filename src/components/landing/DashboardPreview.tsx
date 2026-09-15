import React, { useState } from 'react';
import { TrendingUp, Check, ChevronDown, X } from 'lucide-react';
import { Gauge } from './Gauge';

interface DashboardPreviewProps {
  onActionClick?: () => void;
}

export const DashboardPreview: React.FC<DashboardPreviewProps> = ({ onActionClick }) => {
  const [card1Tab, setCard1Tab] = useState<'articles' | 'published'>('articles');
  const [card3Tab, setCard3Tab] = useState<'published' | 'scheduled'>('published');
  const [contentType, setContentType] = useState('SEO Article');
  const [contentGoal, setContentGoal] = useState('Organic Traffic');
  const [targetKeyword, setTargetKeyword] = useState('ai automation');
  const [articleLength, setArticleLength] = useState('1500 words');

  return (
    <div className="w-full px-3 sm:px-4">
      <div className="bg-[#f5f2ee] rounded-3xl p-4 sm:p-6 w-full max-w-[880px] mx-auto shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-left">
          {/* Card 1 — Content Performance */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] flex flex-col justify-between">
            <div>
              {/* Header: orange "Content" + neutral "This Month" (13px) */}
              <div className="flex items-center justify-between text-[13px] font-medium mb-3">
                <span className="text-[#ef4d23] font-semibold">Content</span>
                <span className="text-neutral-500">This Month</span>
              </div>

              {/* Big number "24" + green pill with TrendingUp "+8" */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[28px] leading-tight font-semibold text-neutral-900">
                  24
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full px-2 py-0.5 text-[11px] font-medium">
                  <TrendingUp className="w-3 h-3" />
                  +8
                </span>
              </div>

              {/* Small caption */}
              <p className="text-xs text-neutral-500 mb-4">Articles generated</p>

              {/* Centered "Publishing activity" label */}
              <div className="text-center text-xs font-medium text-neutral-600 mb-1">
                Publishing activity
              </div>

              {/* Gauge at 78% in #ef4d23 with end labels "0" / "30" */}
              <div className="py-1">
                <Gauge value={78} color="#ef4d23" showLabels={true} min={0} max={30} />
              </div>
            </div>

            {/* Toggle pill bottom: "Articles" active / "Published" inactive */}
            <div className="bg-neutral-100 rounded-full p-1 flex mt-4">
              <button
                type="button"
                onClick={() => setCard1Tab('articles')}
                className={`flex-1 py-1 text-xs font-medium rounded-full transition-all text-center ${
                  card1Tab === 'articles'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Articles
              </button>
              <button
                type="button"
                onClick={() => setCard1Tab('published')}
                className={`flex-1 py-1 text-xs font-medium rounded-full transition-all text-center ${
                  card1Tab === 'published'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Published
              </button>
            </div>
          </div>

          {/* Card 2 — Content Creation Settings */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] flex flex-col gap-3 justify-between">
            <div className="flex flex-col gap-3">
              {/* Dropdown 1: Content type */}
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1">
                  Content type
                </label>
                <button
                  type="button"
                  onClick={onActionClick}
                  className="w-full flex items-center justify-between border border-neutral-200 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 bg-white hover:border-neutral-300 transition-colors"
                >
                  <span>{contentType}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                </button>
              </div>

              {/* Dropdown 2: Content goal */}
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1">
                  Content goal
                </label>
                <button
                  type="button"
                  onClick={onActionClick}
                  className="w-full flex items-center justify-between border border-neutral-200 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 bg-white hover:border-neutral-300 transition-colors"
                >
                  <span>{contentGoal}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                </button>
              </div>

              {/* Input 1: Target keyword */}
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1">
                  Target keyword
                </label>
                <input
                  type="text"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#ef4d23] transition-colors"
                />
              </div>

              {/* Input 2: Article length */}
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1">
                  Article length
                </label>
                <input
                  type="text"
                  value={articleLength}
                  onChange={(e) => setArticleLength(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-[#ef4d23] transition-colors"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={onActionClick}
                className="bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-xs font-medium shadow-sm transition-all"
              >
                Create Content
              </button>
              <button
                type="button"
                onClick={onActionClick}
                className="text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors font-medium"
              >
                Advanced
              </button>
              <button
                type="button"
                className="ml-auto text-neutral-400 hover:text-neutral-600 p-1 transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3 — Publishing */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/[0.04] flex flex-col justify-between">
            <div>
              {/* Header: orange "Publishing" + neutral "Today" */}
              <div className="flex items-center justify-between text-[13px] font-medium mb-3">
                <span className="text-[#ef4d23] font-semibold">Publishing</span>
                <span className="text-neutral-500">Today</span>
              </div>

              {/* Big "8" + status pill with Check icon */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[28px] leading-tight font-semibold text-neutral-900">
                  8
                </span>
                <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-700 border border-neutral-200/80 rounded-full px-2 py-0.5 text-[11px] font-medium">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Published successfully
                </span>
              </div>

              {/* Small caption */}
              <p className="text-xs text-neutral-500 mb-4">Articles sent to your website</p>

              {/* Gauge at 68% in #9ca3af (no end labels) */}
              <div className="py-3">
                <Gauge value={68} color="#9ca3af" showLabels={false} />
              </div>
            </div>

            {/* Toggle pill: "Published" active / "Scheduled" inactive */}
            <div className="bg-neutral-100 rounded-full p-1 flex mt-4">
              <button
                type="button"
                onClick={() => setCard3Tab('published')}
                className={`flex-1 py-1 text-xs font-medium rounded-full transition-all text-center ${
                  card3Tab === 'published'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Published
              </button>
              <button
                type="button"
                onClick={() => setCard3Tab('scheduled')}
                className={`flex-1 py-1 text-xs font-medium rounded-full transition-all text-center ${
                  card3Tab === 'scheduled'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Scheduled
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
