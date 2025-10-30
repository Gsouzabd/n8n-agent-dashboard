/**
 * Venturize AI Widget
 * Embeddable chat widget for external websites
 */
(function() {
  'use strict';

  // Get widget ID from script URL
  const currentScript = document.currentScript || document.querySelector('script[src*="widget.js"]');
  if (!currentScript) {
    console.error('Venturize Widget: Could not find script tag');
    return;
  }

  const scriptSrc = currentScript.src;
  const urlParams = new URLSearchParams(scriptSrc.split('?')[1]);
  const widgetId = urlParams.get('id');
  const sessionIdParam = urlParams.get('session_id');

  if (!widgetId) {
    console.error('Venturize Widget: No widget ID provided');
    return;
  }

  // Get base URL from script
  const baseUrl = scriptSrc.split('/widget.js')[0];

  // Create widget container
  const container = document.createElement('div');
  container.id = 'venturize-widget-' + widgetId;
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  `;

  // Create bubble button
  const bubble = document.createElement('button');
  bubble.style.cssText = `
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FF6B00, #FF8C00);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(255, 107, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    position: relative;
  `;
  bubble.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style="transition: transform 0.3s ease;">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  `;

  // Add hover effect
  bubble.addEventListener('mouseenter', function() {
    bubble.style.transform = 'scale(1.1)';
    bubble.style.boxShadow = '0 6px 25px rgba(255, 107, 0, 0.5)';
  });

  bubble.addEventListener('mouseleave', function() {
    bubble.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
    bubble.style.boxShadow = '0 4px 20px rgba(255, 107, 0, 0.4)';
  });

  // Create iframe
  const iframe = document.createElement('iframe');
  const iframeUrl = new URL(baseUrl + '/w/' + widgetId);
  iframeUrl.searchParams.set('embedded', 'true');
  if (sessionIdParam) {
    iframeUrl.searchParams.set('session_id', sessionIdParam);
  }
  iframe.src = iframeUrl.toString();
  iframe.style.cssText = `
    width: 400px;
    height: 600px;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 100px);
    border: none;
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    display: none;
    position: absolute;
    bottom: 80px;
    right: 0;
    background: white;
    transition: opacity 0.3s ease, transform 0.3s ease;
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  `;

  // Chat state
  let isOpen = false;

  // Toggle chat
  function toggleChat() {
    isOpen = !isOpen;
    
    if (isOpen) {
      iframe.style.display = 'block';
      setTimeout(function() {
        iframe.style.opacity = '1';
        iframe.style.transform = 'scale(1) translateY(0)';
      }, 10);
      bubble.style.transform = 'scale(0.9)';
      bubble.querySelector('svg').style.transform = 'rotate(180deg)';
      
      // Track open event
      trackEvent('open');
    } else {
      iframe.style.opacity = '0';
      iframe.style.transform = 'scale(0.95) translateY(10px)';
      setTimeout(function() {
        iframe.style.display = 'none';
      }, 300);
      bubble.style.transform = 'scale(1)';
      bubble.querySelector('svg').style.transform = 'rotate(0deg)';
      
      // Track close event
      trackEvent('close');
    }
  }

  bubble.addEventListener('click', toggleChat);

  // Close on ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) {
      toggleChat();
    }
  });

  // Append elements
  container.appendChild(bubble);
  container.appendChild(iframe);
  document.body.appendChild(container);

  // Track impression
  trackEvent('impression');

  // Analytics tracking
  function trackEvent(eventType) {
    try {
      fetch(baseUrl + '/api/widget-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          widgetId: widgetId,
          eventType: eventType,
          referrer: window.location.href,
          referrerDomain: window.location.hostname,
          userAgent: navigator.userAgent,
        }),
      }).catch(function(err) {
        console.warn('Venturize Widget: Analytics tracking failed', err);
      });
    } catch (err) {
      console.warn('Venturize Widget: Analytics tracking error', err);
    }
  }

  // Listen for messages from iframe (for future features)
  window.addEventListener('message', function(event) {
    if (event.origin !== baseUrl) return;
    
    const data = event.data;
    if (data.type === 'venturize-close') {
      toggleChat();
    } else if (data.type === 'venturize-track') {
      trackEvent(data.event);
    }
  });

  // Mobile responsive adjustments
  if (window.innerWidth < 768) {
    iframe.style.width = 'calc(100vw - 32px)';
    iframe.style.height = 'calc(100vh - 100px)';
    iframe.style.right = '16px';
    iframe.style.bottom = '80px';
    container.style.right = '16px';
    container.style.bottom = '16px';
  }

  console.log('Venturize Widget loaded successfully:', widgetId);
})();

