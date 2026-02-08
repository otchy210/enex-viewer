export type MultipartFile = {
  fieldName: string;
  fileName?: string;
  contentType?: string;
  data: Buffer;
};

export class MultipartParseError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const getBoundary = (contentTypeHeader?: string) => {
  if (!contentTypeHeader) {
    return undefined;
  }

  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentTypeHeader);
  return match?.[1] ?? match?.[2];
};

export const parseMultipartSingleFile = (
  body: Buffer,
  contentTypeHeader: string | undefined,
  fieldName = 'file'
): MultipartFile => {
  const boundaryValue = getBoundary(contentTypeHeader);
  if (!boundaryValue) {
    throw new MultipartParseError(
      'INVALID_MULTIPART',
      'Content-Type must be multipart/form-data with boundary.'
    );
  }

  const boundary = `--${boundaryValue}`;
  const parts = body.toString('latin1').split(boundary);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed === '--') {
      continue;
    }

    const [rawHeaders, ...rest] = part.split('\r\n\r\n');
    if (!rawHeaders || rest.length === 0) {
      continue;
    }

    const dispositionMatch =
      /content-disposition:.*;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(
        rawHeaders
      );
    if (!dispositionMatch) {
      continue;
    }

    if (dispositionMatch[1] !== fieldName) {
      continue;
    }

    const contentTypeMatch = /content-type:\s*([^\r\n]+)/i.exec(rawHeaders);
    let fileContent = rest.join('\r\n\r\n');
    if (fileContent.endsWith('\r\n')) {
      fileContent = fileContent.slice(0, -2);
    }

    return {
      fieldName,
      fileName: dispositionMatch[2],
      contentType: contentTypeMatch?.[1],
      data: Buffer.from(fileContent, 'latin1')
    };
  }

  throw new MultipartParseError('MISSING_FILE', 'file is required.');
};
