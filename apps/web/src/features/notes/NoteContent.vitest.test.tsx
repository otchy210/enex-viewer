import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoteContent } from './NoteContent';

describe('NoteContent', () => {
  it('renders sanitized html content as markup', () => {
    const { container } = render(<NoteContent html="<p><strong>Safe content</strong></p>" />);

    expect(screen.getByText('Safe content')).toBeInTheDocument();
    expect(container.querySelector('.note-content strong')).not.toBeNull();
  });

  it('renders an empty container when html is empty', () => {
    const { container } = render(<NoteContent html="" />);

    expect(container.querySelector('.note-content')).toBeInTheDocument();
    expect(container.querySelector('.note-content')?.innerHTML).toBe('');
  });
});
