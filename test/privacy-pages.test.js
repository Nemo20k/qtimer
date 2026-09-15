import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function page(name) {
  return readFile(new URL(`${name}/index.html`, root), "utf8");
}

test("privacy page contains the audited privacy sections", async () => {
  const html = await page("privacy");
  for (const heading of ["Privacy at a glance", "Workout links", "AI workout generation", "Analytics", "Local browser data", "Service providers", "Retention", "User choices", "Fitness disclaimer", "Changes and contact"]) {
    assert.match(html, new RegExp(`<h2>${heading}</h2>`));
  }
  assert.match(html, /https:\/\/qtimer\.app\/privacy\//);
  assert.doesNotMatch(html, /GDPR|CCPA|HIPAA|consent banner|privacy choices/i);
});

test("contact page uses the verified public issue destination and supplied email", async () => {
  const html = await page("contact");
  assert.match(html, /https:\/\/github\.com\/Nemo20k\/qtimer\/issues/);
  assert.match(html, /mailto:nemo20k\.dev@gmail\.com/);
  assert.match(html, /Bug|feature|privacy|unsafe AI/i);
  assert.match(html, /private health information|complete AI prompts|confidential timer links/i);
  assert.doesNotMatch(html, /@example\.|support@|contact@/i);
});

test("app footer uses normal privacy and contact links", async () => {
  const footer = await readFile(new URL("src/site-footer.js", root), "utf8");
  assert.match(footer, /href="\/privacy\/"/);
  assert.match(footer, /href="\/contact\/"/);
  assert.match(footer, /github\.com\/Nemo20k\/qtimer/);
  const ui = await readFile(new URL("src/ui.js", root), "utf8");
  const builder = await readFile(new URL("src/builder.js", root), "utf8");
  const landing = await readFile(new URL("src/landing-pages.js", root), "utf8");
  assert.match(ui, /siteFooterMarkup\("app-site-footer"\)/);
  assert.match(ui, /siteFooterMarkup\(\)/);
  assert.match(builder, /siteFooterMarkup\(\)/);
  assert.match(landing, /siteFooterMarkup\(\)/);
});
