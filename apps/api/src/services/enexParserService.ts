import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { openSync, readSync, closeSync } from 'fs';
import { StringDecoder } from 'string_decoder';

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
  data?: Buffer;
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

export interface EnexStreamParseSuccess {
  ok: true;
  noteCount: number;
  warnings: EnexParseWarning[];
}

export interface EnexParseFailure {
  ok: false;
  error: EnexParseError;
  warnings: EnexParseWarning[];
}

export type EnexParseResult = EnexParseSuccess | EnexParseFailure;
export type EnexStreamParseResult = EnexStreamParseSuccess | EnexParseFailure;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  trimValues: false,
  cdataPropName: '__cdata'
});

const INVALID_XML_MESSAGE =
  'The uploaded ENEX file is malformed XML. Please export the file again and retry.';

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

    const text = (value as { '#text'?: unknown })['#text'];
    if (typeof text === 'string') {
      return text;
    }
  }
  return '';
};

const decodeBase64Size = (raw: string): number | undefined => {
  const normalized = raw.replace(/\s+/g, '');
  if (normalized.length === 0) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(normalized, 'base64');
    if (decoded.length === 0) {
      return undefined;
    }

    return decoded.length;
  } catch {
    return undefined;
  }
};

const decodeBase64Buffer = (raw: string): Buffer | undefined => {
  const normalized = raw.replace(/\s+/g, '');
  if (normalized.length === 0) {
    return undefined;
  }

  try {
    const decoded = Buffer.from(normalized, 'base64');
    if (decoded.length === 0) {
      return undefined;
    }

    return decoded;
  } catch {
    return undefined;
  }
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

const extractResourceData = (data: unknown): Buffer | undefined => {
  if (typeof data === 'string') {
    return decodeBase64Buffer(data);
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

  return decodeBase64Buffer(extractCdataString(data));
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
        message: INVALID_XML_MESSAGE,
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
        message: INVALID_XML_MESSAGE,
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
      const data = extractResourceData(resource.data);

      return {
        id: `resource-${String(noteIndex + 1)}-${String(resourceIndex + 1)}`,
        fileName,
        mime,
        size,
        data
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

const parseSingleNote = (
  noteXml: string,
  noteIndex: number,
  warnings: EnexParseWarning[]
): ParsedNote | undefined => {
  let parsedNote: Record<string, unknown>;
  try {
    const parsed = parser.parse(noteXml) as Record<string, unknown>;
    const noteValue = parsed.note;
    parsedNote = typeof noteValue === 'object' && noteValue !== null ? (noteValue as Record<string, unknown>) : {};
  } catch (error) {
    throw error;
  }

  const title = typeof parsedNote.title === 'string' ? parsedNote.title.trim() : '';
  const content = extractCdataString(parsedNote.content);

  if (title.length === 0 || content.length === 0) {
    warnings.push({
      noteTitle: title.length > 0 ? title : undefined,
      message: 'Skipped note due to missing title or content.'
    });
    return undefined;
  }

  const tags = toArray(parsedNote.tag as string | string[]).filter(
    (tag): tag is string => typeof tag === 'string'
  );

  const resources = toArray(
    parsedNote.resource as Record<string, unknown> | Record<string, unknown>[]
  ).map((resource, resourceIndex) => {
    const attributes = resource['resource-attributes'] as Record<string, unknown> | undefined;
    const fileName =
      typeof attributes?.['file-name'] === 'string' ? attributes['file-name'] : undefined;
    const mime = typeof resource.mime === 'string' ? resource.mime : undefined;
    const size = extractResourceSize(resource.data);
    const data = extractResourceData(resource.data);

    return {
      id: `resource-${String(noteIndex)}-${String(resourceIndex + 1)}`,
      fileName,
      mime,
      size,
      data
    } satisfies ParsedResourceMeta;
  });

  return {
    id: typeof parsedNote.guid === 'string' ? parsedNote.guid : `note-${String(noteIndex)}`,
    title,
    createdAt: typeof parsedNote.created === 'string' ? parsedNote.created : undefined,
    updatedAt: typeof parsedNote.updated === 'string' ? parsedNote.updated : undefined,
    tags,
    content: sanitizeEnml(content),
    resources
  };
};

export const parseEnexFileByNote = (
  filePath: string,
  onNote: (note: ParsedNote) => void
): EnexStreamParseResult => {
  const warnings: EnexParseWarning[] = [];
  const fd = openSync(filePath, 'r');
  const decoder = new StringDecoder('utf8');
  const chunk = Buffer.alloc(1024 * 1024);
  const noteOpenTag = '<note>';
  const noteCloseTag = '</note>';
  let noteCounter = 0;
  let sawRoot = false;
  let buffer = '';

  try {
    while (true) {
      const bytesRead = readSync(fd, chunk, 0, chunk.length, null);
      if (bytesRead === 0) {
        break;
      }
      buffer += decoder.write(chunk.subarray(0, bytesRead));
      if (!sawRoot && buffer.includes('<en-export')) {
        sawRoot = true;
      }

      let openIndex = buffer.indexOf(noteOpenTag);
      while (openIndex !== -1) {
        const closeIndex = buffer.indexOf(noteCloseTag, openIndex);
        if (closeIndex === -1) {
          buffer = buffer.slice(openIndex);
          break;
        }

        const noteXml = buffer.slice(openIndex, closeIndex + noteCloseTag.length);
        noteCounter += 1;
        try {
          const note = parseSingleNote(noteXml, noteCounter, warnings);
          if (note !== undefined) {
            onNote(note);
          }
        } catch (error) {
          return {
            ok: false,
            error: {
              code: 'INVALID_XML',
              message: INVALID_XML_MESSAGE,
              details: error
            },
            warnings
          };
        }

        buffer = buffer.slice(closeIndex + noteCloseTag.length);
        openIndex = buffer.indexOf(noteOpenTag);
      }
    }

    buffer += decoder.end();
  } finally {
    closeSync(fd);
  }

  if (buffer.includes(noteOpenTag)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_XML',
        message: INVALID_XML_MESSAGE,
        details: 'Unclosed <note> element.'
      },
      warnings
    };
  }

  if (!sawRoot) {
    return {
      ok: false,
      error: {
        code: 'INVALID_ENEX',
        message: 'Missing <en-export> root element.'
      },
      warnings
    };
  }

  return {
    ok: true,
    noteCount: noteCounter,
    warnings
  };
};
