// Utilities for ArisShop
function fmt(n) {
  return '$' + n.toLocaleString('es-CO');
}

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeURL(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/|\.\/)/i.test(trimmed)) {
    return escapeHTML(trimmed);
  }
  return '';
}

window.fmt = fmt;
window.debounce = debounce;
window.escapeHTML = escapeHTML;
window.sanitizeURL = sanitizeURL;
