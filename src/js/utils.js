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

window.fmt = fmt;
window.debounce = debounce;
