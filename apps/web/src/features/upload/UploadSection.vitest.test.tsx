import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadSection } from './UploadSection';
import { lookupImportByHash, parseEnexFile, type ParseEnexResponse } from '../../api/enex';
import { computeFileSha256 } from '../../lib/hashFile';
import { useEnexUpload } from '../../state/useEnexUpload';
import { createDeferred } from '../../test-utils/deferred';

vi.mock('../../api/enex', () => ({
  parseEnexFile: vi.fn(),
  lookupImportByHash: vi.fn()
}));

vi.mock('../../lib/hashFile', () => ({
  computeFileSha256: vi.fn()
}));

const mockedParseEnexFile = vi.mocked(parseEnexFile);
const mockedLookupImportByHash = vi.mocked(lookupImportByHash);
const mockedComputeFileSha256 = vi.mocked(computeFileSha256);

const UploadSectionHarness = () => {
  const upload = useEnexUpload();
  return <UploadSection {...upload} />;
};

describe('UploadSection', () => {
  beforeEach(() => {
    mockedParseEnexFile.mockReset();
    mockedLookupImportByHash.mockReset();
    mockedComputeFileSha256.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the initial idle state', () => {
    render(<UploadSectionHarness />);

    expect(screen.getByText('Ready to upload.')).toBeInTheDocument();
  });

  it('shows hash progress and lookup result before upload', async () => {
    const deferred = createDeferred<string>();
    mockedComputeFileSha256.mockImplementationOnce(async (_file, options) => {
      options?.onProgress?.(0.4);
      return deferred.promise;
    });
    mockedLookupImportByHash.mockResolvedValueOnce({
      hash: 'a'.repeat(64),
      importId: null,
      shouldUpload: true,
      message: 'No import found for the hash. Continue with POST /api/enex/parse.'
    });
    mockedParseEnexFile.mockResolvedValueOnce({
      importId: 'import-2',
      noteCount: 3,
      warnings: ['missing resource']
    });

    render(<UploadSectionHarness />);

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);

    expect(await screen.findByText('Calculating SHA-256 hash...')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();

    deferred.resolve('a'.repeat(64));

    await screen.findByText('No existing import was found. You can upload this file.');
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Upload complete.')).toBeInTheDocument();
    expect(screen.getByText('import-2')).toBeInTheDocument();
    expect(screen.getByText('Notes detected: 3')).toBeInTheDocument();
  });

  it('skips upload when hash lookup returns shouldUpload=false', async () => {
    mockedComputeFileSha256.mockResolvedValueOnce('b'.repeat(64));
    mockedLookupImportByHash.mockResolvedValueOnce({
      hash: 'b'.repeat(64),
      importId: 'import-existing',
      shouldUpload: false,
      message: 'Existing import found. You can skip upload and reuse the importId.'
    });

    render(<UploadSectionHarness />);

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);

    expect(await screen.findByText('Existing import can be reused:')).toBeInTheDocument();
    expect(screen.getByText('import-existing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(mockedParseEnexFile).not.toHaveBeenCalled();
  });

  it('supports retry when hash lookup fails', async () => {
    mockedComputeFileSha256.mockResolvedValue('c'.repeat(64));
    mockedLookupImportByHash
      .mockRejectedValueOnce(new Error('lookup failed'))
      .mockResolvedValueOnce({
        hash: 'c'.repeat(64),
        importId: null,
        shouldUpload: true,
        message: 'No import found for the hash. Continue with POST /api/enex/parse.'
      });

    render(<UploadSectionHarness />);

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);

    expect(await screen.findByText('Error: lookup failed')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry hash lookup' }));

    await waitFor(() => {
      expect(screen.getByText('No existing import was found. You can upload this file.')).toBeInTheDocument();
    });
  });

  it('shows uploading state while parse request is pending', async () => {
    mockedComputeFileSha256.mockResolvedValueOnce('d'.repeat(64));
    mockedLookupImportByHash.mockResolvedValueOnce({
      hash: 'd'.repeat(64),
      importId: null,
      shouldUpload: true,
      message: 'No import found for the hash. Continue with POST /api/enex/parse.'
    });

    const deferred = createDeferred<ParseEnexResponse>();
    mockedParseEnexFile.mockReturnValueOnce(deferred.promise);

    render(<UploadSectionHarness />);

    const file = new File(['data'], 'notes.enex', { type: 'text/xml' });
    await userEvent.upload(screen.getByLabelText('ENEX file'), file);
    await screen.findByText('No existing import was found. You can upload this file.');

    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Uploading ENEX file...')).toBeInTheDocument();

    deferred.resolve({ importId: 'import-1', noteCount: 1, warnings: [] });
    await deferred.promise;
  });
});
