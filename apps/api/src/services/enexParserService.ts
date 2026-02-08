export type EnexParseWarning = {
  noteTitle?: string;
  message: string;
};

export type ParsedResourceMeta = {
  id: string;
  fileName?: string;
  mime?: string;
  size?: number;
};

export type ParsedNote = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  content: string;
  resources: ParsedResourceMeta[];
};

export type EnexParseError = {
  code: "INVALID_XML" | "INVALID_ENEX";
  message: string;
  details?: unknown;
};

export type EnexParseSuccess = {
  ok: true;
  notes: ParsedNote[];
  warnings: EnexParseWarning[];
};

export type EnexParseFailure = {
  ok: false;
  error: EnexParseError;
  warnings: EnexParseWarning[];
};

export type EnexParseResult = EnexParseSuccess | EnexParseFailure;

const matchAll = (input: string, pattern: RegExp): string[] => {
  const matches: string[] = [];
  let match = pattern.exec(input);
  while (match) {
    matches.push(match[1] ?? "");
    match = pattern.exec(input);
  }
  return matches;
};

const extractTag = (input: string, tag: string): string => {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = input.match(pattern);
  if (!match) {
    return "";
  }
  return stripCdata(match[1]?.trim() ?? "");
};

const stripCdata = (value: string): string => {
  const cdataMatch = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i);
  if (cdataMatch) {
    return cdataMatch[1] ?? "";
  }
  return value;
};

const extractResourceSize = (data: string): number | undefined => {
  if (!data) {
    return undefined;
  }
  return Math.floor((data.length * 3) / 4);
};

const countOccurrences = (input: string, needle: string): number => {
  let count = 0;
  let index = input.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = input.indexOf(needle, index + needle.length);
  }
  return count;
};

export const parseEnex = (input: string | Buffer): EnexParseResult => {
  const warnings: EnexParseWarning[] = [];
  const xml = Buffer.isBuffer(input) ? input.toString("utf-8") : input;

  if (!xml.includes("<en-export")) {
    return {
      ok: false,
      error: {
        code: "INVALID_ENEX",
        message: "Missing <en-export> root element.",
      },
      warnings,
    };
  }

  if (!xml.includes("</en-export>")) {
    return {
      ok: false,
      error: {
        code: "INVALID_XML",
        message: "Missing closing </en-export> tag.",
      },
      warnings,
    };
  }

  if (countOccurrences(xml, "<note") !== countOccurrences(xml, "</note>")) {
    return {
      ok: false,
      error: {
        code: "INVALID_XML",
        message: "Mismatched <note> tags.",
      },
      warnings,
    };
  }

  const noteBlocks = matchAll(xml, /<note[^>]*>([\s\S]*?)<\/note>/gi);
  const parsedNotes: ParsedNote[] = [];

  noteBlocks.forEach((note, noteIndex) => {
    const title = extractTag(note, "title").trim();
    const content = extractTag(note, "content");

    if (!title || !content) {
      warnings.push({
        noteTitle: title || undefined,
        message: "Skipped note due to missing title or content.",
      });
      return;
    }

    const tags = matchAll(note, /<tag[^>]*>([\s\S]*?)<\/tag>/gi)
      .map((tag) => stripCdata(tag).trim())
      .filter(Boolean);

    const resourceBlocks = matchAll(note, /<resource[^>]*>([\s\S]*?)<\/resource>/gi);
    const resources = resourceBlocks.map((resource, resourceIndex) => {
      const mime = extractTag(resource, "mime").trim() || undefined;
      const attributes = extractTag(resource, "resource-attributes");
      const fileName = extractTag(attributes, "file-name").trim() || undefined;
      const data = extractTag(resource, "data");

      return {
        id: `resource-${noteIndex + 1}-${resourceIndex + 1}`,
        fileName,
        mime,
        size: extractResourceSize(data),
      } satisfies ParsedResourceMeta;
    });

    parsedNotes.push({
      id: extractTag(note, "guid").trim() || `note-${noteIndex + 1}`,
      title,
      createdAt: extractTag(note, "created").trim() || undefined,
      updatedAt: extractTag(note, "updated").trim() || undefined,
      tags,
      content,
      resources,
    });
  });

  return {
    ok: true,
    notes: parsedNotes,
    warnings,
  };
};
