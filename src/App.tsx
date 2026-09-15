import React, { useState, useEffect } from 'react';
import {
  Website,
  Article,
  User,
  CreateContentParams,
  TrendingTopic,
  DatabaseContentJob,
} from './types';
import {
  contentService,
  DEFAULT_WEBSITE,
  EMPTY_WEBSITE,
  SEED_ARTICLES,
} from './services/contentService';
import { deepSeekAgentService } from './services/deepSeekAgentService';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import {
  createContentJob,
  getContentJob,
  subscribeToContentJob,
  getArticleById,
  getActiveContentJob,
  triggerContentGeneration,
} from './lib/contentJobs';
import {
  fetchUserWebsites,
  fetchUserArticles,
  syncWebsiteToSupabase,
  syncArticleToSupabase,
  deleteArticleFromSupabase,
} from './lib/supabaseData';
import { Navigation } from './components/Navigation';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { DashboardView } from './components/DashboardView';
import { CreateContentView } from './components/CreateContentView';
import { GenerationProgressView } from './components/GenerationProgressView';
import { ArticleEditorView } from './components/ArticleEditorView';
import { ArticlePreviewModal } from './components/ArticlePreviewModal';
import { ScheduleModal } from './components/ScheduleModal';
import { PublishModal } from './components/PublishModal';
import { ContentView } from './components/ContentView';
import { SettingsView } from './components/SettingsView';
import { LandingPage } from './components/landing/LandingPage';

type AppStage = 'landing' | 'login' | 'app';

type AppView =
  | 'dashboard'
  | 'content'
  | 'settings'
  | 'create'
  | 'generating'
  | 'editor';

