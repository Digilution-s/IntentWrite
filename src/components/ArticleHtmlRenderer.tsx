import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface ArticleHtmlRendererProps {
  html: string;
  className?: string;
}

/**
 * Configure DOMPurify to securely sanitize article HTML while preserving
 * rich editorial formatting: headings, paragraphs, lists, tables, links,
 * quotes, bold/italics, code blocks, images, and semantic structure.
 */
function sanitizeArticleHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  // Configure DOMPurify options
  const clean = DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'ul', 'ol', 'li',
      'blockquote', 'q', 'cite',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
      'a', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'span', 'small', 'sub', 'sup',
      'code', 'pre', 'kbd', 'samp',
      'hr', 'br',
      'img', 'figure', 'figcaption',
      'div', 'section', 'article'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'target', 'rel', 'width', 'height', 'loading',
      'colspan', 'rowspan', 'scope', 'align', 'valign'
    ],
    ALLOW_DATA_ATTR: false,
  });

  // Ensure all anchor tags have safe external link attributes (target="_blank" rel="noopener noreferrer")
  // using a lightweight browser DOM or regex transformation
  return clean.replace(/<a\b(?![^>]*\btarget=)([^>]*)>/gi, '<a target="_blank" rel="noopener noreferrer" $1>');
}

/**
 * Reusable Article HTML Renderer
 * Renders sanitized, beautifully formatted article HTML elements.
 * Can be reused anywhere: Article Preview, Published Article View, Embeds, etc.
 */
export const ArticleHtmlRenderer: React.FC<ArticleHtmlRendererProps> = ({
  html,
  className = '',
}) => {
  const sanitizedContent = useMemo(() => {
    return sanitizeArticleHtml(html);
  }, [html]);

  if (!sanitizedContent) {
    return null;
  }

  return (
    <div
      className={`article-html-body ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

export default ArticleHtmlRenderer;
