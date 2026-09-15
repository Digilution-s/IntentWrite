import React, { useState, useEffect, useRef } from 'react';
import { Check, AlertCircle, RefreshCw, Copy, CheckCheck, ArrowLeft, Radio } from 'lucide-react';
import { FlowerLogo } from './landing/FlowerLogo';
import { DatabaseContentJob, Article } from '../types';
import {
  getContentJob,
  subscribeToContentJob,
  getArticleById,
  triggerContentGeneration,
} from '../lib/contentJobs';

interface GenerationProgressViewProps {
  topic: string;
  jobId?: string;
  initialJob?: DatabaseContentJob | null;
  webhookError?: string | null;
  onComplete: (article?: Article) => void;
  onBackToDashboard?: () => void;
  onJobUpdate?: (job: DatabaseContentJob) => void;
  onJobDeleted?: () => void;
  onCreateNew?: () => void;
}

interface GenerationStageDef {
  key: string;
  label: string;
}

const STAGES: GenerationStageDef[] = [
  { key: 'queued', label: 'Understanding your business & topic' },
  { key: 'research', label: 'Researching current search queries' },
  { key: 'strategy', label: 'Building SEO & AEO answer strategy' },
  { key: 'writing', label: 'Writing deep-dive article sections' },
  { key: 'optimization', label: 'Optimizing SEO & AEO' },
  { key: 'validation', label: 'Checking citations & quality score' },
  { key: 'completed', label: 'Preparing article' },
];

