"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const {loadData} = require("./load");

const ROOT = path.join(__dirname, "..");
const R = path.join(ROOT, "r");
const {D} = loadData();

/* The same index the app and the generator build. */
const IDS = [];
[[D.districts],[D.states],[D.events],[D.battles],[D.people],[D.topics],[D.rivers],[D.features]]
  .forEach(([arr]) => (arr || []).forEach(r => IDS.push(r.id)));

const read = id => fs.readFileSync(path.join(R, id, "index.html"), "utf8");
const has = id => fs.existsSync(path.join(R, id, "index.html"));

test("every record has a page a crawler can reach", () => {
  const missing = IDS.filter(id => !has(id));
  assert.deepEqual(missing, [], missing.length + " records without a page");
});

test("no page exists for a record that does not", () => {
  const known = new Set(IDS);
  const stray = fs.readdirSync(R).filter(d => !known.has(d));
  assert.deepEqual(stray, [], "stale pages left behind: " + stray.join(", "));
});

test("every page carries its own title and description", () => {
  const titles = new Set();
  for(const id of IDS){
    const h = read(id);
    const t = (h.match(/<title>([^<]+)<\/title>/) || [])[1];
    const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    assert.ok(t && t.length > 8, id + " has no usable title");
    assert.ok(d && d.length > 20, id + " has no usable description");
    titles.add(t);
  }
  /* Duplicated titles are the classic way a pre-rendered site gets
     ignored: search engines treat them as one page. */
  assert.equal(titles.size, IDS.length, "duplicate titles across pages");
});

test("every page carries a preview card and a canonical URL", () => {
  for(const id of IDS){
    const h = read(id);
    for(const tag of ['property="og:title"', 'property="og:description"',
                      'property="og:image"', 'property="og:url"',
                      'name="twitter:card"', 'rel="canonical"']){
      assert.ok(h.includes(tag), id + " is missing " + tag);
    }
  }
});

test("canonical and og:url agree, and point at the real domain", () => {
  for(const id of IDS){
    const h = read(id);
    const canon = (h.match(/rel="canonical" href="([^"]+)"/) || [])[1];
    const og = (h.match(/property="og:url" content="([^"]+)"/) || [])[1];
    assert.equal(canon, og, id + ": canonical and og:url disagree");
    assert.ok(canon.startsWith("https://parikramapath.com/r/" + id + "/"), id + ": " + canon);
  }
});

test("nothing leaks an unescaped quote into a meta attribute", () => {
  for(const id of IDS){
    for(const m of read(id).matchAll(/<meta [^>]*content="([^"]*)"/g))
      assert.ok(!m[1].includes('"'), id + " has a raw quote in a meta value");
  }
});

test("the prose is in the HTML, not assembled by JavaScript", () => {
  const h = read("d-kangra");
  assert.match(h, /most populous district/, "the record's own words are missing");
  assert.ok(!/<script/i.test(h), "a page that needs JS is a page a crawler cannot read");
});

test("the sitemap lists every page and is well formed", () => {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  for(const id of IDS)
    assert.ok(xml.includes("https://parikramapath.com/r/" + id + "/"), id + " is not in the sitemap");
  assert.ok(xml.includes("<loc>https://parikramapath.com/</loc>"), "the home page is not in the sitemap");
});

test("robots.txt allows crawling and names the sitemap", () => {
  const t = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
  assert.match(t, /User-agent: \*/);
  assert.match(t, /Allow: \//);
  assert.match(t, /Sitemap: https:\/\/parikramapath\.com\/sitemap\.xml/);
});

test("the app's own page points at the real domain", () => {
  const h = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(!h.includes("devateasyq.github.io"), "an old URL is still baked into index.html");
  assert.match(h, /property="og:image" content="https:\/\/parikramapath\.com\/og\.jpg"/);
  assert.match(h, /rel="canonical" href="https:\/\/parikramapath\.com\/"/);
});
