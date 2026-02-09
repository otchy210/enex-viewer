import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('./pages/HomePage', () => ({
  HomePage: () => <div data-testid="home-page">Home Page</div>
}));

describe('App', () => {
  it('renders the home page', () => {
    render(<App />);

    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });
});