export const GenerationProgressView: React.FC<GenerationProgressViewProps> = ({
  topic,
  jobId,
  initialJob,
  webhookError: initialWebhookError,
  onComplete,
  onBackToDashboard,
  onJobUpdate,
  onJobDeleted,
  onCreateNew,
}) => {
  const [currentJob, setCurrentJob] = useState<DatabaseContentJob | null>(initialJob || null);
  const [isJobNotFound, setIsJobNotFound] = useState(false);
  const [isLoadingJob, setIsLoadingJob] = useState(Boolean(jobId && !initialJob));
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(initialWebhookError || null);
  const [isRetryingWebhook, setIsRetryingWebhook] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const completedHandledRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Sync with initialJob prop changes from parent
  useEffect(() => {
    if (initialJob && !isJobNotFound) {
      setCurrentJob((prev) => {
        if (!prev || prev.id !== initialJob.id) return initialJob;
        const prevP = Number(prev.progress ?? 0);
        const initP = Number(initialJob.progress ?? 0);
        return prevP > initP ? prev : initialJob;
      });
    }
  }, [initialJob, isJobNotFound]);

  // Map database stage and status to active step index
  const getStageIndex = (stage?: string | null, status?: string | null): number => {
    if (status === 'completed') return STAGES.length - 1;
    const s = (stage || '').toLowerCase().trim();
    switch (s) {
      case 'queued':
      case 'pending':
      case 'init':
        return 0;
      case 'research':
      case 'researching':
      case 'search':
        return 1;
      case 'strategy':
      case 'strategizing':
      case 'plan':
      case 'planning':
        return 2;
      case 'writing':
      case 'generating':
      case 'drafting':
        return 3;
      case 'optimization':
      case 'optimizing':
      case 'seo':
      case 'aeo':
        return 4;
      case 'validation':
      case 'validating':
      case 'quality':
      case 'quality_check':
      case 'scoring':
        return 5;
      case 'completed':
      case 'done':
      case 'finished':
      case 'ready':
        return 6;
      default: {
        // Fallback mapped to progress percentage if stage name is custom
        const p = Number(currentJob?.progress ?? 0);
        if (p >= 95) return 6;
        if (p >= 80) return 5;
        if (p >= 60) return 4;
        if (p >= 40) return 3;
        if (p >= 20) return 2;
        if (p >= 10) return 1;
        return 0;
      }
    }
  };

  const currentStepIndex = getStageIndex(currentJob?.stage, currentJob?.status);

  // Progress percentage comes strictly from job.progress database row (parsed cleanly as number)
  const rawProgress = currentJob?.progress != null ? Number(currentJob.progress) : 0;
  const progressPercentage = isNaN(rawProgress)
    ? 0
    : Math.min(100, Math.max(0, Math.round(rawProgress)));

  // Handle article completion
  const handleCompletedJob = async (job: DatabaseContentJob) => {
    if (completedHandledRef.current) return;
    completedHandledRef.current = true;

    // Stop/unsubscribe from the Realtime channel
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsRealtimeActive(false);

    console.log('[Content Job] Completed', {
      id: job.id,
      stage: job.stage,
      status: job.status,
      progress: job.progress,
      article_id: job.article_id,
    });

    try {
      if (job.article_id) {
        console.log(`[Content Job] Fetching article from Supabase: ${job.article_id}`);
        const article = await getArticleById(job.article_id);
        onComplete(article);
      } else {
        onComplete();
      }
    } catch (err) {
      console.error('[Content Job] Failed to load completed article from Supabase:', err);
      onComplete();
    }
  };

  // Initial Job Fetch, Polling Verification & Supabase Realtime Subscription Lifecycle
  useEffect(() => {
    if (!jobId) {
      setIsLoadingJob(false);
      return;
    }

    const cleanJobId = jobId.trim();
    let isCancelled = false;
    let pollTimer: any = null;

    // 1. Check database immediately on mount
    setIsLoadingJob(true);
    getContentJob(cleanJobId)
      .then((fetchedJob) => {
        if (isCancelled) return;

        // If the row does not exist in the database (e.g. user deleted it from Supabase)
        if (!fetchedJob) {
          console.warn('[Content Job] Database check on mount: Job row does not exist in Supabase:', cleanJobId);
          setIsJobNotFound(true);
          setCurrentJob(null);
          if (onJobDeleted) onJobDeleted();
          return;
        }

        console.log('[Content Job] Initial fetch from Supabase succeeded:', {
          id: fetchedJob.id,
          stage: fetchedJob.stage,
          status: fetchedJob.status,
          progress: fetchedJob.progress,
        });

        setIsJobNotFound(false);
        setCurrentJob((prev) => {
          // If realtime already arrived with newer progress, retain newer progress
          if (prev && prev.id === fetchedJob.id) {
            const prevP = Number(prev.progress ?? 0);
            const fetchP = Number(fetchedJob.progress ?? 0);
            if (prevP > fetchP) return prev;
          }
          return fetchedJob;
        });

        if (onJobUpdate) onJobUpdate(fetchedJob);

        if (fetchedJob.status === 'completed' && Number(fetchedJob.progress ?? 0) >= 100) {
          handleCompletedJob(fetchedJob);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('[Content Job] Failed initial fetch on mount:', err);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingJob(false);
        }
      });

    // 2. Subscribe to Supabase Realtime for UPDATE and DELETE
    try {
      console.log(`[Content Job] Subscribing to Realtime changes for jobId: ${cleanJobId}`);
      const unsub = subscribeToContentJob(
        cleanJobId,
        (updatedJob) => {
          if (isCancelled) return;
          console.log('[Content Job] Realtime UPDATE applied to React state:', {
            id: updatedJob.id,
            status: updatedJob.status,
            stage: updatedJob.stage,
            progress: updatedJob.progress,
          });

          // Row exists and updated
          setIsJobNotFound(false);
          setCurrentJob(updatedJob);
          if (onJobUpdate) onJobUpdate(updatedJob);

          if (updatedJob.status === 'completed' && Number(updatedJob.progress ?? 0) >= 100) {
            handleCompletedJob(updatedJob);
          } else if (updatedJob.status === 'failed') {
            console.warn('[Content Job] Job status marked as failed in DB:', updatedJob.error_message);
          }
        },
        () => {
          // DELETE event callback from Supabase Realtime
          if (isCancelled) return;
          console.warn('[Content Job] Realtime DELETE event: job row removed from Supabase:', cleanJobId);
          setIsJobNotFound(true);
          setCurrentJob(null);
          if (onJobDeleted) onJobDeleted();
        },
        (err) => {
          if (!isCancelled) {
            console.error('[Content Job] Realtime subscription error:', err);
            setIsRealtimeActive(false);
          }
        },
        (status) => {
          if (isCancelled) return;
          console.log(`[Content Job] Realtime channel status (${cleanJobId}): ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('[Content Job] Realtime channel reaches SUBSCRIBED for job:', cleanJobId);
            setIsRealtimeActive(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsRealtimeActive(false);
          }
        }
      );

      unsubscribeRef.current = unsub;
    } catch (subErr) {
      console.error('[Content Job] Failed to initiate Realtime subscription:', subErr);
      setIsRealtimeActive(false);
    }

    // 3. Periodic Database Verification Poll (every 2.5 seconds)
    // Ensures that if a user deletes the row in Supabase dashboard, the UI catches it even if Realtime events are filtered
    pollTimer = setInterval(async () => {
      if (isCancelled) return;
      try {
        const verifiedJob = await getContentJob(cleanJobId);
        if (isCancelled) return;

        if (!verifiedJob) {
          console.warn('[Content Job] Periodic DB check: Job row was deleted in Supabase:', cleanJobId);
          setIsJobNotFound(true);
          setCurrentJob(null);
          if (onJobDeleted) onJobDeleted();
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
          setIsRealtimeActive(false);
          if (pollTimer) clearInterval(pollTimer);
        } else {
          // Job still exists in database
          setIsJobNotFound(false);
          setCurrentJob((prev) => {
            if (!prev) return verifiedJob;
            const prevP = Number(prev.progress ?? 0);
            const verifiedP = Number(verifiedJob.progress ?? 0);
            if (verifiedP >= prevP) return verifiedJob;
            return prev;
          });
          if (verifiedJob.status === 'completed' && Number(verifiedJob.progress ?? 0) >= 100) {
            if (pollTimer) clearInterval(pollTimer);
            handleCompletedJob(verifiedJob);
          }
        }
      } catch (err) {
        console.warn('[Content Job] Periodic verification error:', err);
      }
    }, 2500);

    // Properly unsubscribe and clear timers on unmount
    return () => {
      isCancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setIsRealtimeActive(false);
    };
  }, [jobId]);

  // Manual check of the database on user request
  const handleManualCheckDatabase = async () => {
    if (!jobId) return;
    setIsManualChecking(true);
    try {
      const cleanJobId = jobId.trim();
      const verified = await getContentJob(cleanJobId);
      if (!verified) {
        setIsJobNotFound(true);
        setCurrentJob(null);
        if (onJobDeleted) onJobDeleted();
      } else {
        setIsJobNotFound(false);
        setCurrentJob(verified);
        if (onJobUpdate) onJobUpdate(verified);
        if (verified.status === 'completed' && Number(verified.progress ?? 0) >= 100) {
          handleCompletedJob(verified);
        }
      }
    } catch (e) {
      console.error('Error manually checking database:', e);
    } finally {
      setIsManualChecking(false);
    }
  };

  // Retry generation process
  const handleRetryWebhook = async () => {
    if (!jobId) return;
    setIsRetryingWebhook(true);
    setWebhookError(null);
    try {
      await triggerContentGeneration(jobId);
    } catch (err: any) {
      setWebhookError('We could not reach the generation service. Please try again.');
    } finally {
      setIsRetryingWebhook(false);
    }
  };

  const handleCopyJobId = () => {
    if (!jobId) return;
    navigator.clipboard.writeText(jobId);
    setCopiedJobId(true);
    setTimeout(() => setCopiedJobId(false), 2000);
  };

  const isFailed = currentJob?.status === 'failed' || Boolean(webhookError);

  // If the job does not exist or was deleted
  if (isJobNotFound) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:py-16 text-center animate-in fade-in duration-300">
        {/* Emblem */}
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 border border-amber-200 shadow-sm mb-6 text-amber-600">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-800 mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Draft No Longer Available</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 mb-2">
          This article draft was removed
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mb-6 max-w-md mx-auto leading-relaxed">
          This article generation request is no longer available in your workspace. You can start a new article or return to your dashboard.
        </p>

        {/* Details Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-left mb-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 text-xs">
            <span className="font-semibold text-neutral-800">Draft Details</span>
            <span className="inline-flex items-center gap-1 text-neutral-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
              Item not found
            </span>
          </div>

          <div className="mt-3.5 space-y-2.5 text-xs">
            {jobId && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Reference:</span>
                <span className="font-mono text-neutral-800 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100 text-[11px] select-all">
                  #{jobId.slice(0, 8)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Requested Topic:</span>
              <span className="font-medium text-neutral-800 truncate max-w-[220px]" title={topic}>
                {topic}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Status:</span>
              <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                Removed from Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onBackToDashboard && (
            <button
              id="job-deleted-back-btn"
              type="button"
              onClick={onBackToDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          )}

          {onCreateNew && (
            <button
              id="job-deleted-create-new-btn"
              type="button"
              onClick={onCreateNew}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <span>Create New Article</span>
            </button>
          )}

          <button
            id="job-deleted-recheck-btn"
            type="button"
            onClick={handleManualCheckDatabase}
            disabled={isManualChecking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors py-2 px-3 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isManualChecking ? 'animate-spin text-[#ef4d23]' : ''}`} />
            <span>{isManualChecking ? 'Checking status...' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-16 text-center">
      {/* Brand animated emblem */}
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white border border-neutral-200/80 shadow-md mb-6 relative">
        <FlowerLogo className={`w-9 h-9 ${isFailed ? '' : 'animate-spin-slow'}`} />
        {!isFailed && (
          <div className="absolute inset-0 rounded-3xl border-2 border-[#ef4d23]/20 animate-ping pointer-events-none" />
        )}
      </div>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 mb-2">
        {isFailed ? (
          <span className="text-rose-600">Generation paused</span>
        ) : (
          <>
            Crafting your <span className="font-serif italic font-normal">article</span>
          </>
        )}
      </h1>
      <p className="text-xs sm:text-sm text-neutral-500 mb-4 max-w-sm mx-auto truncate font-medium">
        &quot;{topic}&quot;
      </p>

      {/* Reference & Live Status Badge */}
      {jobId && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopyJobId}
            title="Click to copy Reference ID"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white/90 hover:bg-white px-3 py-1 text-[11px] font-mono text-neutral-600 shadow-2xs transition-colors"
          >
            <span>Ref: #{jobId.slice(0, 8)}</span>
            {copiedJobId ? (
              <CheckCheck className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3 text-neutral-400" />
            )}
          </button>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium border ${
              isRealtimeActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-neutral-100 text-neutral-600 border-neutral-200'
            }`}
          >
            <Radio className={`w-3 h-3 ${isRealtimeActive ? 'animate-pulse text-emerald-600' : ''}`} />
            <span>{isRealtimeActive ? 'Live Sync Active' : 'Connecting Sync...'}</span>
          </span>

          {/* Quick Refresh Status button */}
          <button
            type="button"
            onClick={handleManualCheckDatabase}
            disabled={isManualChecking}
            title="Refresh current progress"
            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 hover:bg-white px-2.5 py-1 text-[11px] text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isManualChecking ? 'animate-spin text-[#ef4d23]' : ''}`} />
            <span>Refresh</span>
          </button>

          {currentJob?.status && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize border ${
                currentJob.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : currentJob.status === 'failed'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : currentJob.status === 'running'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>{currentJob.status === 'running' ? 'In Progress' : currentJob.status}</span>
            </span>
          )}
        </div>
      )}

      {/* Failure Banner */}
      {isFailed && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-left text-xs text-rose-800 animate-in fade-in duration-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-rose-900 mb-1">Writing Paused</p>
              <p className="text-[11px] text-rose-700 break-words">
                {currentJob?.error_message || 'The writing process encountered an issue. You can retry or return to your dashboard.'}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetryWebhook}
                  disabled={isRetryingWebhook}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-medium shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetryingWebhook ? 'animate-spin' : ''}`} />
                  <span>{isRetryingWebhook ? 'Retrying...' : 'Retry Writing'}</span>
                </button>
                {onBackToDashboard && (
                  <button
                    type="button"
                    onClick={onBackToDashboard}
                    className="text-xs text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
                  >
                    Back to Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-neutral-200/70 h-2 rounded-full overflow-hidden mb-8 border border-neutral-200/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${
            isFailed ? 'bg-rose-500' : 'bg-[#ef4d23]'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Vertical animated process card */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 text-left shadow-sm">
        <div className="space-y-4">
          {STAGES.map((step, idx) => {
            const isDone = currentJob?.status === 'completed' || idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex && currentJob?.status !== 'completed' && !isFailed;
            const isFailedStep = isCurrent && isFailed;

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3.5 transition-all duration-300 ${
                  isCurrent ? 'scale-[1.01]' : ''
                }`}
              >
                {/* Step indicator symbol */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {isDone ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                      <Check className="h-3 w-3" />
                    </div>
                  ) : isFailedStep ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                      <AlertCircle className="h-3 w-3" />
                    </div>
                  ) : isCurrent ? (
                    <div className="flex h-5 w-5 items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-[#ef4d23] ring-4 ring-[#ef4d23]/20 animate-pulse" />
                    </div>
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-neutral-300" />
                  )}
                </div>

                <span
                  className={`text-xs sm:text-sm transition-colors ${
                    isDone
                      ? 'text-neutral-500 font-normal line-through'
                      : isCurrent
                      ? 'text-neutral-900 font-semibold'
                      : 'text-neutral-400 font-normal'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <span>
            {currentJob?.stage ? `Stage: ${currentJob.stage.toUpperCase()}` : 'AI Content Engine'}
          </span>
          <span className="font-semibold text-neutral-800">{progressPercentage}% Completed</span>
        </div>
      </div>

      {onBackToDashboard && !isFailed && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors py-1.5 px-3.5 rounded-full hover:bg-neutral-100/80 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Browse Dashboard while agent works</span>
          </button>
        </div>
      )}
    </div>
  );
};
