import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { LANDING_PAGES } from "../src/landing-pages.js";

const run = promisify(execFile);
const root = new URL("../", import.meta.url);

test("production build emits every landing route", async () => {
  await run(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    cwd: root,
  });

  for (const page of Object.values(LANDING_PAGES)) {
    const output = new URL(`dist${page.path}/index.html`, root);
    await access(output);
    const html = await readFile(output, "utf8");
    assert.match(html, new RegExp(`<title>${page.title}</title>`));
    assert.match(html, new RegExp(`<link rel="canonical" href="https://qtimer\\.app${page.path}"`));
  }
});
