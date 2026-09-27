// This is deliberately a no-op. The project must not override console methods or
// window error handlers, because doing so hides real application and library
// failures and can mask the root cause of production crashes.

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

export const restoreOriginalConsole = () => {
  Object.assign(console, originalConsole);
};

export const enableSilentMode = () => {
  // Intentionally disabled to ensure runtime failures remain visible.
  return false;
};

export default {
  restoreOriginalConsole,
  enableSilentMode,
};
