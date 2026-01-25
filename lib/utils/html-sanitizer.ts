/**
 * HTML Sanitization Utilities
 * 
 * Provides safe HTML sanitization to prevent XSS attacks
 * when rendering user-generated or untrusted content
 */

/**
 * Escapes HTML special characters to prevent XSS
 * Use this for plain text that should be displayed as-is
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  // Safe: char is from the regex match against known characters, not user input
  // eslint-disable-next-line security/detect-object-injection
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitizes HTML content for safe rendering
 * Removes dangerous tags and attributes while preserving safe formatting
 * 
 * For rich text, consider using DOMPurify instead
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:text\/html/gi, ''); // Remove data URIs
  
  // Allow only safe tags for basic formatting
  const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'span'];
  // Safe: allowedTags is a constant array, not user input
  // eslint-disable-next-line security/detect-non-literal-regexp
  const tagPattern = new RegExp(`<(?!\/?(?:${allowedTags.join('|')})\\b)[^>]+>`, 'gi');
  sanitized = sanitized.replace(tagPattern, '');
  
  return sanitized;
}

/**
 * Converts markdown-like syntax to safe HTML
 * Only supports basic formatting: **bold**, *italic*, newlines
 */
export function markdownToSafeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  // First escape HTML to prevent XSS
  let safe = escapeHtml(text);
  
  // Then apply markdown-like formatting
  safe = safe
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
  
  return safe;
}

/**
 * Highlights search terms in text safely
 * Returns escaped HTML with highlighted terms wrapped in <mark> tags
 */
export function highlightSearchTerms(
  text: string,
  query: string,
  maxLength: number = 200
): string {
  if (!text || !query) {
    return escapeHtml(text?.slice(0, maxLength) || '');
  }
  
  // Escape the text first
  const escaped = escapeHtml(text);
  
  // Escape the query terms
  const escapedQuery = escapeHtml(query);
  const queryTerms = escapedQuery.split(/\s+/).filter(t => t.length > 2);
  
  // Find and highlight terms (case-insensitive)
  let highlighted = escaped;
  for (const term of queryTerms) {
    // Safe: term is escaped before use in regex
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>');
  }
  
  // Truncate if needed
  if (highlighted.length > maxLength) {
    highlighted = highlighted.slice(0, maxLength) + '...';
  }
  
  return highlighted;
}

/**
 * Sanitizes snippet text from document search results
 * Extracted text from PDFs could contain HTML-like content
 */
export function sanitizeSnippet(snippet: string | null | undefined): string {
  if (!snippet) return '';
  
  // Escape HTML first
  let safe = escapeHtml(snippet);
  
  // Optionally highlight search terms if needed
  // (This would require passing the query separately)
  
  return safe;
}
