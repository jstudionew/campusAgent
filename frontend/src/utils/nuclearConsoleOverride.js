// This file intentionally does not monkey-patch console methods or browser
// error handlers. Real runtime errors must remain visible so production issues
// are diagnosable instead of being silently suppressed.

const ORIGINAL_CONSOLE = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  trace: console.trace.bind(console),
  group: console.group.bind(console),
  groupEnd: console.groupEnd.bind(console),
  table: console.table.bind(console),
};

export const restoreConsole = () => {
  Object.assign(console, ORIGINAL_CONSOLE);
};

export { ORIGINAL_CONSOLE };

export default {
  restoreConsole,
  ORIGINAL_CONSOLE,
};
