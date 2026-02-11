import { XMLParser, XMLValidator } from 'fast-xml-parser';

// NOTE: NodeNext ESM requires .js extension for runtime module resolution.
import { sanitizeEnml } from '../lib/sanitizeEnml.js';

export interface EnexParseWarning {
  noteTitle?: string;
  message: string;
}

export interface ParsedResourceMeta {
  id: string;
  fileName?: string;
  mime?: string;
  size?: number;
}

export interface ParsedNote {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  content: string;
  resources: ParsedResourceMeta[];
}

export interface EnexParseError {
  code: 'INVALID_XML' | 'INVALID_ENEX';
  message: string;
  details?: unknown;
}

export interface EnexParseSuccess {
  ok: true;
  notes: ParsedNote[];
  warnings: EnexParseWarning[];
}

export interface EnexParseFailure {
  ok: false;
  error: EnexParseError;
  warnings: EnexParseWarning[];
}

export type EnexParseResult = EnexParseSuccess | EnexParseFailure;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: false,
  cdataPropName: '__cdata'
});

const toArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === 'string' && value.length === 0) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const extractCdataString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    const cdata = (value as { __cdata?: unknown }).__cdata;
    if (typeof cdata === 'string') {
      return cdata;
    }
  }
  return '';
};

const decodeBase64Size = (raw: string): number | undefined => {
  const normalized = raw.replace(/\s+/g, '');
  if (normalized.length === 0) {
    return undefined;
  }

  const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Pattern.test(normalized)) {
    return undefined;
  }

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return (normalized.length / 4) * 3 - padding;
};

const extractResourceSize = (data: unknown): number | undefined => {
  if (typeof data === 'string') {
    return decodeBase64Size(data);
  }

  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const encodedData = data as { __cdata?: unknown; encoding?: unknown };
  const encoding =
    typeof encodedData.encoding === 'string' ? encodedData.encoding.toLowerCase() : undefined;
  if (encoding !== undefined && encoding !== 'base64') {
    return undefined;
  }

  return decodeBase64Size(extractCdataString(data));
};

export const parseEnex = (input: string | Buffer): EnexParseResult => {
  const warnings: EnexParseWarning[] = [];
  const xml = Buffer.isBuffer(input) ? input.toString('utf-8') : input;

  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    return {
      ok: false,
      error: {
        code: 'INVALID_XML',
        message: 'Failed to parse XML.',
        details: validation
      },
      warnings
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'INVALID_XML',
        message: 'Failed to parse XML.',
        details: error
      },
      warnings
    };
  }

  const rootValue = parsed['en-export'];
  if (rootValue === undefined || rootValue === null) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ENEX',
        message: 'Missing <en-export> root element.'
      },
      warnings
    };
  }

  const root = typeof rootValue === 'object' ? (rootValue as Record<string, unknown>) : {};
  const notes = toArray(root.note as Record<string, unknown> | Record<string, unknown>[]);
  const parsedNotes: ParsedNote[] = [];

  notes.forEach((note, noteIndex) => {
    const title = typeof note.title === 'string' ? note.title.trim() : '';
    const content = extractCdataString(note.content);

    if (title.length === 0 || content.length === 0) {
      warnings.push({
        noteTitle: title.length > 0 ? title : undefined,
        message: 'Skipped note due to missing title or content.'
      });
      return;
    }

    const tags = toArray(note.tag as string | string[]).filter(
      (tag): tag is string => typeof tag === 'string'
    );

    const resources = toArray(
      note.resource as Record<string, unknown> | Record<string, unknown>[]
    ).map((resource, resourceIndex) => {
      const attributes = resource['resource-attributes'] as Record<string, unknown> | undefined;
      const fileName =
        typeof attributes?.['file-name'] === 'string' ? attributes['file-name'] : undefined;
      const mime = typeof resource.mime === 'string' ? resource.mime : undefined;
      const size = extractResourceSize(resource.data);

      return {
        id: `resource-${String(noteIndex + 1)}-${String(resourceIndex + 1)}`,
        fileName,
        mime,
        size
      } satisfies ParsedResourceMeta;
    });

    parsedNotes.push({
      id: typeof note.guid === 'string' ? note.guid : `note-${String(noteIndex + 1)}`,
      title,
      createdAt: typeof note.created === 'string' ? note.created : undefined,
      updatedAt: typeof note.updated === 'string' ? note.updated : undefined,
      tags,
      content: sanitizeEnml(content),
      resources
    });
  });

  return {
    ok: true,
    notes: parsedNotes,
    warnings
  };
};
