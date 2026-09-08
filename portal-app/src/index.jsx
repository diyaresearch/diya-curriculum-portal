import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
// The last-resort boundary (#378). The one inside App.jsx only covers the
// routed content; a throw in ToastProvider, AuthProvider, BrowserRouter or
// Layout itself happens above it and would still blank the page. This one
// cannot rely on anything the app provides - no router, no toasts - so its
// fallback is the plain default, whose "Go to home" is a real page load.
root.render(
  <React.StrictMode>
    <ErrorBoundary name="root">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://github.com/GoogleChrome/web-vitals
reportWebVitals();
