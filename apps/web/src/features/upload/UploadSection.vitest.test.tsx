import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadSection } from './UploadSection';
import { parseEnexFile, type ParseEnexResponse } from '../../api/enex';
import { useEnexUpload } from '../../state/useEnexUpload';
import { createDeferred } from '../../test-utils/deferred';

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

  it('resets the success state when a new file is selected', async () => {
    mockedParseEnexFile.mockResolvedValueOnce({
      importId: 'import-3',
      noteCount: 1,
      warnings: []
    });

    render(<UploadSectionHarness />);

    const input = screen.getByLabelText('ENEX file');
    await userEvent.upload(input, new File(['data'], 'notes.enex', { type: 'text/xml' }));
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Upload complete.')).toBeInTheDocument();

    await userEvent.upload(
      input,
      new File(['data'], 'notes-2.enex', { type: 'text/xml' })
    );

    expect(screen.queryByText('Upload complete.')).not.toBeInTheDocument();
    expect(screen.getByText('Ready to upload.')).toBeInTheDocument();
  });

  it('resets the error state when a new file is selected', async () => {
    mockedParseEnexFile.mockRejectedValueOnce(new Error('Invalid file'));

    render(<UploadSectionHarness />);

    const input = screen.getByLabelText('ENEX file');
    await userEvent.upload(input, new File(['data'], 'notes.enex', { type: 'text/xml' }));
    await userEvent.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText('Error: Invalid file')).toBeInTheDocument();

    await userEvent.upload(
      input,
      new File(['data'], 'notes-2.enex', { type: 'text/xml' })
    );

    expect(screen.queryByText('Error: Invalid file')).not.toBeInTheDocument();
    expect(screen.getByText('Ready to upload.')).toBeInTheDocument();
  });
});
