import React, { useState } from 'react';
import { X, Send, CheckCircle2, ExternalLink, Plus, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { Article, Website, DatabaseArticle } from '../types';
import { supabase } from '../lib/supabase';
import { mapDatabaseArticleToArticle } from '../lib/contentJobs';

interface PublishModalProps {
  article: Article;
  website: Website;
  onClose: () => void;
  onConfirmPublish?: (updatedArticle?: Article) => { publishedUrl?: string } | void | Promise<{ publishedUrl?: string } | void>;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePublish = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    // Development-only logs
    if (import.meta.env.DEV) {
      console.log('[Publish] Started', { article_id: article.id });
    }

    try {
      // 1. Get the current authenticated Supabase session using the existing shared Supabase client
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      // 2. If no session/access_token exists: show authentication error and do not send request
      if (!session?.access_token || sessionError) {
        if (import.meta.env.DEV) {
          console.log('[Publish] Failed', {
            article_id: article.id,
            error: 'Authentication required. No active Supabase session.',
          });
        }
        setErrorMessage('Authentication required. Please sign in to publish this article.');
        setIsSubmitting(false);
        return;
      }

      // 3. Get the current article ID from existing article state (actual public.articles.id)
      const articleId = article.id;

      // 4. Send POST /api/publishing/publish-article
      const response = await fetch('/api/publishing/publish-article', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article_id: articleId,
        }),
      });

      const resData = await response.json().catch(() => null);

      // 6. Handle server responses
      if (response.status === 200) {
        // 200: show successful publishing state, update article status, display published_url
        // 200 with already_published=true: treat as success, use returned published_url
        const finalUrl =
          resData?.published_url ||
          article.publishedUrl ||
          `${website.url.replace(/\/+$/, '')}/blog/${article.slug}`;

        if (import.meta.env.DEV) {
          console.log('[Publish] Success', {
            article_id: article.id,
            published_url: finalUrl,
            already_published: resData?.already_published,
          });
        }

        setPublishedUrl(finalUrl);
        setIsPublished(true);

        // 8. Refresh/reload the article from Supabase so the UI reflects the actual database state
        let updatedArticle: Article;
        try {
          const { data: refreshedDbArticle } = await supabase
            .from('articles')
            .select('*')
            .eq('id', article.id)
            .maybeSingle();

          if (refreshedDbArticle) {
            updatedArticle = mapDatabaseArticleToArticle(refreshedDbArticle as DatabaseArticle);
          } else {
            updatedArticle = {
              ...article,
              status: 'published',
              publishedUrl: finalUrl,
              published_at: resData?.published_at || new Date().toISOString(),
            };
          }
        } catch (reloadErr) {
          console.warn('[Publish] Could not reload refreshed article from Supabase:', reloadErr);
          updatedArticle = {
            ...article,
            status: 'published',
            publishedUrl: finalUrl,
            published_at: resData?.published_at || new Date().toISOString(),
          };
        }

        if (onConfirmPublish) {
          await onConfirmPublish(updatedArticle);
        }
      } else if (response.status === 401) {
        const errorMsg =
          resData?.error || 'Authentication error: Your session has expired or is invalid. Please sign in again.';
        if (import.meta.env.DEV) {
          console.log('[Publish] Failed', { article_id: article.id, status: 401, error: errorMsg });
        }
        setErrorMessage(errorMsg);
      } else if (response.status === 404) {
        const errorMsg =
          resData?.error || 'Article not found. Please verify this article exists in your account.';
        if (import.meta.env.DEV) {
          console.log('[Publish] Failed', { article_id: article.id, status: 404, error: errorMsg });
        }
        setErrorMessage(errorMsg);
      } else if (response.status === 400) {
        const errorMsg = resData?.error || 'Invalid publishing request.';
        if (import.meta.env.DEV) {
          console.log('[Publish] Failed', { article_id: article.id, status: 400, error: errorMsg });
        }
        setErrorMessage(errorMsg);
      } else if (response.status === 502) {
        const details =
          resData?.details ||
          resData?.client_error ||
          resData?.error ||
          'Client website unreachable or rejected the article connection.';
        const errorMsg = `Client website publishing failed: ${details}`;
        if (import.meta.env.DEV) {
          console.log('[Publish] Failed', { article_id: article.id, status: 502, error: errorMsg });
        }
        setErrorMessage(errorMsg);
      } else {
        const errorMsg =
          resData?.error ||
          `Publishing error (${response.status}): The publishing server could not complete the request.`;
        if (import.meta.env.DEV) {
          console.log('[Publish] Failed', { article_id: article.id, status: response.status, error: errorMsg });
        }
        setErrorMessage(errorMsg);
      }
    } catch (err: any) {
      const errorMsg =
        err?.message || 'Network error: Unable to reach publishing server. Please try again.';
      if (import.meta.env.DEV) {
        console.log('[Publish] Failed', { article_id: article.id, error: errorMsg });
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
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
                disabled={isSubmitting}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-40"
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

            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              This will publish the researched article directly to your connected website with canonical meta tags and AEO schema markup.
            </p>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed break-words">{errorMessage}</div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-full px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                id="publish-confirm-btn"
                type="button"
                disabled={isSubmitting}
                onClick={handlePublish}
                className="flex items-center gap-1.5 rounded-full bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] px-5 py-2 text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
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
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-neutral-500" />}
              </button>
            </div>

            {/* Buttons: View Article & Create Another */}
            <div className="grid grid-cols-2 gap-3">
              <a
                id="published-view-article-btn"
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (typeof onViewPublished === 'function') {
                    onViewPublished(publishedUrl);
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors shadow-2xs"
              >
                <span>View Article</span>
                <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
              </a>

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
