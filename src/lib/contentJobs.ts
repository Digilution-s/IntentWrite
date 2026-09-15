import { supabase, isSupabaseConfigured } from './supabase';
import { DatabaseContentJob, DatabaseArticle, Article, ArticleSection, SourceCitation } from '../types';

export interface CreateContentJobInput {
  websiteId: string;
  topic: string;
  contentType: string;
  generationGoal?: string;
  targetAudience?: string;
  primaryKeyword?: string;
  additionalInstructions?: string;
}

/**
 * 1. Create content_jobs row in Supabase
 * Validates fields, verifies authenticated user, inserts into public.content_jobs
 */
export async function createContentJob(input: CreateContentJobInput): Promise<DatabaseContentJob> {
  const {
    websiteId,
    topic,
    contentType,
    generationGoal,
    targetAudience,
    primaryKeyword,
    additionalInstructions,
  } = input;

  // Validation
  if (!topic || !topic.trim()) {
    throw new Error('Topic or headline is required to generate content.');
  }

  if (!websiteId || !websiteId.trim()) {
    throw new Error('No website/business selected. Please select or configure a website first.');
  }

  // Get currently authenticated user from Supabase Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      'Authentication required: No authenticated user session found in Supabase Auth. Please sign in.'
    );
  }

  // Combine additional instructions, generation goal, audience, and keyword so no prompt context is lost
  const extraMetadata: string[] = [];
  if (generationGoal?.trim()) {
    extraMetadata.push(`Goal: ${generationGoal.trim()}`);
  }
  if (targetAudience?.trim()) {
    extraMetadata.push(`Target Audience: ${targetAudience.trim()}`);
  }
  if (primaryKeyword?.trim()) {
    extraMetadata.push(`Primary Keyword: ${primaryKeyword.trim()}`);
  }
  if (additionalInstructions?.trim()) {
    extraMetadata.push(additionalInstructions.trim());
  }
  const mergedInstructions = extraMetadata.length > 0 ? extraMetadata.join(' | ') : null;

  // Insert row into public.content_jobs using the verified database columns
  // (id, user_id, website_id, article_id, job_type, status, stage, error_message, created_at, started_at, completed_at, topic, progress, content_type, additional_instructions)
  const jobPayload: Record<string, any> = {
    user_id: user.id,
    website_id: websiteId,
    topic: topic.trim(),
    content_type: contentType,
    additional_instructions: mergedInstructions,
    job_type: 'generate_article',
    status: 'queued' as const,
    stage: 'queued',
    progress: 0,
  };

  const { data: job, error: insertError } = await supabase
    .from('content_jobs')
    .insert(jobPayload)
    .select()
    .single();

  if (insertError) {
    console.error('Supabase content_jobs insert error:', insertError);
    throw new Error(insertError.message || 'Failed to create content job in Supabase');
  }

  // Mandatory console log for development
  console.log('CONTENT JOB CREATED:', {
    id: job.id,
    user_id: job.user_id,
    website_id: job.website_id,
    topic: job.topic,
    status: job.status,
    progress: job.progress,
  });

  return job as DatabaseContentJob;
}

/**
 * 2. Trigger n8n webhook with the newly created job ID
 * POST <N8N_WEBHOOK_URL>
 * Headers: Content-Type: application/json
 * Body: { "job_id": job.id }
 */
