/**
 * Markdown to HTML conversion utilities for TipTap editor
 * 
 * TipTap expects HTML content, but we store markdown in the database.
 * This utility provides conversion functions.
 */

/**
 * Simple markdown to HTML converter for basic markdown syntax
 * This handles the most common markdown patterns used in our app
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ''
  
  // Don't convert if it already looks like HTML
  if (markdown.includes('<') && markdown.includes('>')) {
    return markdown
  }
  
  let html = markdown
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.*?)_/g, '<em>$1</em>')
  
  // Code (inline)
  html = html.replace(/`(.*?)`/g, '<code>$1</code>')
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  
  // Line breaks - Convert \n to <br> but be smart about it
  // Don't add <br> after headings or other block elements
  html = html.replace(/(?<!>)\n(?!<)/g, '<br>')
  
  // Paragraphs - wrap text that's not already in tags
  const lines = html.split('<br>')
  const wrappedLines = lines.map(line => {
    const trimmedLine = line.trim()
    // Don't wrap if it's already a block element or empty
    if (!trimmedLine || 
        trimmedLine.startsWith('<h') || 
        trimmedLine.startsWith('<p') ||
        trimmedLine.startsWith('<div') ||
        trimmedLine.startsWith('<pre') ||
        trimmedLine.startsWith('<ul') ||
        trimmedLine.startsWith('<ol') ||
        trimmedLine.startsWith('<li')) {
      return trimmedLine
    }
    // Wrap in paragraph
    return trimmedLine ? `<p>${trimmedLine}</p>` : ''
  })
  
  html = wrappedLines.filter(Boolean).join('')
  
  // Clean up any double <br> tags that might have been created
  html = html.replace(/<br><br>/g, '<br>')
  html = html.replace(/<br>$/, '') // Remove trailing <br>
  
  return html
}

/**
 * Check if content is already HTML
 */
export function isHtmlContent(content: string): boolean {
  return content.includes('<') && content.includes('>')
}

/**
 * Convert HTML back to markdown (basic implementation)
 * Used when we need to store content as markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  
  // Don't convert if it already looks like markdown
  if (!isHtmlContent(html)) {
    return html
  }
  
  let markdown = html
  
  // Remove HTML tags and convert to markdown
  markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, '# $1')
  markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, '## $1')
  markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, '### $1')
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**')
  markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*')
  markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`')
  markdown = markdown.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```')
  markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n')
  markdown = markdown.replace(/<br\s*\/?>/g, '\n')
  
  // Clean up extra newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  markdown = markdown.trim()
  
  return markdown
} 