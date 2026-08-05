import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number);

  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254)
  );
}

export function isAllowedGfoOrigin(
  origin: string,
  frontendPort = '5173',
): boolean {
  try {
    const url = new URL(origin);
    const isExpectedProtocol = url.protocol === 'http:';
    const isExpectedPort = url.port === frontendPort;
    const isTrustedHost =
      LOOPBACK_HOSTS.has(url.hostname) ||
      isPrivateIpv4(url.hostname) ||
      url.hostname.endsWith('.local');

    return isExpectedProtocol && isExpectedPort && isTrustedHost;
  } catch {
    return false;
  }
}

export function createGfoCorsOptions(
  frontendPort = process.env.GFO_FRONTEND_PORT ?? '5173',
): CorsOptions {
  return {
    origin: (origin, callback) => {
      if (!origin || isAllowedGfoOrigin(origin, frontendPort)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origine non autorizzata per GFO Platform'), false);
    },
  };
}

export function getGfoServerHost(
  networkMode = process.env.GFO_NETWORK_MODE,
): string {
  return networkMode === 'lan' ? '0.0.0.0' : '127.0.0.1';
}
