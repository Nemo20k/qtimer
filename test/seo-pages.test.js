import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LANDING_PAGES } from "../src/landing-pages.js";

const root = new URL("../", import.meta.url);

test("landing documents expose the expected SEO contract", async () => {
  for (const page of Object.values(LANDING_PAGES)) {
    const html = await readFile(new URL(`.${page.path}/index.html`, root), "utf8");

    assert.match(html, new RegExp(`<title>${page.title}</title>`));
    assert.match(html, new RegExp(`<meta name="description" content="${page.description}"`));
    assert.match(html, new RegExp(`<link rel="canonical" href="https://qtimer\\.app${page.path}"`));
    assert.match(html, new RegExp(`<h1>${page.heading}</h1>`));
    assert.match(html, new RegExp(`href="${page.path}\\?`));
    assert.match(html, /href="\/#(?:hiit|tabata|emom)"/);
  }
});

test("sitemap contains only canonical public pages", async () => {
  const sitemap = await readFile(new URL("public/sitemap.xml", root), "utf8");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url);

  assert.deepEqual(urls, [
    "https://qtimer.app/",
    "https://qtimer.app/privacy/",
    "https://qtimer.app/contact/",
    ...Object.values(LANDING_PAGES).map((page) => `https://qtimer.app${page.path}`),
  ]);
  assert.equal(urls.some((url) => url.includes("?")), false);
});

test("robots references the production sitemap", async () => {
  const robots = await readFile(new URL("public/robots.txt", root), "utf8");
  assert.match(robots, /Allow: \/\n/);
  assert.match(robots, /Sitemap: https:\/\/qtimer\.app\/sitemap\.xml/);
});
