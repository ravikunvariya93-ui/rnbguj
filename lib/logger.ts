// Central logger — keeps console noise out of production and
// gives a single place to plug in a real log shipper later.
type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, ...args: unknown[]) {
  if (process.env.NODE_ENV === 'production' && level === 'debug') return;
  // eslint-disable-next-line no-console
  console[level](`[${level.toUpperCase()}]`, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => emit('debug', ...args),
  info: (...args: unknown[]) => emit('info', ...args),
  warn: (...args: unknown[]) => emit('warn', ...args),
  error: (...args: unknown[]) => emit('error', ...args),
};
