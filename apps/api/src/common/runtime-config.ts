export function resolveApiPort(env: {PORT?: string; API_PORT?: string}): number {
  const port = Number(env.PORT || env.API_PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT or API_PORT must be an integer between 1 and 65535');
  }
  return port;
}
