import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import './styles.css';

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement as Element);

if (rootElement == null) {
  throw new Error('Root element not found');
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
