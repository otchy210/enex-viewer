import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotesListSection } from './NotesListSection';

const baseProps = {
  importId: 'import-1',
  searchInput: '',
  query: '',
  limit: 20,
  offset: 0,
  loading: false,
  error: null,
  data: {
    total: 1,
    notes: [
      {
        id: 'note-1',
        title: 'Sample Note',
        excerpt: 'Hello world',
        tags: ['work'],
        createdAt: null,
        updatedAt: '2024-01-02T03:04:05'
      }
    ]
  },
  selectedCount: 0,
  selectedInPageCount: 0,
  bulkDownloading: false,
  bulkError: null,
  onSearchInputChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  onClear: vi.fn(),
  onLimitChange: vi.fn(),
  onOffsetChange: vi.fn(),
  onToggleSelectAllInPage: vi.fn(),
  onDownloadSelected: vi.fn()
};

describe('NotesListSection', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders prompt when import ID is not available', () => {
    render(<NotesListSection {...baseProps} importId={null} data={null} />);

    expect(screen.getByText('Upload an ENEX file to view notes.')).toBeInTheDocument();
  });

  it('renders summary and handles search interactions', async () => {
    render(<NotesListSection {...baseProps} searchInput="meeting" />);

    expect(screen.getByText('Showing 1-1 of 1 notes.')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search title or content'), ' notes');
    expect(baseProps.onSearchInputChange).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(baseProps.onSearchSubmit).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(baseProps.onClear).toHaveBeenCalledTimes(1);

    await userEvent.selectOptions(screen.getByLabelText('Per page'), '50');
    expect(baseProps.onLimitChange).toHaveBeenCalledWith(50);
  });

  it('shows error feedback and pagination actions', async () => {
    render(
      <NotesListSection
        {...baseProps}
        error="Network error"
        limit={50}
        data={{
          total: 120,
          notes: [
            {
              id: 'note-1',
              title: 'Sample Note',
              excerpt: 'Hello world',
              tags: ['work'],
              createdAt: null,
              updatedAt: '2024-01-02T03:04:05'
            }
          ]
        }}
      />
    );

    expect(screen.getByText('Error: Network error')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(baseProps.onOffsetChange).toHaveBeenCalledWith(50);
  });

  it('handles bulk action controls', async () => {
    render(
      <NotesListSection
        {...baseProps}
        selectedCount={2}
        selectedInPageCount={1}
        bulkError="Bulk download failed"
      />
    );

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Bulk download failed');

    await userEvent.click(screen.getByRole('button', { name: 'Unselect all in page' }));
    expect(baseProps.onToggleSelectAllInPage).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Download selected attachments' }));
    expect(baseProps.onDownloadSelected).toHaveBeenCalledTimes(1);
  });
});
