const DEFAULT_MAX_CONCURRENT_REQUESTS = 4;
const MAX_CONFIGURED_CONCURRENT_REQUESTS = 20;

let activeRequests = 0;

function configuredConcurrency(): number {
  const configured = Number(process.env.AGENT_MAX_CONCURRENT_REQUESTS);
  if (!Number.isInteger(configured) || configured < 1) {
    return DEFAULT_MAX_CONCURRENT_REQUESTS;
  }
  return Math.min(configured, MAX_CONFIGURED_CONCURRENT_REQUESTS);
}

export function tryAcquireRuntimeSlot(
  maxConcurrentRequests = configuredConcurrency()
): { release: () => void } | null {
  if (activeRequests >= maxConcurrentRequests) return null;
  activeRequests += 1;

  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      activeRequests = Math.max(0, activeRequests - 1);
    },
  };
}
