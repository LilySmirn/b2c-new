import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MEDS_UPSTREAM_URL, proxyMedsRequest } from "./medsUpstream";

const PLUS_PLUS = "Омепразол++Амоксициллин++Кларитромицин";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("meds upstream proxy", () => {
  it("пересылает POST с тем же массивом названий и не вызывает GET", async () => {
    const names = ["Омепразол", "Амоксициллин", "Кларитромицин", PLUS_PLUS, ""];
    let method = "";
    let url = "";
    let body = "";
    const upstream = {
      drugs: names.map((name) => ({ name, type: "drug", data: [] })),
      interactions: null,
    };

    const result = await proxyMedsRequest(names, async (input, init) => {
      method = init?.method ?? "";
      url = String(input);
      body = String(init?.body ?? "");
      return jsonResponse(upstream);
    });

    assert.equal(method, "POST");
    assert.equal(url, MEDS_UPSTREAM_URL);
    assert.equal(body, JSON.stringify(names));
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, upstream);
  });

  it("не подменяет ошибку, пустой ответ и сломанный JSON моковым каталогом", async () => {
    const http = await proxyMedsRequest(["Омепразол"], async () =>
      jsonResponse({ error: "no" }, 500),
    );
    assert.equal(http.status, 500);
    assert.deepEqual(http.body, { error: "Meds catalog request failed" });

    const broken = await proxyMedsRequest(["Омепразол"], async () =>
      new Response("not-json", { status: 200 }),
    );
    assert.equal(broken.status, 502);

    const shape = await proxyMedsRequest(["Омепразол"], async () =>
      jsonResponse({ items: [] }),
    );
    assert.equal(shape.status, 502);

    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";
    const timedOut = await proxyMedsRequest(["Омепразол"], async () => {
      throw timeout;
    });
    assert.equal(timedOut.status, 504);

    let called = false;
    const rejected = await proxyMedsRequest(["Омепразол", 1], async () => {
      called = true;
      return jsonResponse({ drugs: [], interactions: null });
    });
    assert.equal(called, false);
    assert.equal(rejected.status, 400);
  });
});
