import { afterEach, describe, expect, it, vi } from 'vitest';

describe('main entrypoint', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unmock('react-dom/client');
    vi.unmock('./App');
    document.body.innerHTML = '';
  });

  it('creates a root and renders the app', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    const renderMock = vi.fn();
    const createRootMock = vi.fn(() => ({ render: renderMock }));

    vi.doMock('react-dom/client', () => ({
      default: {
        createRoot: createRootMock
      }
    }));

    vi.doMock('./App', () => ({
      App: () => <div data-testid="app">App</div>
    }));

    await import('./main');

    expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the root element is missing', async () => {
    document.body.innerHTML = '';

    const createRootMock = vi.fn();

    vi.doMock('react-dom/client', () => ({
      default: {
        createRoot: createRootMock
      }
    }));

    vi.doMock('./App', () => ({
      App: () => <div data-testid="app">App</div>
    }));

    await expect(import('./main')).rejects.toThrow();
    expect(createRootMock).not.toHaveBeenCalled();
  });
});
