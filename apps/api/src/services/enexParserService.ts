import { XMLParser, XMLValidator } from "fast-xml-parser";

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

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: false,
  cdataPropName: "__cdata",
});

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const extractCdataString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const cdata = (value as { __cdata?: unknown }).__cdata;
    if (typeof cdata === "string") {
      return cdata;
    }
  }
  return "";
};

const extractResourceSize = (data: unknown): number | undefined => {
  const raw = extractCdataString(data);
  if (!raw) {
    return undefined;
  }
  return Math.floor((raw.length * 3) / 4);
};

export const parseEnex = (input: string | Buffer): EnexParseResult => {
  const warnings: EnexParseWarning[] = [];
  const xml = Buffer.isBuffer(input) ? input.toString("utf-8") : input;

  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    return {
      ok: false,
      error: {
        code: "INVALID_XML",
        message: "Failed to parse XML.",
        details: validation,
      },
      warnings,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "INVALID_XML",
        message: "Failed to parse XML.",
        details: error,
      },
      warnings,
    };
  }

  const rootValue = parsed["en-export"];
  if (rootValue === undefined || rootValue === null) {
    return {
      ok: false,
      error: {
        code: "INVALID_ENEX",
        message: "Missing <en-export> root element.",
      },
      warnings,
    };
  }

  const root = typeof rootValue === "object" ? (rootValue as Record<string, unknown>) : {};
  const notes = toArray(root.note as Record<string, unknown> | Record<string, unknown>[]);
  const parsedNotes: ParsedNote[] = [];

  notes.forEach((note, noteIndex) => {
    const title = typeof note.title === "string" ? note.title.trim() : "";
    const content = extractCdataString(note.content);

    if (!title || !content) {
      warnings.push({
        noteTitle: title || undefined,
        message: "Skipped note due to missing title or content.",
      });
      return;
    }

    const tags = toArray(note.tag as string | string[]).filter(
      (tag): tag is string => typeof tag === "string",
    );

    const resources = toArray(note.resource as Record<string, unknown> | Record<string, unknown>[]).map(
      (resource, resourceIndex) => {
        const attributes = resource["resource-attributes"] as Record<string, unknown> | undefined;
        const fileName =
          typeof attributes?.["file-name"] === "string" ? attributes["file-name"] : undefined;
        const mime = typeof resource.mime === "string" ? resource.mime : undefined;
        const size = extractResourceSize(resource.data);

        return {
          id: `resource-${noteIndex + 1}-${resourceIndex + 1}`,
          fileName,
          mime,
          size,
        } satisfies ParsedResourceMeta;
      },
    );

    parsedNotes.push({
      id: typeof note.guid === "string" ? note.guid : `note-${noteIndex + 1}`,
      title,
      createdAt: typeof note.created === "string" ? note.created : undefined,
      updatedAt: typeof note.updated === "string" ? note.updated : undefined,
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