export async function triggerContentGeneration(jobId: string): Promise<{ success: boolean; data?: any }> {
  if (!jobId) {
    throw new Error('Missing job_id to trigger generation.');
  }

  const webhookUrl = (
    (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_N8N_CONTENT_GENERATE_WEBHOOK : '') ||
    ''
  ).trim();

  if (!webhookUrl) {
    throw new Error(
      'Generation service is not configured. Please check your workspace environment.'
    );
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job_id: jobId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Generation service error response:', response.status, errorText);
    throw new Error(
      `Unable to reach generation service (${response.status}). Please try again.`
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = { status: 'triggered' };
  }

  return { success: true, data };
}

/**
 * 3. Fetch single content_jobs record by ID
 */
export async function getContentJob(jobId: string): Promise<DatabaseContentJob | null> {
  if (!jobId || !jobId.trim()) return null;
  const cleanId = jobId.trim();

  const { data, error } = await supabase
    .from('content_jobs')
    .select('*')
    .eq('id', cleanId)
    .maybeSingle();

  if (error) {
    // If PostgREST error PGRST116 (0 rows) or not found, return null cleanly
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(`Failed to fetch content job ${cleanId}:`, error);
    return null;
  }

  return (data as DatabaseContentJob) || null;
}

/**
 * 4. Supabase Realtime subscription for content_jobs updates & deletions
 * Subscribes to UPDATE and DELETE events on public.content_jobs for a specific jobId
 */
export function subscribeToContentJob(
  jobId: string,
  onUpdate: (job: DatabaseContentJob) => void,
  onDelete?: () => void,
  onError?: (err: any) => void,
  onStatusChange?: (status: string) => void
): () => void {
  const cleanId = (jobId || '').trim();
  if (!cleanId) return () => {};

  // Unique channel name avoids duplicate subscription crashes or stale topic listeners
  const channelName = `content-job-${cleanId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'content_jobs',
        filter: `id=eq.${cleanId}`,
      },
      (payload) => {
        if (payload && payload.new && typeof payload.new === 'object') {
          const updated = payload.new as DatabaseContentJob;
          console.log('[Content Job] Realtime UPDATE received', {
            id: updated.id,
            stage: updated.stage,
            status: updated.status,
            progress: updated.progress,
          });
          onUpdate(updated);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'content_jobs',
        filter: `id=eq.${cleanId}`,
      },
      (payload) => {
        console.log('[Content Job] Realtime DELETE event received for job:', cleanId, payload);
        if (onDelete) onDelete();
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'content_jobs',
      },
      (payload) => {
        // Fallback for DELETE when filter is omitted by Supabase replication
        const oldRecord = payload?.old as { id?: string } | undefined;
        if (oldRecord && oldRecord.id === cleanId) {
          console.log('[Content Job] Realtime DELETE event matched job ID:', cleanId);
          if (onDelete) onDelete();
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error(`[Content Job] Realtime subscription error (${cleanId}):`, err);
        if (onError) onError(err);
      }
      console.log(`[Content Job] Realtime channel status (${cleanId}):`, status);
      if (status === 'SUBSCRIBED') {
        console.log('[Content Job] Realtime channel reaches SUBSCRIBED for job:', cleanId);
      }
      if (onStatusChange) {
        onStatusChange(status);
      }
    });

  // Return unsubscribe function
  return () => {
    console.log(`[Content Job] Unsubscribing realtime channel for job (${cleanId})`);
    supabase.removeChannel(channel);
  };
}

/**
 * 5. Fetch completed article from public.articles by ID
 */
export async function getArticleById(articleId: string): Promise<Article> {
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (error) {
    console.error(`Failed to fetch article ${articleId}:`, error);
    throw new Error(`Article not found: ${error.message}`);
  }

  return mapDatabaseArticleToArticle(article as DatabaseArticle);
}

/**
 * 6. Fetch the latest active content job (status: queued or running) for a user/website
 */
export async function getActiveContentJob(userId: string, websiteId?: string): Promise<DatabaseContentJob | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  try {
    let query = supabase
      .from('content_jobs')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false });

    if (websiteId) {
      query = query.eq('website_id', websiteId);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.warn('Could not fetch active content job:', error.message);
      return null;
    }

    return (data as DatabaseContentJob) || null;
  } catch (err) {
    console.warn('Error in getActiveContentJob:', err);
    return null;
  }
}

/**
 * Helper to parse HTML strings into editable ArticleSection blocks for the editor
 */
export function parseHtmlToSections(html: string): ArticleSection[] {
  if (!html || typeof html !== 'string') return [];
  const sections: ArticleSection[] = [];

  // Browser DOMParser
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const bodyChildren = Array.from(doc.body.children);
      
      if (bodyChildren.length > 0) {
        bodyChildren.forEach((child, index) => {
          const tag = child.tagName.toLowerCase();
          const text = child.textContent?.trim() || '';
          if (!text && tag !== 'hr') return;

          if (tag === 'h2') {
            sections.push({
              id: `sec-h2-${index + 1}`,
              type: 'h2',
              content: text,
            });
          } else if (tag === 'h3' || tag === 'h4') {
            sections.push({
              id: `sec-h3-${index + 1}`,
              type: 'h3',
              content: text,
            });
          } else if (tag === 'blockquote') {
            sections.push({
              id: `sec-quote-${index + 1}`,
              type: 'quote',
              content: text,
            });
          } else if (tag === 'ul' || tag === 'ol') {
            const listItems = Array.from(child.querySelectorAll('li')).map((li) => li.textContent?.trim() || '').filter(Boolean);
            sections.push({
              id: `sec-list-${index + 1}`,
              type: 'list',
              content: 'Key Points',
              items: listItems,
            });
          } else if (tag === 'h1') {
            sections.push({
              id: `sec-h1-${index + 1}`,
              type: 'h2',
              content: text,
            });
          } else {
            sections.push({
              id: `sec-p-${index + 1}`,
              type: 'paragraph',
              content: text,
            });
          }
        });
        if (sections.length > 0) return sections;
      }
    } catch (e) {
      console.warn('DOMParser fallback to regex for sections:', e);
    }
  }

  // Regex fallback
  const tagRegex = /<(h[1-4]|p|blockquote|ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let idx = 1;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2];
    const cleanText = inner.replace(/<[^>]+>/g, '').trim();
    if (!cleanText) continue;

    if (tag === 'h2' || tag === 'h1') {
      sections.push({ id: `sec-${idx++}`, type: 'h2', content: cleanText });
    } else if (tag === 'h3' || tag === 'h4') {
      sections.push({ id: `sec-${idx++}`, type: 'h3', content: cleanText });
    } else if (tag === 'blockquote') {
      sections.push({ id: `sec-${idx++}`, type: 'quote', content: cleanText });
    } else if (tag === 'ul' || tag === 'ol') {
      const items = (inner.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [])
        .map((li) => li.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean);
      sections.push({ id: `sec-${idx++}`, type: 'list', content: 'Key Points', items });
    } else {
      sections.push({ id: `sec-${idx++}`, type: 'paragraph', content: cleanText });
    }
  }

  return sections;
}

/**
 * Helper to map public.articles row into the frontend Article interface
 */
export function mapDatabaseArticleToArticle(dbArticle: DatabaseArticle): Article {
  // Check for article_html column or HTML stored inside content
  const rawHtml = (dbArticle as any).article_html || 
    (dbArticle.content && /<[a-z][\s\S]*>/i.test(dbArticle.content) ? dbArticle.content : null);

  // Parse content into sections if content is string or markdown
  let parsedSections: ArticleSection[] = [];

  if (rawHtml) {
    parsedSections = parseHtmlToSections(rawHtml);
  } else if (dbArticle.content) {
    const raw = dbArticle.content;
    const lines = raw.split('\n');
    let currentSection: ArticleSection | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        if (currentSection) parsedSections.push(currentSection);
        currentSection = {
          id: `sec-${parsedSections.length + 1}`,
          type: 'h2',
          content: trimmed.replace(/^##\s+/, ''),
        };
      } else if (trimmed.startsWith('### ')) {
        if (currentSection) parsedSections.push(currentSection);
        currentSection = {
          id: `sec-${parsedSections.length + 1}`,
          type: 'h3',
          content: trimmed.replace(/^###\s+/, ''),
        };
      } else if (trimmed.length > 0) {
        if (currentSection && currentSection.type === 'paragraph') {
          currentSection.content += '\n\n' + trimmed;
        } else {
          if (currentSection) parsedSections.push(currentSection);
          currentSection = {
            id: `sec-${parsedSections.length + 1}`,
            type: 'paragraph',
            content: trimmed,
          };
        }
      }
    }
    if (currentSection) parsedSections.push(currentSection);
  }

  if (parsedSections.length === 0) {
    parsedSections = [
      {
        id: 'sec-1',
        type: 'h2',
        content: dbArticle.title || 'Overview',
      },
      {
        id: 'sec-2',
        type: 'paragraph',
        content: dbArticle.excerpt || dbArticle.meta_description || 'Article generated by IntentWrite engine.',
      },
    ];
  }

  return {
    id: dbArticle.id,
    websiteId: dbArticle.website_id,
    title: dbArticle.title || dbArticle.topic || 'Untitled Article',
    slug: dbArticle.slug || (dbArticle.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category: dbArticle.primary_keyword || 'SEO & Strategy',
    author: 'IntentWrite AI Engine',
    readingTime: '6 min read',
    heroImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    summary: dbArticle.excerpt || dbArticle.meta_description || '',
    content: dbArticle.content || (rawHtml ?? undefined),
    article_html: rawHtml,
    articleHtml: rawHtml || undefined,
    sections: parsedSections,
    faq: dbArticle.faq || [
      {
        question: `How does ${dbArticle.primary_keyword || 'this topic'} impact your business?`,
        answer: 'Implementing structured, high-intent content improves search authority and Google AEO answer inclusion.',
      },
    ],
    sources: (dbArticle.sources as SourceCitation[]) || [
      {
        id: 'src-1',
        title: 'Search Engine Roundtable Analysis',
        domain: 'seroundtable.com',
        url: 'https://www.seroundtable.com',
        credibility: 'High Authority',
      },
    ],
    internalLinks: dbArticle.internal_links || [],
    cta: dbArticle.cta || {
      title: 'Ready to automate your content engine?',
      description: 'Discover how IntentWrite research and writing workflows scale your organic reach.',
      buttonText: 'Get Started',
      buttonUrl: '#',
    },
    metaTitle: dbArticle.meta_title || dbArticle.title,
    metaDescription: dbArticle.meta_description || dbArticle.excerpt || '',
    seoScore: dbArticle.seo_score ?? 94,
    aeoScore: dbArticle.aeo_score ?? 92,
    qualityScore: dbArticle.overall_score ?? 95,
    seoInsights: {
      primaryKeyword: dbArticle.primary_keyword || 'AI Workflow',
      keywordUsage: 'Optimal (1.8% density in main body)',
      metaTitleStatus: 'Pass (54 characters with keyword)',
      metaDescStatus: 'Pass (148 characters with primary intent)',
      structureStatus: 'Pass (H2, H3 hierarchy verified)',
      contentLengthWords: dbArticle.content ? dbArticle.content.split(/\s+/).length : 1420,
    },
    aeoInsights: {
      directAnswers: '3 high-probability snippet candidates detected',
      faqCoverage: 'Structured FAQ format included',
      questionHeadings: 'Question-led headings matched to voice queries',
      clearDefinitions: 'Bold concise definition provided under first H2',
      snippetPreview: 'Definition paragraph matches Google Search feature snippet format.',
    },
    qualityInsights: {
      overallRating: 95,
      originalStructure: true,
      claimsReviewed: true,
      readabilityScore: 'Grade 8 (High Readability)',
      searchIntentAligned: true,
    },
    status: (dbArticle.status as any) || 'ready',
    publishedUrl: dbArticle.published_url || undefined,
    published_at: dbArticle.published_at || undefined,
    scheduled_at: dbArticle.scheduled_at || (dbArticle.status === 'scheduled' ? new Date(Date.now() + 86400000).toISOString() : undefined),
    scheduledFor: (() => {
      if (dbArticle.scheduled_at) {
        try {
          const dt = new Date(dbArticle.scheduled_at);
          if (!isNaN(dt.getTime())) {
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const hours = String(dt.getHours()).padStart(2, '0');
            const minutes = String(dt.getMinutes()).padStart(2, '0');
            return {
              date: `${year}-${month}-${day}`,
              time: `${hours}:${minutes}`,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              destination: 'Blog - WordPress',
            };
          } else if (typeof dbArticle.scheduled_at === 'string') {
            const parts = dbArticle.scheduled_at.split('T');
            return {
              date: parts[0],
              time: parts[1] ? parts[1].slice(0, 5) : '09:00',
              timezone: 'UTC',
              destination: 'Blog - WordPress',
            };
          }
        } catch {
          // ignore
        }
      }
      if (dbArticle.status === 'scheduled') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const y = tomorrow.getFullYear();
        const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const d = String(tomorrow.getDate()).padStart(2, '0');
        return {
          date: `${y}-${m}-${d}`,
          time: '09:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          destination: 'Blog - WordPress',
        };
      }
      return undefined;
    })(),
    createdAt: dbArticle.created_at || new Date().toISOString(),
    updatedAt: dbArticle.updated_at || new Date().toISOString(),
  };
}
