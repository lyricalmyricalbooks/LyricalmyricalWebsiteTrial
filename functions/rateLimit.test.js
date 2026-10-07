import { test, expect } from "vitest";
import { createRequire } from "node:module";
const { clientIpOf } = createRequire(import.meta.url)("./rateLimit");
const req = xff => ({ headers: { "x-forwarded-for": xff } });

test("a client-typed X-Forwarded-For can't choose the rate-limit key", () => {
  expect(clientIpOf(req("1.2.3.4, 203.0.113.9"))).toBe("203.0.113.9");
  expect(clientIpOf(req("9.9.9.9, 203.0.113.9"))).toBe("203.0.113.9");
});
test("Google load balancer and private hops are skipped", () => {
  expect(clientIpOf(req("203.0.113.9, 35.191.4.2"))).toBe("203.0.113.9");
  expect(clientIpOf(req("203.0.113.9, 10.0.0.1"))).toBe("203.0.113.9");
  expect(clientIpOf(req("203.0.113.9"))).toBe("203.0.113.9");
});
