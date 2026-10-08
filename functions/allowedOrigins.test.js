import { test, expect } from "vitest";
import { createRequire } from "node:module";
const { isAllowedOrigin, isAllowedReturnUrl } = createRequire(import.meta.url)("./allowedOrigins");

test("the Pages, Hosting and custom-domain storefronts are allowed", () => {
  for (const origin of ["https://lyricalmyricalbooks.github.io", "https://lyricalmyrical-web-v2.web.app", "https://lyricalmyrical-web-v2.firebaseapp.com", "https://www.lyricalmyricalbooks.com"]) {
    expect(isAllowedOrigin(origin)).toBe(true);
  }
});
test("this project's Hosting preview channels are allowed, look-alikes are not", () => {
  expect(isAllowedOrigin("https://lyricalmyrical-web-v2--pr405-hosting-ab12cd34.web.app")).toBe(true);
  expect(isAllowedOrigin("https://other-project--pr405-ab12cd34.web.app")).toBe(false);
  expect(isAllowedOrigin("https://lyricalmyrical-web-v2--pr1.web.app.evil.com")).toBe(false);
  expect(isAllowedOrigin("http://lyricalmyrical-web-v2--pr1-ab.web.app")).toBe(false);
  expect(isAllowedOrigin(undefined)).toBe(false);
});
test("return URLs are judged by their real origin", () => {
  expect(isAllowedReturnUrl("https://lyricalmyricalbooks.github.io/LyricalmyricalWebsiteTrial/checkout")).toBe(true);
  expect(isAllowedReturnUrl("https://lyricalmyrical-web-v2--pr405-ab12cd34.web.app/checkout")).toBe(true);
  expect(isAllowedReturnUrl("https://lyricalmyrical-web-v2.web.app@evil.com/checkout")).toBe(false);
  expect(isAllowedReturnUrl("https://lyricalmyrical-web-v2.web.app.evil.com/checkout")).toBe(false);
  expect(isAllowedReturnUrl("not a url")).toBe(false);
});
