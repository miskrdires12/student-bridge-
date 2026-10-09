import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import { initStore } from '@/lib/store';
import '@/styles/globals.css';

// Initialize data store (loads 3,723 students and 19 operators)
initStore().then(() => {
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});
