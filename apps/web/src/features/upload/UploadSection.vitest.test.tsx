import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadSection } from './UploadSection';
import { parseEnexFile, type ParseEnexResponse } from '../../api/enex';
import { useEnexUpload } from '../../state/useEnexUpload';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

vi.mock('../../api/enex', () => ({
  parseEnexFile: vi.fn()
}));

const mockedParseEnexFile = vi.mocked(parseEnexFile);

const UploadSectionHarness = () => {
  const upload = useEnexUpload();
  return <UploadSection {...upload} />;
};

describe('UploadSection', () => {
  beforeEach(() => {
    mockedParseEnexFile.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the initial idle state', () => {
    render(<UploadSectionHarness />);

    expect(screen.getByText('Ready to upload.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('shows uploading state while the request is pending', async () => {
    const deferred = createDeferred<ParseEnexResponse>();
    mockedParseEnexFile.mockReturnValueOnce(deferred.promise);

    render(<UploadSectionHarness />);

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });
    const input = screen.getByLabelText('ENEX file');
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Uploading ENEX file...')).toBeInTheDocument();

    deferred.resolve({ importId: 'import-1', noteCount: 1, warnings: [] });
    await deferred.promise;
  });

  it('shows success details after upload succeeds', async () => {
    mockedParseEnexFile.mockResolvedValueOnce({
      importId: 'import-2',
      noteCount: 3,
      warnings: ['missing resource']
    });

    render(<UploadSectionHarness />);

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Upload complete.')).toBeInTheDocument();
    expect(screen.getByText('Import ID:')).toBeInTheDocument();
    expect(screen.getByText('import-2')).toBeInTheDocument();
    expect(screen.getByText('Notes detected: 3')).toBeInTheDocument();
    expect(screen.getByText('Warnings: 1')).toBeInTheDocument();
  });

  it('shows error details when upload fails', async () => {
    mockedParseEnexFile.mockRejectedValueOnce(new Error('Invalid file'));

    render(<UploadSectionHarness />);

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Error: Invalid file')).toBeInTheDocument();
  });
});
