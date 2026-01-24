// Traffic tracking - track page visits
(function() {
  'use strict';
  
  // Only track on public pages (not admin)
  if (window.location.pathname.includes('admin.html') || 
      window.location.pathname.includes('login.html')) {
    return;
  }

  // Track page view
  async function trackPageView() {
    try {
      const api = await import('./api.js');
      const path = window.location.pathname + window.location.search;
      const referrer = document.referrer || '';
      await api.trackVisit(path, referrer);
    } catch (error) {
      // Silently fail
    }
  }

  // Track on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }
})();
