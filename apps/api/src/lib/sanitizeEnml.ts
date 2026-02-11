import sanitizeHtml from 'sanitize-html';

const xmlPreamblePattern = /<\?xml[\s\S]*?\?>/gi;
const doctypePattern = /<!DOCTYPE[\s\S]*?>/gi;

const allowedTags = [
  'en-note',
  'en-todo',
  'en-media',
  'p',
  'div',
  'span',
  'br',
  'a',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
  'hr',
  'blockquote',
  'pre',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6'
];

const allowedAttributes: Record<string, string[]> = {
  a: ['href', 'name', 'target', 'rel', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  'en-media': ['hash', 'type', 'width', 'height', 'alt'],
  'en-todo': ['checked']
};

export const sanitizeEnml = (raw: string): string => {
  const normalized = raw.replace(xmlPreamblePattern, '').replace(doctypePattern, '');
  return sanitizeHtml(normalized, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false
  });
};
