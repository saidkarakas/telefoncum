// Preload scripts go here if needed.
// For security reasons contextIsolation is active, so we don't expose Node directly.
window.addEventListener('DOMContentLoaded', () => {
  console.log('Electron preload loaded successfully.');
});
