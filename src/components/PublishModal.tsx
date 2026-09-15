import React, { useState } from 'react';
import { X, Send, CheckCircle2, ExternalLink, Plus, Copy, Check } from 'lucide-react';
import { Article, Website } from '../types';

interface PublishModalProps {
  article: Article;
  website: Website;
  onClose: () => void;
  onConfirmPublish: () => { publishedUrl?: string } | void;
  onCreateAnother?: () => void;
  onViewPublished?: (url: string) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  article,
  website,
  onClose,
  onConfirmPublish,
  onCreateAnother,
  onViewPublished,
}) => {
  const [isPublished, setIsPublished] = useState(article.status === 'published');
  const [publishedUrl, setPublishedUrl] = useState(
    article.publishedUrl ||
      `${website.url.replace(/\/+$/, '')}/blog/${article.slug}`
  );
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      try {
        const res = onConfirmPublish();
        if (res && typeof res === 'object' && res.publishedUrl) {
          setPublishedUrl(res.publishedUrl);
        }
      } catch (err) {
        console.error('Publish confirmation error:', err);
      }
      setIsPublished(true);
      setIsSubmitting(false);
    }, 400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publishedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanDomain = website.url.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
        {!isPublished ? (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
              <h2 className="text-base font-semibold text-neutral-900">Ready to publish?</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Article title */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4 line-clamp-2">
                {article.title}
              </h3>

              <div className="rounded-2xl border border-neutral-200/80 bg-[#f5f2ee] p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Website:</span>
                  <span className="font-semibold text-neutral-900">{cleanDomain}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Destination:</span>
                  <span className="font-semibold text-neutral-900">Blog</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Target Slug:</span>
                  <span className="font-mono text-[11px] text-neutral-700 truncate max-w-[200px]">
                    /blog/{article.slug}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              This will publish the researched article directly to your connected website with canonical meta tags and AEO schema markup.
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                id="publish-confirm-btn"
                type="button"
                disabled={isSubmitting}
                onClick={handlePublish}
                className="flex items-center gap-1.5 rounded-full bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-5 py-2 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Published Successfully Screen */
          <div className="text-center py-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 mb-4">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>

            <h2 className="text-lg font-semibold text-neutral-900 mb-1">Published successfully</h2>
            <p className="text-xs text-neutral-500 mb-6 max-w-xs mx-auto">
              Your article is live and ready for readers and search engines.
            </p>

            {/* Article URL bar with copy */}
            <div className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 flex items-center justify-between text-xs text-left">
              <span className="font-mono text-[11px] text-neutral-700 truncate pr-2">
                {publishedUrl}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 text-neutral-500 hover:text-neutral-900 transition-colors"
                title="Copy URL"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Buttons: View Article & Create Another */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="published-view-article-btn"
                type="button"
                onClick={() => {
                  if (typeof onViewPublished === 'function') {
                    onViewPublished(publishedUrl);
                  } else {
                    onClose();
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors shadow-2xs"
              >
                <span>View Article</span>
                <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
              </button>

              <button
                id="published-create-another-btn"
                type="button"
                onClick={() => {
                  if (typeof onCreateAnother === 'function') {
                    onCreateAnother();
                  } else {
                    onClose();
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#ef4d23] hover:bg-[#e0431b] px-4 py-2.5 text-xs font-semibold text-white transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Another</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
