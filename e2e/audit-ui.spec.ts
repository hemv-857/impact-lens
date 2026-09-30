import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { gotoTab, login } from "./helpers";

test.describe.configure({ mode: "serial" });

let page: Page;
let ctx: BrowserContext;

test.beforeAll(async ({ browser }) => {
  ctx = await browser.newContext();
  page = await ctx.newPage();
  await login(page);
});

test.afterAll(async () => {
  await ctx.close();
});

const VIEWS: Array<[string, RegExp]> = [
  ["Home", /To review/],
  ["Library/Media", /\d+ assets? match/],
  ["Library/Search", /Saved searches/],
  ["Library/Timeline", /Unique days/],
  ["Projects/Projects", /projects across the globe/],
  ["Projects/Before \/ After", /Past comparisons/],
  ["Projects/Insights", /Geographic reach/],
  ["Reports/Reports", /Configure report/],
  ["Reports/Campaigns", /Configure campaign/],
];

test("header exposes 4 sections; every view renders", async () => {
  for (const [tab, copy] of VIEWS) {
    await gotoTab(page, tab);
    await expect(page.getByText(copy).first(), `view: ${tab}`).toBeVisible();
  }
});

test("home shows totals, the review queue and primary actions", async () => {
  await gotoTab(page, "Home");
  await expect(page.getByText("To review")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Awaiting review|latest accessions/ }).first()).toBeVisible();
  expect(await page.locator("main svg").count()).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Add media" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate report" }).first()).toBeVisible();
});

test("insights shows the AI usage meter", async () => {
  await gotoTab(page, "Projects/Insights");
  await expect(page.getByRole("heading", { name: "AI usage" })).toBeVisible();
  await expect(page.getByTestId("ai-usage")).toBeVisible();
});

test("PASS: Media Library shows every asset by default (no verified filter)", async () => {
  // Reload to reset the in-memory query cache (staleTime 30s) so the Library
  // mount reflects the current query params.
  await page.reload();
  await expect(page.getByText("To review")).toBeVisible();
  await gotoTab(page, "Library/Media");

  const all = await (await page.request.get("/api/media?limit=100")).json();
  const cards = page
    .locator("main")
    .getByRole("button", { name: "Compare", exact: true });
  expect(all.length).toBeGreaterThanOrEqual(13);
  await expect(cards, "grid must show every asset the org owns").toHaveCount(all.length);
  await expect(page.getByText(/\d+ assets? match/)).toBeVisible();
});

test("library exposes filters, export and bulk-select tools", async () => {
  await gotoTab(page, "Library/Media");
  await expect(page.getByText(/\d+ assets? match/)).toBeVisible();
  const exportLink = page.getByRole("link", { name: "Export CSV" });
  await expect(exportLink).toBeVisible();
  // Export honors the same defaults — no verified filter either.
  await expect(exportLink).not.toHaveAttribute("href", /verified=false/);
  await expect(page.getByRole("button", { name: "Select", exact: true })).toBeVisible();
  const category = page.getByRole("combobox").first();
  await expect(category).toBeVisible();
  await expect(category).toContainText(/all categories/i);
});

test("asset drawer shows AI caption and evidence chain", async () => {
  await gotoTab(page, "Library/Media");
  const assets = await (await page.request.get("/api/media?limit=100")).json();
  const first = assets[0];
  await page.locator("main").getByRole("button", { name: "View", exact: true }).first().click();
  if (first.aiCaption) {
    await expect(
      page.getByText(first.aiCaption.slice(0, 40), { exact: false }).first()
    ).toBeVisible();
  }
  await expect(page.getByText("Evidence chain").first()).toBeVisible();
  // add + remove a manual topic tag (restored before close)
  await page.getByTestId("tag-input").fill("unit-topic-xyz");
  await page.getByTestId("tag-input").press("Enter");
  const chip = page.getByRole("button", { name: "Remove tag unit-topic-xyz", exact: true });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(chip).toHaveCount(0);
  // Drawer is a modal — close it or it blocks header navigation.
  await page.keyboard.press("Escape");
  await expect(page.getByText("Evidence chain")).toHaveCount(0);
});

test("projects tab renders map, stats and project grid", async () => {
  await gotoTab(page, "Projects");
  await expect(page.getByText(/projects across the globe/)).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.getByRole("button", { name: "New project" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Women's Cooperative Livelihoods" })).toBeVisible();
});

test("compare tab offers pickers, generator and past comparisons", async () => {
  await gotoTab(page, "Projects/Before / After");
  await expect(page.getByRole("button", { name: "Pick before image" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Pick after image" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate comparison" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Past comparisons" })).toBeVisible();
  expect(await page.getByText(/\d+% impact/).count()).toBeGreaterThanOrEqual(2);
});

test("timeline groups assets by capture date with stats strip", async () => {
  await gotoTab(page, "Library/Timeline");
  await expect(page.getByRole("tab", { name: "Timeline", selected: true })).toBeVisible();
  await expect(page.getByText("Unique days")).toBeVisible();
  await expect(page.getByText("Avg confidence")).toBeVisible();
  await expect(page.getByText(/assets across \d+ day/).first()).toBeVisible();
});

test("reports tab: configure form + past report opens in viewer", async () => {
  await gotoTab(page, "Reports");
  await expect(page.getByRole("heading", { name: "Configure report" })).toBeVisible();
  const section = page.locator("section").filter({ hasText: "Past reports" });
  await expect(section).toBeVisible();
  await section.getByRole("button").first().click();
  await expect(page.getByText("No report yet")).toHaveCount(0);
});

test("reports tab: share dialog exposes the viewer-note field", async () => {
  await gotoTab(page, "Reports");
  const section = page.locator("section").filter({ hasText: "Past reports" });
  // exact: the card itself also "contains" the words via the nested aria-label
  await section.getByRole("button", { name: "Share report", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel(/Note for viewers/)).toBeVisible();
  await expect(page.getByRole("button", { name: /copy link/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("semantic search offers NL input, example chips and saved searches", async () => {
  await gotoTab(page, "Library/Search");
  await expect(
    page.getByPlaceholder(
      "Search by meaning: 'tree planting in arid regions' or 'solar installation progress'"
    )
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "renewable energy infrastructure" })).toBeVisible();
  await expect(page.getByText(/Saved searches/)).toBeVisible();
});

test("campaign studio exposes platforms, tone and media picker", async () => {
  await gotoTab(page, "Reports/Campaigns");
  await expect(page.getByRole("heading", { name: "Configure campaign" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Instagram/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /LinkedIn/ })).toBeVisible();
  await expect(page.getByText(/Select media \(0 selected\)/)).toBeVisible();
});
