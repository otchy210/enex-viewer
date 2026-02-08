import { randomUUID } from 'crypto';

export type EnexParseResult = {
  importId: string;
  noteCount: number;
  warnings: string[];
};

export class EnexParseError extends Error {
  readonly code: string;

  constructor(message: string) {
    super(message);
    this.code = 'ENEX_PARSE_FAILED';
  }
}

export const parseEnexFile = (payload: { data: Buffer }): EnexParseResult => {
  const content = payload.data.toString('utf-8');
  if (!content.includes('<en-export')) {
    throw new EnexParseError('Failed to parse ENEX content.');
  }

  return {
    importId: randomUUID(),
    noteCount: 0,
    warnings: []
  };
};
