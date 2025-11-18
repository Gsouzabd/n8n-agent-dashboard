import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts URLs and markdown links in text to clickable links
 * Excludes audio URLs (voice-messages or audio file extensions)
 * Only processes direct https URLs to avoid duplicates with markdown links
 */
export function linkifyText(text: string): React.ReactNode {
  // Check if it's an audio URL (should not be linkified)
  const isAudioUrl = (url: string): boolean => {
    return url.includes('voice-messages') || /\.(webm|mp3|wav|ogg|m4a)(\?|$)/i.test(url)
  }

  const parts: React.ReactNode[] = []
  let keyCounter = 0
  let lastIndex = 0

  // Find all markdown links [text](url) first
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g
  const matches: Array<{ type: 'markdown' | 'url'; start: number; end: number; text?: string; url: string }> = []

  // Find markdown links
  let match
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    matches.push({
      type: 'markdown',
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      url: match[2],
    })
  }

  // Find direct https URLs only (not http, to avoid duplicates)
  // Improved regex to avoid capturing trailing punctuation
  const urlRegex = /(https:\/\/[^\s\)]+)/g
  while ((match = urlRegex.exec(text)) !== null) {
    const urlStart = match.index
    let urlEnd = urlStart + match[0].length
    
    // Remove trailing punctuation from URL (except if it's part of the URL like .com)
    let url = match[0]
    // Remove trailing punctuation: ), ., ,, ;, :, !, ?
    url = url.replace(/[.,;:!?\)]+$/, '')
    urlEnd = urlStart + url.length
    
    // Check if this URL is inside a markdown link
    const isInsideMarkdown = matches.some(m => 
      m.type === 'markdown' && urlStart >= m.start && urlEnd <= m.end
    )
    
    if (!isInsideMarkdown && !isAudioUrl(url)) {
      matches.push({
        type: 'url',
        start: urlStart,
        end: urlEnd,
        url: url,
      })
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start)

  // Build result
  for (const match of matches) {
    // Add text before the match
    if (match.start > lastIndex) {
      parts.push(text.substring(lastIndex, match.start))
    }

    // Add the link
    if (!isAudioUrl(match.url)) {
      const linkText = match.type === 'markdown' ? match.text! : match.url
      parts.push(
        React.createElement(
          'a',
          {
            key: `link-${keyCounter++}`,
            href: match.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'text-blue-400 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300 underline break-all mx-0.5',
          },
          linkText
        )
      )
    } else {
      // Keep audio URL as plain text
      parts.push(match.type === 'markdown' ? `[${match.text}](${match.url})` : match.url)
    }

    lastIndex = match.end
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  // If no links found, return text as is
  if (parts.length === 0 || (parts.length === 1 && typeof parts[0] === 'string' && parts[0] === text)) {
    return text
  }

  // Return fragment with all parts
  return React.createElement(React.Fragment, {}, ...parts)
}

