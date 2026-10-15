import {resolveApiPort} from './runtime-config';

describe('API listener configuration', () => {
  it('uses the hosting provider port before the local port', () => {
    expect(resolveApiPort({PORT: '10000', API_PORT: '4000'})).toBe(10000);
  });

  it('keeps the local port and default available', () => {
    expect(resolveApiPort({API_PORT: '4100'})).toBe(4100);
    expect(resolveApiPort({})).toBe(4000);
  });

  it.each(['0', '-1', '65536', 'named-socket', '4000.5'])('rejects an invalid port: %s', (PORT) => {
    expect(() => resolveApiPort({PORT})).toThrow('PORT or API_PORT');
  });
});
