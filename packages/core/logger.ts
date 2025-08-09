// BEGIN LOGGER
interface Meta {
  [key: string]: unknown;
}

function write(level: string, msg: string, meta?: Meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (msg: string, meta?: Meta) => write('info', msg, meta),
  error: (msg: string, meta?: Meta) => write('error', msg, meta),
  debug: (msg: string, meta?: Meta) => write('debug', msg, meta),
};
// END LOGGER
