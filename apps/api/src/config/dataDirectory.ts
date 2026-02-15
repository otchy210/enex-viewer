import { homedir } from 'os';
import path from 'path';

const DEFAULT_DATA_DIRECTORY_NAME = 'enex-viewer-data';

export const resolveDataDirectory = (): string => {
  const configured = process.env.ENEX_VIEWER_DATA;
  if (configured !== undefined && configured.trim().length > 0) {
    return path.resolve(configured);
  }

  return path.join(homedir(), DEFAULT_DATA_DIRECTORY_NAME);
};

export const resolveSqlitePath = (): string =>
  path.join(resolveDataDirectory(), 'enex-viewer.sqlite');

