export type RuntimeNetworkLocation = {
  configuredUrl?: string;
  protocol?: string;
  hostname?: string;
  backendPort?: string;
};

function normalizeProtocol(protocol: string | undefined): string {
  return protocol === "https:" ? "https:" : "http:";
}

export function resolveApiUrl({
  configuredUrl,
  protocol,
  hostname,
  backendPort = "3000",
}: RuntimeNetworkLocation): string {
  const explicitUrl = configuredUrl?.trim();

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  const runtimeHostname = hostname?.trim() || "localhost";

  return `${normalizeProtocol(protocol)}//${runtimeHostname}:${backendPort}`;
}

export function isLanHostname(hostname: string): boolean {
  return ![
    "localhost",
    "127.0.0.1",
    "::1",
  ].includes(hostname);
}
