import { getGfoServerHost, isAllowedGfoOrigin } from './network-policy';

describe('GFO network policy', () => {
  it('keeps the standard server on loopback', () => {
    expect(getGfoServerHost()).toBe('127.0.0.1');
    expect(getGfoServerHost('local')).toBe('127.0.0.1');
  });

  it('exposes the server only when LAN mode is explicit', () => {
    expect(getGfoServerHost('lan')).toBe('0.0.0.0');
  });

  it.each([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.1.25:5173',
    'http://10.0.0.8:5173',
    'http://172.20.10.2:5173',
    'http://macbook-air.local:5173',
  ])('allows the trusted frontend origin %s', (origin) => {
    expect(isAllowedGfoOrigin(origin)).toBe(true);
  });

  it.each([
    'https://192.168.1.25:5173',
    'http://192.168.1.25:3000',
    'http://8.8.8.8:5173',
    'https://example.com',
    'not-an-origin',
  ])('rejects the untrusted frontend origin %s', (origin) => {
    expect(isAllowedGfoOrigin(origin)).toBe(false);
  });
});
