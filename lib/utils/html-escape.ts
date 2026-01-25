/**
 * HTML Escaping Utilities
 * Prevents XSS attacks in HTML email templates
 */

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape HTML but preserve line breaks
 */
export function escapeHtmlWithBreaks(str: string): string {
  return escapeHtml(str).replace(/\n/g, '<br>');
}
