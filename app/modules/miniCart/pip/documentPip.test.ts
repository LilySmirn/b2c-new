import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PIP_HEIGHT,
  DEFAULT_PIP_WIDTH,
  MICRO_PIP_HEIGHT,
  MICRO_PIP_WIDTH,
  MIN_PIP_HEIGHT,
  MIN_PIP_WIDTH,
  PIP_TOP_CHROME_HEIGHT,
  SITE_HEADER_HEIGHT,
  isLivePortalTarget,
  isNearPipSize,
  isPipWindowOpen,
  readPipFrameSize,
  resizeDocumentPipWindow,
  resolvePipSize,
  shrinkPipToMicro,
} from "./documentPip";

describe("resolvePipSize", () => {
  it("falls back to defaults without a measured panel", () => {
    assert.deepEqual(resolvePipSize(), {
      width: DEFAULT_PIP_WIDTH,
      height: DEFAULT_PIP_HEIGHT,
    });
    assert.deepEqual(resolvePipSize(null), {
      width: DEFAULT_PIP_WIDTH,
      height: DEFAULT_PIP_HEIGHT,
    });
  });

  it("uses SideCart height and keeps width from widthEl / default", () => {
    const heightEl = {
      offsetHeight: 712,
      offsetWidth: 380,
      getBoundingClientRect() {
        return { top: 108, left: 0, right: 0, bottom: 0, width: 0, height: 712 };
      },
    } as unknown as HTMLElement;
    const opener = { innerHeight: 900 } as Window;

    assert.deepEqual(
      resolvePipSize({
        heightEl,
        opener,
      }),
      {
        width: DEFAULT_PIP_WIDTH,
        height: 712,
      },
    );

    const widthEl = { offsetWidth: 390, offsetHeight: 100 } as HTMLElement;
    assert.deepEqual(
      resolvePipSize({
        widthEl,
        heightEl,
        opener,
      }),
      {
        width: 390,
        height: 712,
      },
    );
  });

  it("uses cachedHeight when SideCart is hidden (offsetHeight 0)", () => {
    const heightEl = {
      offsetHeight: 0,
      getBoundingClientRect() {
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
      },
    } as unknown as HTMLElement;
    const opener = { innerHeight: 900 } as Window;

    assert.deepEqual(
      resolvePipSize({
        heightEl,
        cachedHeight: 640,
        opener,
      }),
      {
        width: DEFAULT_PIP_WIDTH,
        height: 640,
      },
    );
  });

  it("clamps height so outer window clears the site header (PiP chrome)", () => {
    const heightEl = {
      offsetHeight: 800,
      getBoundingClientRect() {
        return { top: 108, left: 0, right: 0, bottom: 0, width: 0, height: 800 };
      },
    } as unknown as HTMLElement;
    const opener = { innerHeight: 800 } as Window;
    const maxInner = 800 - 108 - PIP_TOP_CHROME_HEIGHT;

    assert.deepEqual(
      resolvePipSize({
        heightEl,
        opener,
      }),
      {
        width: DEFAULT_PIP_WIDTH,
        height: Math.max(MIN_PIP_HEIGHT, maxInner),
      },
    );
  });

  it("uses SITE_HEADER_HEIGHT when source top is unavailable", () => {
    const opener = { innerHeight: 700 } as Window;
    const maxInner = 700 - SITE_HEADER_HEIGHT - PIP_TOP_CHROME_HEIGHT;

    assert.deepEqual(
      resolvePipSize({
        cachedHeight: 900,
        opener,
      }),
      {
        width: DEFAULT_PIP_WIDTH,
        height: Math.max(MIN_PIP_HEIGHT, maxInner),
      },
    );
  });

  it("still accepts a legacy HTMLElement argument", () => {
    const panel = { offsetWidth: 400, offsetHeight: 500 } as HTMLElement;
    assert.deepEqual(resolvePipSize(panel), {
      width: Math.max(MIN_PIP_WIDTH, 400),
      height: Math.max(MIN_PIP_HEIGHT, 500),
    });
  });
});

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

describe("resizeDocumentPipWindow", () => {
  it("calls resizeTo with rounded outer size", () => {
    const calls: Array<[number, number]> = [];
    const win = {
      closed: false,
      resizeTo(width: number, height: number) {
        calls.push([width, height]);
      },
    };
    assert.equal(
      resizeDocumentPipWindow(win as never, 240.2, 99.6),
      true,
    );
    assert.deepEqual(calls, [[240, 100]]);
  });

  it("returns false when resizeTo throws", () => {
    const win = {
      closed: false,
      resizeTo() {
        throw new Error("NotAllowedError");
      },
    };
    assert.equal(resizeDocumentPipWindow(win as never, 240, 100), false);
  });

  it("returns false when the window is closed or has no resizeTo", () => {
    assert.equal(
      resizeDocumentPipWindow({ closed: true, resizeTo() {} } as never, 240, 100),
      false,
    );
    assert.equal(resizeDocumentPipWindow({ closed: false } as never, 240, 100), false);
  });
});

describe("shrinkPipToMicro", () => {
  it("returns the previous frame size when resize lands near the micro target", () => {
    const win = {
      closed: false,
      outerWidth: 420,
      outerHeight: 674,
      resizeTo(width: number, height: number) {
        win.outerWidth = width;
        win.outerHeight = height;
      },
    };
    assert.deepEqual(shrinkPipToMicro(win as never), { width: 420, height: 674 });
    assert.deepEqual(readPipFrameSize(win as never), {
      width: MICRO_PIP_WIDTH,
      height: MICRO_PIP_HEIGHT,
    });
  });

  it("returns null and does not pretend success when resizeTo throws", () => {
    const win = {
      closed: false,
      outerWidth: 420,
      outerHeight: 674,
      resizeTo() {
        throw new Error("NotAllowedError");
      },
    };
    assert.equal(shrinkPipToMicro(win as never), null);
    assert.deepEqual(readPipFrameSize(win as never), { width: 420, height: 674 });
  });

  it("returns null when the frame stays far from the micro size", () => {
    const win = {
      closed: false,
      outerWidth: 420,
      outerHeight: 674,
      resizeTo() {
        /* browser ignored the call */
      },
    };
    assert.equal(shrinkPipToMicro(win as never), null);
    assert.equal(
      isNearPipSize(
        { width: 420, height: 674 },
        { width: MICRO_PIP_WIDTH, height: MICRO_PIP_HEIGHT },
      ),
      false,
    );
  });
});
