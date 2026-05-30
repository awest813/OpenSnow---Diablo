import React from 'react';
import { createRoot } from 'react-dom/client';
import './reset.css';
import * as serviceWorker from './serviceWorker';

import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Capture the beforeinstallprompt event early so we can surface a custom
// install button at a contextually appropriate moment instead of letting the
// browser decide when to show the native prompt.
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  // Store the deferred prompt and notify the app.
  window.__pwaInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('pwaInstallReady'));
});

// Track whether the app has been installed from the browser prompt.
window.addEventListener('appinstalled', () => {
  window.__pwaInstallPrompt = null;
  window.dispatchEvent(new CustomEvent('pwaInstalled'));
});

serviceWorker.register({
  onUpdate(registration) {
    // Store the registration so App.js can send SKIP_WAITING before reloading.
    window.__swRegistration = registration;
    window.dispatchEvent(new CustomEvent('swUpdate'));
  },
  onSuccess() {
    // App shell cached for the first time — it can now run offline.
    window.dispatchEvent(new CustomEvent('swOfflineReady'));
  },
});
