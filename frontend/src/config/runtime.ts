import { resolveApiUrl } from "../utils/runtimeNetwork";

const browserLocation =
  typeof window === "undefined"
    ? undefined
    : window.location;

export const API_URL = resolveApiUrl({
  configuredUrl: import.meta.env.VITE_API_URL,
  protocol: browserLocation?.protocol,
  hostname: browserLocation?.hostname,
});
