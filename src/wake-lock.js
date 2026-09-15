const ALLOWED_ERROR_NAMES = new Set([
  "AbortError",
  "InvalidStateError",
  "NotAllowedError",
  "NotSupportedError",
  "SecurityError",
  "TypeError",
]);

function errorName(error) {
  return ALLOWED_ERROR_NAMES.has(error?.name) ? error.name : undefined;
}

export function createWakeLockController({
  navigatorRef = globalThis.navigator,
  documentRef = globalThis.document,
} = {}) {
  let sentinel = null;
  let requestPromise = null;
  let releasePromise = null;
  let desired = false;
  let destroyed = false;

  function isSupported() {
    return typeof navigatorRef?.wakeLock?.request === "function";
  }

  function isVisible() {
    return documentRef?.visibilityState === "visible";
  }

  function releaseLock(lock) {
    if (!lock || lock.released || typeof lock.release !== "function") return Promise.resolve();

    let promise;
    try {
      promise = Promise.resolve(lock.release()).catch(() => {});
    } catch {
      promise = Promise.resolve();
    }
    const previousRelease = releasePromise;
    const combinedRelease = (previousRelease ? Promise.all([previousRelease, promise]) : promise).then(() => {});
    releasePromise = combinedRelease;
    combinedRelease.then(() => {
      if (releasePromise === combinedRelease) releasePromise = null;
    });
    return combinedRelease;
  }

  function release() {
    const lock = sentinel;
    sentinel = null;
    return releaseLock(lock).then(() => ({ status: "released" }));
  }

  function acquire() {
    if (!isSupported()) return Promise.resolve({ status: "unsupported" });
    if (sentinel && !sentinel.released) return Promise.resolve({ status: "acquired" });
    if (requestPromise) return requestPromise;

    let pending;
    pending = Promise.resolve()
      .then(() => navigatorRef.wakeLock.request("screen"))
      .then(async (lock) => {
        if (!lock || typeof lock.release !== "function") return { status: "failed" };

        if (destroyed || !desired || !isVisible()) {
          await releaseLock(lock);
          return { status: "not-held" };
        }

        sentinel = lock;
        lock.addEventListener?.("release", () => {
          if (sentinel === lock) sentinel = null;
        });
        return { status: "acquired" };
      })
      .catch((error) => ({ status: "failed", errorName: errorName(error) }));
    let trackedRequest;
    trackedRequest = pending.finally(() => {
      if (requestPromise === trackedRequest) requestPromise = null;
    });
    requestPromise = trackedRequest;
    return trackedRequest;
  }

  async function sync(shouldHold) {
    desired = Boolean(shouldHold) && !destroyed;
    if (!desired) return release();
    if (!isSupported() || !isVisible()) return isSupported()
      ? { status: "not-held" }
      : { status: "unsupported" };
    if (releasePromise) await releasePromise;
    if (!desired || destroyed || !isVisible()) return { status: "not-held" };
    return acquire();
  }

  return {
    isSupported,
    sync,
    release,
    destroy() {
      destroyed = true;
      desired = false;
      return release();
    },
  };
}
