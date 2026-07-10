/**
 * content.js
 * 
 * Runs in the context of the webpage. Handles DOM extraction,
 * floating action button (FAB) UI injection, and communication with background.js.
 * 
 * Adapted from n4ze3m/page-assist, MIT License, src/content-scripts/index.ts
 */

// Listener for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Content Script] Received message:', message);

  if (message.action === 'TRIGGER_EXTRACTION') {
    try {
      const extracted = performExtraction();
      sendResponse({ status: 'success', data: extracted });
    } catch (error) {
      console.error('[Content Script] Extraction failed:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  }
  return true;
});

/**
 * Extracts clean textual content from the active webpage.
 * Ignores scripts, styles, headers, and footer elements.
 */
function performExtraction() {
  const url = window.location.href;
  const title = document.title;
  
  // Custom selector filters to remove noise
  const noiseSelectors = [
    'nav', 'footer', 'aside', 'header[role="banner"]',
    '[class*="cookie"]', '[id*="cookie"]',
    '[class*="advert"]', '[class*="ads-"]', '[id*="ad-"]',
    '[class*="sidebar"]', '[aria-hidden="true"]',
    'script', 'style', 'noscript', 'iframe'
  ];

  // Clone document body to clean without affecting the original page
  const bodyClone = document.body.cloneNode(true);
  
  noiseSelectors.forEach(selector => {
    const elements = bodyClone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });

  const textContent = bodyClone.innerText || bodyClone.textContent || '';
  const cleanText = textContent.replace(/\s+/g, ' ').trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

  return {
    url,
    title,
    textContent: cleanText,
    wordCount,
    extractionMethod: 'raw-dom',
    truncated: false
  };
}

/**
 * Injects a premium Floating Action Button (FAB) into the bottom-right corner of the page.
 */
function injectFAB() {
  if (document.getElementById('ai-companion-fab')) return;

  const fab = document.createElement('div');
  fab.id = 'ai-companion-fab';
  fab.innerHTML = '🎙️';
  
  // Custom styles for a premium glassmorphic button
  Object.assign(fab.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    color: '#ffffff',
    display: 'flex',
    align-items: 'center',
    justify-content: 'center',
    fontSize: '24px',
    cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
    zIndex: '999999',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  });

  // Hover animations
  fab.addEventListener('mouseenter', () => {
    fab.style.transform = 'scale(1.1) translateY(-2px)';
    fab.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.6)';
  });

  fab.addEventListener('mouseleave', () => {
    fab.style.transform = 'scale(1) translateY(0)';
    fab.style.boxShadow = '0 8px 32px rgba(99, 102, 241, 0.4)';
  });

  // Action: Trigger UI / Extraction
  fab.addEventListener('click', () => {
    // Pulse animation
    fab.style.transform = 'scale(0.95)';
    setTimeout(() => { fab.style.transform = 'scale(1.1)'; }, 100);

    // Send a message to background.js indicating FAB click
    chrome.runtime.sendMessage({ action: 'TRIGGER_EXTRACTION' }, (response) => {
      console.log('[Content Script] FAB clicked response:', response);
    });
  });

  document.body.appendChild(fab);
}

// Inject on document idle/load
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  injectFAB();
} else {
  window.addEventListener('DOMContentLoaded', injectFAB);
}

console.log('[AI Browser Companion] Content script and FAB successfully initialized.');
