export type ContentType =
  | 'SEO Article'
  | 'How-To Guide'
  | 'Listicle'
  | 'Comparison'
  | 'Buying Guide'
  | 'Educational'
  | 'Product Article'
  | 'Case Study'
  | 'Industry Analysis';

export type ArticleObjective =
  | 'Increase organic traffic'
  | 'Educate readers'
  | 'Generate leads'
  | 'Promote a product/service'
  | 'Build authority';

export type BrandVoice =
  | 'Professional'
  | 'Friendly'
  | 'Technical'
  | 'Premium'
  | 'Conversational';

export type ArticleStatus =
  | 'draft'
  | 'generating'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'failed';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: 'Starter' | 'Growth' | 'Enterprise';
}

export interface Website {
  id: string;
  url: string;
  name: string;
  businessDescription: string;
  industry: string;
  targetAudience: string;
  productsServices: string;
  location: string;
  brandVoice: BrandVoice;
  additionalInfo?: string;
  isAnalyzed: boolean;
  analyzedAt?: string;
  stats?: {
    totalPagesIndexed: number;
    topTopics: string[];
  };
}

export interface WebsiteIntelligence {
  websiteId: string;
  coreThemes: string[];
  competitorGaps: string[];
  recommendedKeywords: string[];
  aeoKnowledgeGraphNodes: string[];
}

export interface AdvancedOptions {
  tone: string;
  articleLength: 'Standard (~1,200 words)' | 'In-depth (~2,000 words)' | 'Comprehensive (~3,000+ words)';
  country: string;
  internalLinkPreferences: string;
  ctaPreferences: string;
}

export interface CreateContentParams {
  topic: string;
  contentType: ContentType;
  objective: ArticleObjective;
  targetAudience?: string;
  primaryKeyword?: string;
  additionalInstructions?: string;
  advancedOptions?: AdvancedOptions;
}

export interface SourceCitation {
  id: string;
  title: string;
  domain: string;
  url: string;
  credibility: 'High Authority' | 'Industry Research' | 'Government / Academic' | 'Domain Expert';
}

export interface ArticleSection {
  id: string;
  type: 'h2' | 'h3' | 'paragraph' | 'list' | 'quote' | 'callout';
  content: string;
  items?: string[];
}

export interface Article {
  id: string;
  websiteId: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  readingTime: string;
  heroImageUrl?: string;
  summary: string;
  content?: string;
  article_html?: string | null;
  articleHtml?: string;
  sections: ArticleSection[];
  faq: Array<{ question: string; answer: string }>;
  sources: SourceCitation[];
  internalLinks: Array<{ anchor: string; targetUrl: string }>;
  cta: {
    title: string;
    description: string;
    buttonText: string;
    buttonUrl: string;
  };
  metaTitle: string;
  metaDescription: string;
  seoScore: number;
  aeoScore: number;
  qualityScore: number;
  seoInsights: {
    primaryKeyword: string;
    keywordUsage: string;
    metaTitleStatus: string;
    metaDescStatus: string;
    structureStatus: string;
    contentLengthWords: number;
  };
  aeoInsights: {
    directAnswers: string;
    faqCoverage: string;
    questionHeadings: string;
    clearDefinitions: string;
    snippetPreview: string;
  };
  qualityInsights: {
    overallRating: number;
    originalStructure: boolean;
    claimsReviewed: boolean;
    readabilityScore: string;
    searchIntentAligned: boolean;
  };
  status: ArticleStatus;
  publishedUrl?: string;
  published_at?: string | null;
  scheduled_at?: string | null;
  scheduledFor?: {
    date: string;
    time: string;
    timezone: string;
    destination: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContentJob {
  id: string;
  websiteId: string;
  topic: string;
  status: 'queued' | 'researching' | 'strategizing' | 'writing' | 'quality_check' | 'completed' | 'failed';
  currentStepIndex: number;
  articleId?: string;
  createdAt: string;
}

export interface PublishingConnection {
  id: string;
  type: 'wordpress' | 'webhook' | 'ghost' | 'webflow';
  name: string;
  isConnected: boolean;
  endpointUrl?: string;
  lastSynced?: string;
}

export interface TrendingTopic {
  id: string;
  rank: number;
  title: string;
  momentum: string;
  context: string;
  source: string;
  category: string;
  discoveredAt: string;
  searchIntent?: 'Informational' | 'Commercial' | 'Educational' | 'Comparative';
}

export interface AgentScheduleConfig {
  intervalHours: number; // e.g. 48
  scheduledHour: string; // e.g. "06:00"
  enabled: boolean;
  model: 'deepseek-chat' | 'deepseek-reasoner';
  apiKey?: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

// ==========================================
// SUPABASE DATABASE SCHEMAS
// ==========================================

export interface DatabaseWebsite {
  id: string;
  user_id: string;
  name: string;
  url: string;
  business_description?: string | null;
  industry?: string | null;
  target_audience?: string | null;
  services?: string | null;
  products?: string | null;
  brand_voice?: string | null;
  country?: string | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseContentJob {
  id: string;
  user_id: string;
  website_id: string;
  article_id?: string | null;
  job_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: 'queued' | 'research' | 'strategy' | 'writing' | 'optimization' | 'validation' | 'completed' | string;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  topic: string;
  progress: number;
  content_type: string;
  additional_instructions?: string | null;
  generation_goal?: string | null;
  target_audience?: string | null;
  primary_keyword?: string | null;
}

export interface DatabaseArticle {
  id: string;
  user_id: string;
  website_id: string;
  topic?: string;
  title: string;
  slug?: string;
  content?: string;
  article_html?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  status?: string;
  scheduled_at?: string | null;
  published_at?: string | null;
  published_url?: string | null;
  created_at: string;
  updated_at?: string;
  content_job_id?: string | null;
  excerpt?: string | null;
  primary_keyword?: string | null;
  secondary_keywords?: string[] | null;
  long_tail_keywords?: string[] | null;
  faq?: Array<{ question: string; answer: string }> | null;
  internal_links?: Array<{ anchor: string; targetUrl: string }> | null;
  sources?: SourceCitation[] | null;
  cta?: {
    title: string;
    description: string;
    buttonText: string;
    buttonUrl: string;
  } | null;
  seo_score?: number | null;
  aeo_score?: number | null;
  overall_score?: number | null;
  quality_status?: string | null;
}

