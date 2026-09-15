import test from "node:test";
import assert from "node:assert/strict";
import { createWakeLockController } from "../src/wake-lock.js";

class FakeSentinel {
  constructor() {
    this.released = false;
    this.releaseCalls = 0;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  release() {
    this.releaseCalls += 1;
    this.released = true;
    return Promise.resolve();
  }

  emit(type) {
    this.listeners.get(type)?.();
  }
}

test("acquires once, releases on the release event, and reacquires when synced", async () => {
  const sentinels = [];
  const navigatorRef = { wakeLock: { request: async () => {
    const sentinel = new FakeSentinel();
    sentinels.push(sentinel);
    return sentinel;
  } } };
  const controller = createWakeLockController({ navigatorRef, documentRef: { visibilityState: "visible" } });

  assert.equal(controller.isSupported(), true);
  assert.deepEqual(await controller.sync(true), { status: "acquired" });
  assert.deepEqual(await controller.sync(true), { status: "acquired" });
  assert.equal(sentinels.length, 1);

  sentinels[0].emit("release");
  assert.deepEqual(await controller.sync(true), { status: "acquired" });
  assert.equal(sentinels.length, 2);
  sentinels[0].emit("release");
  assert.deepEqual(await controller.sync(true), { status: "acquired" });
  assert.equal(sentinels.length, 2);
});

test("releases a lock that resolves after the workout stops needing it", async () => {
  let resolveRequest;
  const sentinel = new FakeSentinel();
  const controller = createWakeLockController({
    navigatorRef: { wakeLock: { request: () => new Promise((resolve) => { resolveRequest = resolve; }) } },
    documentRef: { visibilityState: "visible" },
  });

  const acquire = controller.sync(true);
  await controller.sync(false);
  resolveRequest(sentinel);
  assert.deepEqual(await acquire, { status: "not-held" });
  assert.equal(sentinel.releaseCalls, 1);
});

test("returns progressive-enhancement results without throwing", async () => {
  const unsupported = createWakeLockController({ navigatorRef: {}, documentRef: { visibilityState: "visible" } });
  assert.deepEqual(await unsupported.sync(true), { status: "unsupported" });

  const error = new Error("private browser detail");
  error.name = "NotAllowedError";
  const failed = createWakeLockController({
    navigatorRef: { wakeLock: { request: async () => { throw error; } } },
    documentRef: { visibilityState: "visible" },
  });
  assert.deepEqual(await failed.sync(true), { status: "failed", errorName: "NotAllowedError" });
});

test("does not request while hidden and reacquires after becoming visible", async () => {
  const documentRef = { visibilityState: "hidden" };
  let requests = 0;
  const controller = createWakeLockController({
    navigatorRef: { wakeLock: { request: async () => {
      requests += 1;
      return new FakeSentinel();
    } } },
    documentRef,
  });

  assert.deepEqual(await controller.sync(true), { status: "not-held" });
  assert.equal(requests, 0);
  documentRef.visibilityState = "visible";
  assert.deepEqual(await controller.sync(true), { status: "acquired" });
  assert.equal(requests, 1);
});

test("swallows release failures and remains safe to clean up repeatedly", async () => {
  const sentinel = new FakeSentinel();
  sentinel.release = () => {
    sentinel.releaseCalls += 1;
    sentinel.released = true;
    return Promise.reject(new Error("browser detail"));
  };
  const controller = createWakeLockController({
    navigatorRef: { wakeLock: { request: async () => sentinel } },
    documentRef: { visibilityState: "visible" },
  });

  await controller.sync(true);
  await assert.doesNotReject(controller.release());
  await assert.doesNotReject(controller.destroy());
  assert.equal(sentinel.releaseCalls, 1);
});
