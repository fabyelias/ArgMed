import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';

// Service Worker Registration - TEMPORARILY DISABLED TO FIX CACHE ISSUES
// Will be re-enabled after deployment verification
if ('serviceWorker' in navigator) {
  // Unregister any existing service workers
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log('SW unregistered:', registration);
    }
  });
}

// Request Notification Permission early
if ('Notification' in window) {
  Notification.requestPermission();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);