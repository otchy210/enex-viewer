import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotesListSection } from './NotesListSection';

const baseProps = {
  importId: 'import-1',
  searchInput: '',
  query: '',
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
        updatedAt: '2024-01-02T00:00:00Z'
      }
    ]
  },
  onSearchInputChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  onClear: vi.fn(),
  onOffsetChange: vi.fn()
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

  it('renders notes and handles search interactions', async () => {
    render(<NotesListSection {...baseProps} searchInput="meeting" />);

    expect(screen.getByText('Sample Note')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search title or content'), ' notes');
    expect(baseProps.onSearchInputChange).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(baseProps.onSearchSubmit).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(baseProps.onClear).toHaveBeenCalledTimes(1);
  });

  it('shows error feedback and pagination actions', async () => {
    render(
      <NotesListSection
        {...baseProps}
        error="Network error"
        data={{
          total: 25,
          notes: [
            {
              id: 'note-1',
              title: 'Sample Note',
              excerpt: 'Hello world',
              tags: ['work'],
              createdAt: null,
              updatedAt: '2024-01-02T00:00:00Z'
            }
          ]
        }}
      />
    );

    expect(screen.getByText('Error: Network error')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(baseProps.onOffsetChange).toHaveBeenCalledWith(20);
  });
});
