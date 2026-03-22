import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(6,13,21,0.97)',
              color: '#fff',
              border: '1px solid rgba(0,229,255,0.2)',
              backdropFilter: 'blur(20px)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              maxWidth: '380px',
            },
            success: { iconTheme: { primary: '#00e676', secondary: '#020408' } },
            error:   { iconTheme: { primary: '#ff4d6d', secondary: '#020408' }, duration: 5000 },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