export default function App() {
  // Application Stage: starts on Landing Page as requested
  const [stage, setStage] = useState<AppStage>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>('signin');

  // Authentication & User State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User>({
    id: 'user-1',
    email: '',
    name: 'User',
    plan: 'Growth',
  });

  // Business & Website State
  const [currentWebsite, setCurrentWebsite] = useState<Website>(() =>
    contentService.getWebsite() || EMPTY_WEBSITE
  );

  // Onboarding status: completed only if currentWebsite has valid name and url
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    const site = contentService.getWebsite();
    return Boolean(site && site.name && site.url);
  });

  // Articles List State
  const [articles, setArticles] = useState<Article[]>(() =>
    contentService.getArticles()
  );

  // Autonomous 48h AI Agent Trending Topics State
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>(() =>
    deepSeekAgentService.getTrendingTopics()
  );
  const [creationInitialTopic, setCreationInitialTopic] = useState('');

  // Active View & Active Article
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  // Generation In-Progress Topic & Active Database Job
  const [generatingTopic, setGeneratingTopic] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | undefined>(undefined);
  const [activeJob, setActiveJob] = useState<DatabaseContentJob | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isLocalGenerating, setIsLocalGenerating] = useState(false);

  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);

  // Listen to Supabase Auth state, auto-authenticate verified user, and load real Supabase data
  useEffect(() => {
    let isMounted = true;

    async function loadUserData(userId: string) {
      try {
        const [realWebsites, realArticles] = await Promise.all([
          fetchUserWebsites(userId),
          fetchUserArticles(userId),
        ]);

        if (!isMounted) return;

        if (realWebsites && realWebsites.length > 0) {
          setCurrentWebsite(realWebsites[0]);
          contentService.saveWebsite(realWebsites[0]);
          setHasCompletedOnboarding(true);
        } else {
          setCurrentWebsite(EMPTY_WEBSITE);
          setHasCompletedOnboarding(false);
        }

        if (realArticles && realArticles.length > 0) {
          setArticles(realArticles);
          localStorage.setItem('intentwrite_articles', JSON.stringify(realArticles));
        } else {
          setArticles([]);
          localStorage.setItem('intentwrite_articles', JSON.stringify([]));
        }

        // Check if there is an active running/queued job for this user
        try {
          const ongoingJob = await getActiveContentJob(userId);
          if (ongoingJob && isMounted) {
            console.log('[App] Discovered active content job:', ongoingJob.id);
            setActiveJobId(ongoingJob.id);
            setActiveJob(ongoingJob);
            if (ongoingJob.topic) {
              setGeneratingTopic(ongoingJob.topic);
            }
          }
        } catch (jobErr) {
          console.warn('[App] Could not check active jobs:', jobErr);
        }
      } catch (err) {
        console.error('Error loading data from Supabase:', err);
      }
    }

    if (isSupabaseConfigured()) {
      supabase.auth.getUser().then(async ({ data: { user: activeUser }, error: authError }) => {
        if (!authError && activeUser && isMounted) {
          setUser({
            id: activeUser.id,
            email: activeUser.email || '',
            name:
              activeUser.user_metadata?.full_name ||
              activeUser.email?.split('@')[0] ||
              'User',
            plan: 'Growth',
          });
          setIsAuthenticated(true);
          setStage('app');
          loadUserData(activeUser.id);
        } else if (isMounted) {
          setIsAuthenticated(false);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user && isMounted) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name:
              session.user.user_metadata?.full_name ||
              session.user.email?.split('@')[0] ||
              'User',
            plan: 'Growth',
          });
          setIsAuthenticated(true);
          setStage('app');
          loadUserData(session.user.id);
        } else if (!session?.user && isMounted) {
          setIsAuthenticated(false);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }
  }, []);

  // Handlers for Login
  const handleLogin = (email: string, userId?: string, userName?: string) => {
    const finalUserId = userId || 'user-custom-' + Date.now();
    const displayName = userName || email.split('@')[0] || 'User';
    setUser({
      id: finalUserId,
      email,
      name: displayName,
      plan: 'Growth',
    });
    setIsAuthenticated(true);
    setStage('app');
    setCurrentView('dashboard');
    if (userId) {
      fetchUserWebsites(userId).then((sites) => {
        if (sites && sites.length > 0) {
          setCurrentWebsite(sites[0]);
          contentService.saveWebsite(sites[0]);
          setHasCompletedOnboarding(true);
        } else {
          setCurrentWebsite(EMPTY_WEBSITE);
          setHasCompletedOnboarding(false);
        }
      });
      fetchUserArticles(userId).then((arts) => {
        if (arts && arts.length > 0) {
          setArticles(arts);
          localStorage.setItem('intentwrite_articles', JSON.stringify(arts));
        } else {
          setArticles([]);
          localStorage.setItem('intentwrite_articles', JSON.stringify([]));
        }
      });
      getActiveContentJob(userId).then((ongoingJob) => {
        if (ongoingJob) {
          console.log('[App] Discovered active content job on login:', ongoingJob.id);
          setActiveJobId(ongoingJob.id);
          setActiveJob(ongoingJob);
          if (ongoingJob.topic) setGeneratingTopic(ongoingJob.topic);
        }
      }).catch((err) => console.warn('[App] Error getting active job on login:', err));
    } else {
      setHasCompletedOnboarding(false);
    }
  };

  // Keep active database content job synced in background when user navigates away to Dashboard or Content
  useEffect(() => {
    if (!activeJobId || !isSupabaseConfigured()) return;
    // When the user is currently looking at GenerationProgressView, GenerationProgressView manages the active realtime updates
    if (currentView === 'generating') return;

    let isMounted = true;

    // Check if active job still exists in Supabase
    getContentJob(activeJobId).then((job) => {
      if (!isMounted) return;
      if (!job) {
        console.log('[App] Background check: active job no longer exists in Supabase');
        setActiveJobId(undefined);
        setActiveJob(null);
      } else {
        setActiveJob(job);
      }
    });

    const unsub = subscribeToContentJob(
      activeJobId,
      async (updatedJob) => {
        if (!isMounted) return;
        setActiveJob(updatedJob);

        // If job is finished in background
        if (updatedJob.status === 'completed' && (updatedJob.progress ?? 0) >= 100) {
          if (updatedJob.article_id) {
            try {
              const article = await getArticleById(updatedJob.article_id);
              if (isMounted) {
                setArticles((prev) => {
                  const exists = prev.some((a) => a.id === article.id);
                  return exists ? prev.map((a) => (a.id === article.id ? article : a)) : [article, ...prev];
                });
              }
            } catch (err) {
              console.error('[App] Failed to fetch completed article in background:', err);
            }
          }
          if (isMounted) {
            setActiveJobId(undefined);
            setActiveJob(null);
          }
        }
      },
      () => {
        // DELETE callback
        if (!isMounted) return;
        console.log('[App] Active job deleted in Supabase in background');
        setActiveJobId(undefined);
        setActiveJob(null);
      }
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, [activeJobId, currentView]);

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign-out error:', err);
      }
    }
    contentService.clearSession();
    setCurrentWebsite(EMPTY_WEBSITE);
    setArticles([]);
    setHasCompletedOnboarding(false);
    setIsAuthenticated(false);
    setStage('landing');
    setCurrentView('dashboard');
  };

  // Website Onboarding Complete
  const handleOnboardingComplete = async (newWebsite: Website) => {
    contentService.saveWebsite(newWebsite);
    setCurrentWebsite(newWebsite);
    setHasCompletedOnboarding(true);
    setCurrentView('dashboard');
    if (user?.id) {
      const siteId = await syncWebsiteToSupabase(newWebsite, user.id);
      if (siteId && siteId !== newWebsite.id) {
        const withId = { ...newWebsite, id: siteId };
        contentService.saveWebsite(withId);
        setCurrentWebsite(withId);
      }
    }
  };

  // Start Create Content Flow
  const handleStartCreateContent = () => {
    setCreationInitialTopic('');
    setCurrentView('create');
  };

  // When user clicks on any of the 48-Hour Trending Topics
  const handleSelectTrendingTopic = (topicTitle: string) => {
    setCreationInitialTopic(topicTitle);
    setCurrentView('create');
  };

  // When user triggers refresh of 48-Hour Agent
  const handleRefreshTrendingTopics = () => {
    setTrendingTopics(deepSeekAgentService.getTrendingTopics());
  };

  // Helper to ensure website row exists in Supabase public.websites to preserve foreign key
  const ensureSupabaseWebsite = async (userId: string, site: Website): Promise<string> => {
    try {
      const siteId = await syncWebsiteToSupabase(site, userId);
      return siteId;
    } catch (e) {
      console.warn('Supabase website check note:', e);
      return site.id;
    }
  };

  // Submit Create Content -> Supabase content_jobs -> n8n Webhook -> Generation Progress
  const handleSubmitCreateContent = async (params: CreateContentParams) => {
    // 1. Validate required fields
    if (!params.topic || !params.topic.trim()) {
      throw new Error('Topic or headline is required to generate content.');
    }

    if (!currentWebsite || !currentWebsite.id) {
      throw new Error('No website or business selected. Please configure a website in Settings.');
    }

    // 2. Verify Supabase Auth user if Supabase is configured
    if (isSupabaseConfigured()) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setStage('login');
        throw new Error('Authentication required: Please log in to your account first.');
      }
    }

    setGeneratingTopic(params.topic);
    setWebhookError(null);

    // If Supabase is configured, run the database-driven pipeline
    if (isSupabaseConfigured()) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const validUserId = authUser?.id || user.id;

        // 3. Get valid website ID
        const resolvedWebsiteId = await ensureSupabaseWebsite(validUserId, currentWebsite);

        // 4. Create row in public.content_jobs and receive job.id
        const job = await createContentJob({
          websiteId: resolvedWebsiteId,
          topic: params.topic,
          contentType: params.contentType,
          generationGoal: params.objective,
          targetAudience: params.targetAudience,
          primaryKeyword: params.primaryKeyword,
          additionalInstructions: params.additionalInstructions,
        });

        // 5. Store authoritative job.id and display generation progress screen
        setActiveJobId(job.id);
        setActiveJob(job);
        setCurrentView('generating');

        // 6. Trigger generation workflow
        try {
          await triggerContentGeneration(job.id);
        } catch (webhookErr: any) {
          console.error('Content generation dispatch issue:', webhookErr);
          setWebhookError('We could not reach the generation service. You can click retry anytime.');
        }
      } catch (dbErr: any) {
        console.error('Database content job error:', dbErr);
        throw dbErr;
      }
    } else {
      // Local fallback if Supabase credentials are not configured yet
      console.warn('Supabase not configured. Using local fallback generation.');
      setIsLocalGenerating(true);
      setCurrentView('generating');
      try {
        const { article } = await contentService.createContentJob(
          currentWebsite,
          params
        );
        setActiveArticle(article);
        setArticles(contentService.getArticles());
      } catch (err) {
        console.error('Failed to create content job', err);
        setCurrentView('dashboard');
      } finally {
        setIsLocalGenerating(false);
      }
    }
  };

  const handleGenerationAnimationComplete = async (generatedArticle?: Article) => {
    setActiveJobId(undefined);
    setActiveJob(null);
    setWebhookError(null);
    setIsLocalGenerating(false);

    if (generatedArticle) {
      setActiveArticle(generatedArticle);
      setArticles((prev) => {
        const exists = prev.some((a) => a.id === generatedArticle.id);
        return exists
          ? prev.map((a) => (a.id === generatedArticle.id ? generatedArticle : a))
          : [generatedArticle, ...prev];
      });
      if (user?.id) {
        await syncArticleToSupabase(generatedArticle, user.id, currentWebsite.id);
      }
      setCurrentView('editor');
    } else if (activeArticle) {
      setCurrentView('editor');
    } else {
      const latest = articles[0] || contentService.getArticles()[0];
      if (latest) {
        setActiveArticle(latest);
      }
      setCurrentView('editor');
    }
  };

  // Article selection from Dashboard or Content Page
  const handleSelectArticle = (article: Article) => {
    setActiveArticle(article);
    setCurrentView('editor');
  };

  // Article Updates
  const handleUpdateArticle = async (updated: Article) => {
    contentService.updateArticle(updated.id, updated);
    setActiveArticle(updated);
    setArticles(contentService.getArticles());
    if (user?.id) {
      await syncArticleToSupabase(updated, user.id, currentWebsite.id);
    }
  };

  // Scheduling
  const handleScheduleArticle = async (scheduleData: {
    date: string;
    time: string;
    timezone: string;
    destination: string;
  }) => {
    if (!activeArticle) return;

    // Calculate accurate UTC timestamp taking timezone offset into account
    let scheduledAt: string;
    try {
      let offset = '+00:00';
      const tz = scheduleData.timezone || '';
      if (tz.includes('Kolkata') || tz.includes('IST') || tz.includes('India')) {
        offset = '+05:30';
      } else if (tz.includes('Dubai') || tz.includes('GST')) {
        offset = '+04:00';
      } else if (tz.includes('Singapore') || tz.includes('SGT')) {
        offset = '+08:00';
      } else if (tz.includes('Tokyo') || tz.includes('JST')) {
        offset = '+09:00';
      } else if (tz.includes('Sydney') || tz.includes('AEST')) {
        offset = '+10:00';
      } else if (tz.includes('Los_Angeles') || tz.includes('PT')) {
        offset = '-07:00';
      } else if (tz.includes('New_York') || tz.includes('ET')) {
        offset = '-04:00';
      } else if (tz.includes('London') || tz.includes('GMT')) {
        offset = '+01:00';
      } else if (tz.includes('Berlin') || tz.includes('CET')) {
        offset = '+02:00';
      }

      const isoWithOffset = `${scheduleData.date}T${scheduleData.time}:00${offset}`;
      const dateParsed = new Date(isoWithOffset);
      scheduledAt = !isNaN(dateParsed.getTime())
        ? dateParsed.toISOString()
        : `${scheduleData.date}T${scheduleData.time}:00Z`;
    } catch {
      scheduledAt = `${scheduleData.date}T${scheduleData.time}:00Z`;
    }

    const updated: Article = {
      ...activeArticle,
      status: 'scheduled',
      scheduledFor: scheduleData,
      scheduled_at: scheduledAt,
      updatedAt: new Date().toISOString(),
    };

    try {
      contentService.scheduleArticle(activeArticle.id, scheduleData);
    } catch (e) {
      console.warn('contentService.scheduleArticle error:', e);
    }

    setActiveArticle(updated);
    setArticles((prev) => {
      const exists = prev.some((a) => a.id === updated.id);
      return exists ? prev.map((a) => (a.id === updated.id ? updated : a)) : [updated, ...prev];
    });
    setIsScheduleOpen(false);

    if (user?.id) {
      await syncArticleToSupabase(updated, user.id, currentWebsite.id);
    }
  };

  // Publishing
  const handleConfirmPublish = async () => {
    if (!activeArticle) return { publishedUrl: '' };
    const result = contentService.publishArticle(
      activeArticle.id,
      'Blog - WordPress'
    );
    setActiveArticle(result.article);
    setArticles(contentService.getArticles());
    if (user?.id) {
      await syncArticleToSupabase(result.article, user.id, currentWebsite.id);
    }
    return {
      publishedUrl:
        result.article.publishedUrl ||
        `${currentWebsite.url.replace(/\/+$/, '')}/blog/${result.article.slug}`,
    };
  };

  // -------------------------------------------------------------
  // STAGE ROUTING
  // -------------------------------------------------------------

  // 1. Landing page
  if (stage === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => {
          setAuthInitialMode('signup');
          setStage('login');
        }}
        onSignIn={() => {
          setAuthInitialMode('signin');
          setStage('login');
        }}
      />
    );
  }

  // 2. Login Screen
  if (stage === 'login') {
    return (
      <AuthScreen
        initialMode={authInitialMode}
        onLogin={handleLogin}
        onBackToLanding={() => setStage('landing')}
      />
    );
  }

  // 3. First-time Onboarding
  if (stage === 'app' && !hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        initialWebsite={currentWebsite}
      />
    );
  }

  // Is the autonomous content agent currently crafting an article?
  const isAgentWorking = Boolean(
    isLocalGenerating ||
    (activeJob &&
      (activeJob.status === 'queued' || activeJob.status === 'running') &&
      (activeJob.progress ?? 0) < 100) ||
    (activeJobId && (!activeJob || (activeJob.status !== 'completed' && activeJob.status !== 'failed')))
  );

  const agentWorkingProgress =
    activeJob && typeof activeJob.progress === 'number'
      ? Math.min(100, Math.max(0, Math.round(activeJob.progress)))
      : 0;

  const agentWorkingTopic = generatingTopic || activeJob?.topic || '';

  // 4. Main SaaS App
  return (
    <div className="min-h-screen bg-[#ededed] font-inter antialiased text-neutral-900 selection:bg-[#ef4d23]/20 selection:text-[#ef4d23]">
      {/* Top Header Navigation */}
      <Navigation
        currentTab={
          currentView === 'content'
            ? 'content'
            : currentView === 'settings'
            ? 'settings'
            : currentView === 'dashboard'
            ? 'dashboard'
            : undefined
        }
        currentView={currentView}
        onSelectTab={(tab) => {
          if (tab === 'editor' && !activeArticle) {
            const first = articles[0] || contentService.getArticles()[0];
            if (first) setActiveArticle(first);
          }
          setCurrentView(tab as AppView);
        }}
        onViewChange={(view) => {
          if (view === 'editor' && !activeArticle) {
            const first = articles[0] || contentService.getArticles()[0];
            if (first) setActiveArticle(first);
          }
          setCurrentView(view as AppView);
        }}
        onCreateClick={handleStartCreateContent}
        onStartCreate={handleStartCreateContent}
        website={currentWebsite}
        onSwitchWebsite={(site) => setCurrentWebsite(site)}
        onConnectNewWebsite={() => setCurrentView('settings')}
        user={user}
        onLogout={handleLogout}
        onGoToLanding={() => setStage('landing')}
        isAgentWorking={isAgentWorking}
        agentWorkingProgress={agentWorkingProgress}
        agentWorkingTopic={agentWorkingTopic}
        onOpenAgentWorking={() => setCurrentView('generating')}
      />

      {/* Main Container View Switcher */}
      <main className="w-full pb-20">
        {/* VIEW 1: DASHBOARD */}
        {currentView === 'dashboard' && (
          <DashboardView
            website={currentWebsite}
            articles={articles}
            onCreateContentClick={handleStartCreateContent}
            onStartCreate={handleStartCreateContent}
            onSelectArticle={handleSelectArticle}
            onViewAllContent={() => setCurrentView('content')}
            onGoToContent={() => setCurrentView('content')}
            onSelectTrendingTopic={handleSelectTrendingTopic}
            trendingTopics={trendingTopics}
            onRefreshTrendingTopics={handleRefreshTrendingTopics}
            onOpenSettings={() => setCurrentView('settings')}
          />
        )}

        {/* VIEW 2: CONTENT REPOSITORY */}
        {currentView === 'content' && (
          <ContentView
            articles={articles}
            onSelectArticle={handleSelectArticle}
            onCreateClick={handleStartCreateContent}
            onStartCreate={handleStartCreateContent}
            onDeleteArticle={async (id) => {
              contentService.deleteArticle(id);
              setArticles(contentService.getArticles());
              if (activeArticle?.id === id) {
                setActiveArticle(null);
              }
              if (user?.id) {
                await deleteArticleFromSupabase(id, user.id);
              }
            }}
          />
        )}

        {/* VIEW 3: SETTINGS & WEBSITE PROFILE */}
        {currentView === 'settings' && (
          <SettingsView
            website={currentWebsite}
            user={user}
            onUpdateWebsite={async (updated) => {
              contentService.saveWebsite(updated);
              setCurrentWebsite(updated);
              if (user?.id) {
                const syncedId = await syncWebsiteToSupabase(updated, user.id);
                if (syncedId && syncedId !== updated.id) {
                  const withId = { ...updated, id: syncedId };
                  contentService.saveWebsite(withId);
                  setCurrentWebsite(withId);
                }
              }
            }}
            onLogout={handleLogout}
          />
        )}

        {/* VIEW 4: CREATE CONTENT FORM */}
        {currentView === 'create' && (
          <CreateContentView
            website={currentWebsite}
            initialTopic={creationInitialTopic}
            trendingTopics={trendingTopics}
            onBack={() => setCurrentView('dashboard')}
            onSubmit={handleSubmitCreateContent}
          />
        )}

        {/* VIEW 5: GENERATION PROGRESS ANIMATION & DATABASE REALTIME */}
        {currentView === 'generating' && (
          <GenerationProgressView
            topic={generatingTopic || activeJob?.topic || 'Crafting your article'}
            jobId={activeJobId}
            initialJob={activeJob}
            webhookError={webhookError}
            onComplete={handleGenerationAnimationComplete}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onJobUpdate={(updated) => {
              setActiveJob(updated);
            }}
            onJobDeleted={() => {
              setActiveJobId(undefined);
              setActiveJob(null);
              setGeneratingTopic('');
            }}
            onCreateNew={() => {
              setActiveJobId(undefined);
              setActiveJob(null);
              setGeneratingTopic('');
              setCurrentView('create');
            }}
          />
        )}

        {/* VIEW 6: ARTICLE EDITOR */}
        {currentView === 'editor' && activeArticle && (
          <ArticleEditorView
            article={activeArticle}
            onBack={() => setCurrentView('content')}
            onUpdateArticle={handleUpdateArticle}
            onOpenPreview={() => setIsPreviewOpen(true)}
            onOpenSchedule={() => setIsScheduleOpen(true)}
            onOpenPublish={() => setIsPublishOpen(true)}
          />
        )}
      </main>

      {/* MODAL 1: PREVIEW MODAL */}
      {isPreviewOpen && activeArticle && (
        <ArticlePreviewModal
          article={activeArticle}
          website={currentWebsite}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}

      {/* MODAL 2: SCHEDULE MODAL */}
      {isScheduleOpen && activeArticle && (
        <ScheduleModal
          article={activeArticle}
          website={currentWebsite}
          onClose={() => setIsScheduleOpen(false)}
          onSchedule={handleScheduleArticle}
          onNavigateToSettings={() => {
            setIsScheduleOpen(false);
            setCurrentView('settings');
          }}
        />
      )}

      {/* MODAL 3: PUBLISH MODAL */}
      {isPublishOpen && activeArticle && (
        <PublishModal
          article={activeArticle}
          website={currentWebsite}
          onClose={() => setIsPublishOpen(false)}
          onConfirmPublish={handleConfirmPublish}
          onCreateAnother={() => {
            setIsPublishOpen(false);
            handleStartCreateContent();
          }}
          onViewPublished={() => {
            setIsPublishOpen(false);
            setIsPreviewOpen(true);
          }}
        />
      )}
    </div>
  );
}
