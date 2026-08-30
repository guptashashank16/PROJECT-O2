import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppStateProvider } from './context/AppStateContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
