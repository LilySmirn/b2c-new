import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isLivePortalTarget, isPipWindowOpen } from "./documentPip";

describe("isPipWindowOpen", () => {
  it("returns false for null/undefined", () => {
    assert.equal(isPipWindowOpen(null), false);
    assert.equal(isPipWindowOpen(undefined), false);
  });

  it("returns false when closed throws or is true", () => {
    assert.equal(isPipWindowOpen({ closed: true } as never), false);
    assert.equal(
      isPipWindowOpen(
        new Proxy(
          {},
          {
            get() {
              throw new Error("dead window");
            },
          },
        ) as never,
      ),
      false,
    );
  });

  it("returns true for an open window-like object", () => {
    assert.equal(isPipWindowOpen({ closed: false } as never), true);
  });
});

describe("isLivePortalTarget", () => {
  it("rejects null and non-elements", () => {
    assert.equal(isLivePortalTarget(null), false);
    assert.equal(isLivePortalTarget(undefined), false);
    assert.equal(isLivePortalTarget({} as never), false);
  });

  it("rejects when ownerDocument access throws", () => {
    const broken = {
      nodeType: 1,
      get ownerDocument() {
        throw new Error("dead document");
      },
    };
    assert.equal(isLivePortalTarget(broken as unknown as HTMLElement), false);
  });

  it("rejects attached nodes whose window is closed", () => {
    const mount = { nodeType: 1 };
    const body = {
      contains(node: unknown) {
        return node === mount;
      },
    };
    const doc = {
      body,
      documentElement: body,
      defaultView: { closed: true },
    };
    Object.assign(mount, { ownerDocument: doc });
    assert.equal(isLivePortalTarget(mount as unknown as HTMLElement), false);
  });

  it("accepts an attached node in a live window", () => {
    const mount = { nodeType: 1 };
    const body = {
      contains(node: unknown) {
        return node === mount;
      },
    };
    const doc = {
      body,
      documentElement: body,
      defaultView: { closed: false },
    };
    Object.assign(mount, { ownerDocument: doc });
    assert.equal(isLivePortalTarget(mount as unknown as HTMLElement), true);
  });
});
