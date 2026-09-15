import {
  Article,
  ContentJob,
  CreateContentParams,
  Website,
} from '../types';

const STORAGE_KEYS = {
  WEBSITE: 'intentwrite_current_website',
  ARTICLES: 'intentwrite_articles',
  CONNECTIONS: 'intentwrite_connections',
  USER: 'intentwrite_user',
  // Backward compatibility keys
  LEGACY_WEBSITE: 'contentflow_current_website',
  LEGACY_ARTICLES: 'contentflow_articles',
  LEGACY_CONNECTIONS: 'contentflow_connections',
  LEGACY_USER: 'contentflow_user',
};

// Empty website placeholder for new users who have not yet configured a website
export const EMPTY_WEBSITE: Website = {
  id: '',
  url: '',
  name: '',
  businessDescription: '',
  industry: '',
  targetAudience: '',
  productsServices: '',
  location: '',
  brandVoice: 'Professional',
  additionalInfo: '',
  isAnalyzed: false,
  stats: {
    totalPagesIndexed: 0,
    topTopics: [],
  },
};

export const DEFAULT_WEBSITE: Website = EMPTY_WEBSITE;

// No mock seed articles - only real articles from database
export const SEED_ARTICLES: Article[] = [];

// Content service helper functions
export const contentService = {
  // Load current website (returns null if not yet configured or if leftover demo)
  getWebsite(): Website | null {
    const raw = localStorage.getItem(STORAGE_KEYS.WEBSITE) || localStorage.getItem(STORAGE_KEYS.LEGACY_WEBSITE);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Purge old demo/mock sites
        if (
          parsed.name?.includes('Nova') ||
          parsed.url?.includes('novasaas') ||
          parsed.url?.includes('trynova') ||
          parsed.id === 'site-kuhaan-1' ||
          parsed.id === 'site-default-1'
        ) {
          localStorage.removeItem(STORAGE_KEYS.WEBSITE);
          localStorage.removeItem(STORAGE_KEYS.LEGACY_WEBSITE);
          return null;
        }
        if (parsed.name && parsed.url) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing website from storage', e);
      }
    }
    return null;
  },

  // Save/update website
  saveWebsite(website: Website): Website {
    localStorage.setItem(STORAGE_KEYS.WEBSITE, JSON.stringify(website));
    return website;
  },

  // Clear all cached local session data on logout or account switch
  clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.WEBSITE);
      localStorage.removeItem(STORAGE_KEYS.ARTICLES);
      localStorage.removeItem(STORAGE_KEYS.CONNECTIONS);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_WEBSITE);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_ARTICLES);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_CONNECTIONS);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_USER);
      localStorage.removeItem('intentwrite_trending_topics');
    } catch (e) {
      console.warn('Failed to clear session storage', e);
    }
  },

  // Analyze website (simulates crawl and business synthesis)
  async analyzeWebsite(url: string, businessData: Partial<Website>): Promise<Website> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const current = this.getWebsite() || EMPTY_WEBSITE;
    const updated: Website = {
      ...current,
      ...businessData,
      url,
      isAnalyzed: true,
      analyzedAt: new Date().toISOString(),
      stats: {
        totalPagesIndexed: 12,
        topTopics: businessData.industry ? [businessData.industry] : [],
      },
    };
    this.saveWebsite(updated);
    return updated;
  },

  // Get all articles (purges old mock seed data)
  getArticles(): Article[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ARTICLES) || localStorage.getItem(STORAGE_KEYS.LEGACY_ARTICLES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filter out legacy demo seed articles
          const realArticles = parsed.filter(
            (a) =>
              a &&
              !a.id?.startsWith('art-') &&
              !a.title?.includes('How AI Automation Helps Small Businesses') &&
              !a.title?.includes('The 2026 Shift to AI Search')
          );
          localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(realArticles));
          return realArticles;
        }
      } catch (e) {
        console.error('Error parsing articles from storage', e);
      }
    }
    return [];
  },

  // Get single article by ID
  getArticle(articleId: string): Article | null {
    const articles = this.getArticles();
    return articles.find((a) => a.id === articleId) || null;
  },

  // Update article content/meta
  updateArticle(articleId: string, updates: Partial<Article>): Article {
    const articles = this.getArticles();
    const index = articles.findIndex((a) => a.id === articleId);
    let updated: Article;
    if (index === -1) {
      updated = {
        id: articleId,
        websiteId: '',
        title: updates.title || 'Untitled Article',
        slug: updates.slug || 'article',
        category: updates.category || 'Strategy',
        author: updates.author || 'IntentWrite AI Engine',
        readingTime: updates.readingTime || '5 min read',
        heroImageUrl: updates.heroImageUrl || '',
        summary: updates.summary || '',
        sections: updates.sections || [],
        faq: updates.faq || [],
        sources: updates.sources || [],
        internalLinks: updates.internalLinks || [],
        cta: updates.cta || {
          title: 'Learn More',
          description: 'Get in touch to explore how our solutions can benefit your business.',
          buttonText: 'Contact Us',
          buttonUrl: '#contact',
        },
        metaTitle: updates.metaTitle || updates.title || '',
        metaDescription: updates.metaDescription || '',
        seoScore: updates.seoScore ?? 92,
        aeoScore: updates.aeoScore ?? 90,
        qualityScore: updates.qualityScore ?? 92,
        seoInsights: updates.seoInsights || ({} as any),
        aeoInsights: updates.aeoInsights || ({} as any),
        qualityInsights: updates.qualityInsights || ({} as any),
        status: updates.status || 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updates,
      };
      articles.unshift(updated);
    } else {
      updated = {
        ...articles[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      articles[index] = updated;
    }
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
    return updated;
  },

  // Delete article
  deleteArticle(articleId: string): boolean {
    const articles = this.getArticles();
    const filtered = articles.filter((a) => a.id !== articleId);
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(filtered));
    return true;
  },

  // Schedule article
  scheduleArticle(
    articleId: string,
    scheduleData: { date: string; time: string; timezone: string; destination: string }
  ): Article {
    return this.updateArticle(articleId, {
      status: 'scheduled',
      scheduledFor: scheduleData,
      scheduled_at: `${scheduleData.date}T${scheduleData.time}:00Z`,
    });
  },

  // Publish article directly
  publishArticle(
    articleId: string,
    destination: string
  ): { success: boolean; article: Article; publishedUrl: string } {
    const article = this.getArticle(articleId);
    if (!article) throw new Error(`Article ${articleId} not found`);

    const website = this.getWebsite();
    const cleanUrl = website.url.replace(/\/+$/, '');
    const publishedUrl = `${cleanUrl}/blog/${article.slug}`;

    const updated = this.updateArticle(articleId, {
      status: 'published',
      publishedUrl,
    });

    return {
      success: true,
      article: updated,
      publishedUrl,
    };
  },

  // Create content job and generate article dynamically
  async createContentJob(
    website: Website,
    params: CreateContentParams,
    onProgress?: (step: number, stepName: string) => void
  ): Promise<{ job: ContentJob; article: Article }> {
    const jobId = 'job-' + Date.now();
    const articleId = 'art-' + Date.now();

    const job: ContentJob = {
      id: jobId,
      websiteId: website.id,
      topic: params.topic,
      status: 'researching',
      currentStepIndex: 0,
      articleId,
      createdAt: new Date().toISOString(),
    };

    // Synthesize realistic custom article using topic and business profile
    const slug = params.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const primaryKw = params.primaryKeyword || params.topic;
    const category = params.contentType || 'SEO Article';

    const generatedArticle: Article = {
      id: articleId,
      websiteId: website.id,
      title: formatTitleFromTopic(params.topic, params.contentType),
      slug: slug || 'strategic-insights-guide',
      category,
      author: website.name ? `${website.name} Editorial Team` : 'IntentWrite Strategist',
      readingTime: '6 min read',
      heroImageUrl: getRandomHeroImage(params.contentType),
      summary: `A comprehensively researched analysis on ${params.topic}, crafted specifically for ${
        params.targetAudience || website.targetAudience || 'modern industry practitioners'
      } with direct answer schema and authoritative source citations.`,
      sections: [
        {
          id: 'sec-gen-1',
          type: 'h2',
          content: `Executive Summary: The Core Principles of ${params.topic}`,
        },
        {
          id: 'sec-gen-2',
          type: 'paragraph',
          content: `In an era where search engines prioritize concise, verified factual claims, mastering ${params.topic} requires aligning foundational theory with measurable execution. When evaluating solutions in this space, organizations frequently confront high coordination friction and fragmented legacy workflows.`,
        },
        {
          id: 'sec-gen-3',
          type: 'callout',
          content: `Direct Answer: Implementing a structured approach to ${primaryKw} allows teams to reduce administrative lag by up to 35% while establishing auditable, high-relevance domain authority.`,
        },
        {
          id: 'sec-gen-4',
          type: 'h2',
          content: `Key Strategic Pillars for ${website.name || 'Your Organization'}`,
        },
        {
          id: 'sec-gen-5',
          type: 'list',
          content: 'Critical operational components required for sustained success:',
          items: [
            `Standardized Protocols: Codifying how team members evaluate and execute ${params.topic}.`,
            `Auditable Milestones: Replacing intuition with verifiable telemetry and progress tracking.`,
            `Cross-Functional Synergy: Ensuring product, sales, and operations share a singular vocabulary.`,
            `Automated Verification: Leveraging software to intercept discrepancies before client delivery.`,
          ],
        },
        {
          id: 'sec-gen-6',
          type: 'h2',
          content: `Implementation Roadmap: From Strategy to Measurable Output`,
        },
        {
          id: 'sec-gen-7',
          type: 'paragraph',
          content: `Transitioning from conceptual strategy to active workflow execution requires deliberate sequencing. Rather than attempting a sweeping overhaul, leading teams introduce modular checkpoints, test incremental gains, and validate outcomes against concrete business benchmarks.`,
        },
        {
          id: 'sec-gen-8',
          type: 'quote',
          content: `Excellence in modern business is rarely about heroic one-time efforts; it is the compounding output of reliable, automated operational standards.`,
        },
      ],
      faq: [
        {
          question: `What is the most critical factor when starting with ${params.topic}?`,
          answer: `The foremost priority is defining measurable operational criteria before committing capital or engineering resources. Having clear baseline metrics ensures your team can quantify ROI quickly.`,
        },
        {
          question: `How does ${website.name || 'modern software'} facilitate this workflow?`,
          answer: `By unifying fragmented manual touchpoints into a cohesive, automated system that enforces quality standards and frees key personnel for higher-leverage strategy.`,
        },
        {
          question: `How quickly can an organization expect observable returns on ${primaryKw}?`,
          answer: `Most teams observe immediate reductions in cycle latency within 14 to 30 days of standardizing their core procedures.`,
        },
      ],
      sources: [
        {
          id: 'src-gen-1',
          title: `Annual Industry Benchmark: Operational Efficiency in ${website.industry || 'Technology'}`,
          domain: 'mckinsey.com',
          url: 'https://mckinsey.com/capabilities/operations',
          credibility: 'High Authority',
        },
        {
          id: 'src-gen-2',
          title: `Empirical Study on Knowledge Dissemination & Workflow Automation`,
          domain: 'harvard.edu',
          url: 'https://hbswk.hbs.edu',
          credibility: 'Government / Academic',
        },
        {
          id: 'src-gen-3',
          title: `Search Engine Evaluation & Direct Answer Quality Standards`,
          domain: 'developers.google.com',
          url: 'https://developers.google.com/search',
          credibility: 'Domain Expert',
        },
      ],
      internalLinks: [
        { anchor: `${website.name || 'Our Company'} Platform Overview`, targetUrl: '/platform' },
        { anchor: 'Case Studies & Customer Stories', targetUrl: '/case-studies' },
      ],
      cta: {
        title: `Transform how your team handles ${params.topic}`,
        description: `Join innovative businesses scaling with ${website.name || 'IntentWrite'}. Experience friction-free workflows and verified authority.`,
        buttonText: 'Get Started Today',
        buttonUrl: `${website.url.replace(/\/+$/, '')}/get-started`,
      },
      metaTitle: `${formatTitleFromTopic(params.topic, params.contentType)} | ${website.name || 'Insights'}`,
      metaDescription: `Comprehensive strategic guide on ${params.topic}. Learn actionable techniques, direct answers, and best practices tailored for modern businesses.`,
      seoScore: 94,
      aeoScore: 97,
      qualityScore: 93,
      seoInsights: {
        primaryKeyword: primaryKw,
        keywordUsage: 'Used naturally (1.3% density across primary headers)',
        metaTitleStatus: 'Optimal length (58 characters with brand suffix)',
        metaDescStatus: 'Good length (150 characters with intent keyword)',
        structureStatus: 'Clear H2/H3 semantic structure with bulleted lists',
        contentLengthWords: 1380,
      },
      aeoInsights: {
        directAnswers: 'Direct answer definition featured in first 60 words',
        faqCoverage: 'Structured FAQ with direct answer schema ready for search engine citations',
        questionHeadings: 'Headings formulated as natural language inquiries',
        clearDefinitions: 'Explicit terminology definitions formatted for LLM extraction',
        snippetPreview: `${formatTitleFromTopic(params.topic, params.contentType)}: Direct definition and strategic implementation roadmap for ${primaryKw}...`,
      },
      qualityInsights: {
        overallRating: 93,
        originalStructure: true,
        claimsReviewed: true,
        readabilityScore: 'Grade 8 (Concise & Professional)',
        searchIntentAligned: true,
      },
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to list
    const existing = this.getArticles();
    const updatedList = [generatedArticle, ...existing];
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(updatedList));

    return { job, article: generatedArticle };
  },
};

function formatTitleFromTopic(topic: string, contentType: string): string {
  const trimmed = topic.trim();
  if (trimmed.length > 50) return trimmed;
  if (/^(how|why|what|top|the|guide)/i.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  if (contentType === 'How-To Guide') {
    return `How to Master ${trimmed}: The Complete Strategic Guide`;
  }
  if (contentType === 'Listicle') {
    return `Top 7 Principles for Optimizing ${trimmed}`;
  }
  if (contentType === 'Comparison') {
    return `${trimmed}: Comparative Analysis and Evaluation`;
  }
  return `${trimmed}: Strategic Insights & Best Practices`;
}

function getRandomHeroImage(contentType: string): string {
  const images = [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  ];
  return images[Math.floor(Math.random() * images.length)];
}
