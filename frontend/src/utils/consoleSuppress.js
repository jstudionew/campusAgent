// This file intentionally does not silence console output. Suppressing CSS or
// Emotion warnings in production makes runtime errors impossible to diagnose.

const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);
const originalLog = console.log.bind(console);

export const restoreConsole = () => {
  console.warn = originalWarn;
  console.error = originalError;
  console.log = originalLog;
};

export default {
  restoreConsole,
};
