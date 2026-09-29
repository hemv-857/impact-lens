import http from "node:http";
import { promises as dns } from "node:dns";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import { apiLogin } from "./helpers";

// P4 regression: the video-URL SSRF guard must check the *resolved* address.
// "localhost." (trailing dot) is a DNS name the old string-only isPrivateHost let
// through, yet it resolves to loopback — so the server must never connect to it.
test("video analysis never fetches a name that resolves to loopback", async ({ request }) => {
  const addrs = await dns.lookup("localhost.", { all: true }).catch(() => []);
  test.skip(addrs.length === 0, "host cannot resolve 'localhost.'");

  let hits = 0;
  const listen = (port: number, host: string) =>
    new Promise<http.Server | null>((resolve) => {
      const s = http.createServer((_req, res) => {
        hits++;
        res.end("x");
      });
      s.once("error", () => resolve(null)); // e.g. no IPv6 loopback on this host
      s.listen(port, host, () => resolve(s));
    });
  const v4 = (await listen(0, "127.0.0.1"))!;
  const port = (v4.address() as AddressInfo).port;
  const v6 = await listen(port, "::1"); // same port: either family the resolver returns is observed

  await apiLogin(request);
  let id: string | undefined;
  try {
    // autoAnalyze runs the fetch synchronously inside the POST; analysis itself may
    // fail (no provider key in CI) — only whether the loopback listener was hit matters.
    const res = await request.post("/api/media", {
      data: { url: `http://localhost.:${port}/clip.mp4`, title: "sec-p4 ssrf probe", autoAnalyze: true },
    });
    expect(res.status()).toBe(201);
    id = (await res.json()).id;
    expect(hits).toBe(0);
  } finally {
    if (id) await request.delete(`/api/media/${id}`);
    v4.close();
    v6?.close();
  }
});
