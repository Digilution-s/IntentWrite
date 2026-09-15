import { supabase, isSupabaseConfigured } from './supabase';
import { Article, Website, DatabaseArticle } from '../types';
import { mapDatabaseArticleToArticle } from './contentJobs';

/**
 * Fetch all websites belonging to the user from Supabase
 */
export async function fetchUserWebsites(userId: string): Promise<Website[]> {
  if (!isSupabaseConfigured() || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching websites from Supabase:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any): Website => {
      const servicesStr = Array.isArray(row.services)
        ? row.services.join(', ')
        : row.services || '';
      const productsStr = Array.isArray(row.products)
        ? row.products.join(', ')
        : row.products || '';
      const productsServices = [servicesStr, productsStr].filter(Boolean).join('; ');

      return {
        id: row.id,
        url: row.url || '',
        name: row.name || row.business_name || '',
        businessDescription: row.business_description || '',
        industry: row.industry || '',
        targetAudience: row.target_audience || '',
        productsServices,
        location: row.country || '',
        brandVoice: (row.brand_voice as any) || 'Professional',
        isAnalyzed: row.analysis_status === 'analyzed' || Boolean(row.analyzed_at),
        analyzedAt: row.analyzed_at || undefined,
        stats: {
          totalPagesIndexed: 0,
          topTopics: row.industry ? [row.industry] : [],
        },
      };
    });
  } catch (err) {
    console.error('fetchUserWebsites failed:', err);
    return [];
  }
}

/**
 * Save or update website in Supabase
 */
export async function syncWebsiteToSupabase(
  website: Website,
  userId: string
): Promise<string> {
  if (!isSupabaseConfigured() || !userId) return website.id;

  try {
    // Parse services and products into arrays
    const rawServicesProducts = website.productsServices || '';
    const parts = rawServicesProducts
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const websiteName = (website.name || '').trim();
    const websiteUrl = (website.url || '').trim();

    const payload = {
      user_id: userId,
      name: websiteName,
      business_name: websiteName,
      url: websiteUrl,
      business_description: website.businessDescription || null,
      industry: website.industry || null,
      target_audience: website.targetAudience || null,
      services: parts.slice(0, 5),
      products: parts.slice(5),
      brand_voice: website.brandVoice || 'Professional',
      country: website.location || null,
      analysis_status: website.isAnalyzed ? 'analyzed' : 'not_analyzed',
      analyzed_at: website.analyzedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If website already has a valid UUID in Supabase, update it
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(website.id);

    if (isUuid) {
      const { data, error } = await supabase
        .from('websites')
        .update(payload)
        .eq('id', website.id)
        .select('id')
        .single();

      if (!error && data) {
        return data.id;
      }
    }

    // Check if user already has a website row to avoid duplicates
    const { data: existing } = await supabase
      .from('websites')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existing && existing.length > 0) {
      const existingId = existing[0].id;
      await supabase.from('websites').update(payload).eq('id', existingId);
      return existingId;
    }

    // Insert new website row
    const { data: inserted, error: insErr } = await supabase
      .from('websites')
      .insert(payload)
      .select('id')
      .single();

    if (insErr) {
      console.warn('Failed to insert website into Supabase:', insErr);
      return website.id;
    }

    return inserted?.id || website.id;
  } catch (err) {
    console.error('syncWebsiteToSupabase error:', err);
    return website.id;
  }
}

/**
 * Fetch all real articles belonging to the user from Supabase
 */
export async function fetchUserArticles(userId: string): Promise<Article[]> {
  if (!isSupabaseConfigured() || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching articles from Supabase:', error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => mapDatabaseArticleToArticle(row as DatabaseArticle));
  } catch (err) {
    console.error('fetchUserArticles error:', err);
    return [];
  }
}

/**
 * Save or update article in Supabase
 */
export async function syncArticleToSupabase(
  article: Article,
  userId: string,
  websiteId: string
): Promise<string> {
  if (!isSupabaseConfigured() || !userId) return article.id;

  try {
    // Preserve stored HTML without converting to markdown or modifying stored content
    const htmlContent = article.article_html || article.articleHtml;
    const rawContent = htmlContent || article.content || (article.sections
      ? article.sections
          .map((s) => {
            if (s.type === 'h2') return `## ${s.content}`;
            if (s.type === 'h3') return `### ${s.content}`;
            return s.content;
          })
          .join('\n\n')
      : article.summary || '');

    const payload: any = {
      user_id: userId,
      website_id: websiteId,
      topic: article.title || 'Untitled Article',
      title: article.title,
      slug: article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      content: rawContent,
      meta_title: article.metaTitle || article.title,
      meta_description: article.metaDescription || article.summary || '',
      excerpt: article.summary || '',
      primary_keyword: article.category || 'Power Engineering',
      secondary_keywords: [],
      long_tail_keywords: [],
      status: article.status || 'draft',
      published_url: article.publishedUrl || null,
      published_at: article.status === 'published' ? (article.published_at || new Date().toISOString()) : null,
      scheduled_at: article.scheduledFor
        ? `${article.scheduledFor.date}T${article.scheduledFor.time}:00Z`
        : ((article as any).scheduled_at || (article.status === 'scheduled' ? new Date(Date.now() + 86400000).toISOString() : null)),
      seo_score: article.seoScore ?? 95,
      aeo_score: article.aeoScore ?? 92,
      overall_score: article.qualityScore ?? 94,
      quality_status: 'verified',
      faq: article.faq || [],
      sources: article.sources || [],
      internal_links: article.internalLinks || [],
      cta: article.cta || null,
      updated_at: new Date().toISOString(),
    };

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(article.id);

    if (isUuid) {
      const { error: updErr } = await supabase
        .from('articles')
        .update(payload)
        .eq('id', article.id);

      if (!updErr) return article.id;
    }

    // Insert new article
    const { data: inserted, error: insErr } = await supabase
      .from('articles')
      .insert(payload)
      .select('id')
      .single();

    if (insErr) {
      console.warn('Failed to insert article into Supabase:', insErr);
      return article.id;
    }

    return inserted?.id || article.id;
  } catch (err) {
    console.error('syncArticleToSupabase error:', err);
    return article.id;
  }
}

/**
 * Delete article from Supabase
 */
export async function deleteArticleFromSupabase(
  articleId: string,
  userId: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId) return true;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId);
    if (!isUuid) return true;

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Error deleting article from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteArticleFromSupabase error:', err);
    return false;
  }
}
