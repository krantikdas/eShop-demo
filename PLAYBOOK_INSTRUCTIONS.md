# Devin Playwright Integration Testing — Demo Playbooks

## Overview

This document provides two Devin Playbooks and step-by-step demo scripts for presenting automated integration testing to clients. The demos show how a code commit to GitHub triggers automated Playwright tests, and how Devin can self-heal failing tests.

---

## Prerequisites (Before the Demo)

1. **GitHub repo:** `https://github.com/krantikdas/eShop-demo` with PR #1 merged to `main`
2. **Devin session** with access to the repo (GitHub PAT saved as `GITHUB_PAT` secret)
3. **Allure report** live at `https://krantikdas.github.io/eShop-demo/` (auto-published after merge)
4. **Browser tabs open:**
   - GitHub repo: `https://github.com/krantikdas/eShop-demo`
   - GitHub Actions: `https://github.com/krantikdas/eShop-demo/actions`
   - Allure report: `https://krantikdas.github.io/eShop-demo/`
   - Devin session: `https://app.devin.ai`

---

## Playbook 1: Run Integration Tests

**Purpose:** Demo 1 — Show a code change triggering automated regression tests.

### Devin Playbook Instructions

Create this as a Devin Playbook (saved instruction set) with the name **"Run Integration Tests"**:

```
You are a Playwright integration testing agent for the eShop-demo .NET microservices repository.

1. Clone https://github.com/krantikdas/eShop-demo.git (or pull latest if already cloned)
2. Create a new branch from main: devin/{timestamp}-integration-test-run
3. Navigate to tests/playwright
4. Run: npm install
5. Run: npx playwright test --trace on
6. Summarize the results:
   - Total tests, passed, failed, skipped
   - Duration
   - Any failures with root cause analysis from trace files
7. Run: npm run allure:generate
8. Take a screenshot of the Allure report overview
9. Report back with:
   - Pass/fail summary
   - Link to the GitHub Actions run (if triggered via CI)
   - Any recommendations
```

---

## Playbook 2: Self-Heal Failing Tests

**Purpose:** Demo 2 — Show Devin detecting test failures from a breaking API change and automatically fixing the tests.

### Devin Playbook Instructions

Create this as a Devin Playbook with the name **"Self-Heal Failing Tests"**:

```
You are a Playwright test healing agent for the eShop-demo repository.

1. Clone https://github.com/krantikdas/eShop-demo.git (or pull latest if already cloned)
2. Checkout the branch: {branch_name}
3. Navigate to tests/playwright
4. Run: npm install
5. Run: npx playwright test 2>&1
6. If all tests pass, report "All 76 tests passing — no healing needed"
7. If any tests fail:
   a. Analyze each failure's error message and stack trace
   b. Identify the root cause (API contract change, renamed fields, changed status codes, etc.)
   c. Update the test assertions to match the new API behavior
   d. Add a "// HEALED:" comment on each changed line explaining what changed and why
   e. Run: npx playwright test (verify the fix)
   f. If all tests pass: commit with message "fix(tests): self-heal tests to match new API contract" and push
   g. If tests still fail: report the remaining failures for manual review
8. Summarize what was healed: number of tests fixed, what changed, which files were modified
```

---

## Demo 1 — Step-by-Step Script: Automated Regression on Code Change

**Narrative:** *"Watch what happens when a developer commits a code change — the full regression suite runs automatically."*

### Step 1: Show the Starting Point (1 min)
- Open the GitHub repo in browser
- Show the `tests/playwright/specs/` folder — *"We have 76 automated integration tests covering 4 microservices"*
- Show the Allure report at `https://krantikdas.github.io/eShop-demo/` — *"This is our current test dashboard — 100% passing"*

### Step 2: Make a Code Change (1 min)
- In Devin, say: *"Make a small documentation change to the README in eShop-demo and open a PR to main"*
- Or manually: open any file in `src/` in GitHub, click Edit, add a comment like `// Performance optimization v2`, commit to a new branch, and create a PR

### Step 3: Watch CI Trigger Automatically (2-3 min)
- Switch to the **GitHub Actions** tab
- *"Notice the 'Integration Tests (Playwright)' workflow has been triggered automatically by the PR"*
- Click into the running workflow
- Show the live logs — you'll see:
  - `Install mock server dependencies`
  - `Install Playwright test dependencies`
  - `Run integration tests` — this shows test-by-test progress
  - `Generate Allure report`
  - Artifact uploads

### Step 4: Show the Results (1 min)
- Once complete, show the green checkmark on the workflow
- Go back to the PR page — show the green CI status check: *"Integration Tests (Playwright) — All checks passed"*
- Click into the workflow run, scroll to **Artifacts**, show:
  - `playwright-html-report` — Playwright's built-in report
  - `allure-report` — Rich visual dashboard
  - `allure-results` — Raw data for trend analysis

### Step 5: Show the Allure Report (1 min)
- If this was a push to main (after merge): open `https://krantikdas.github.io/eShop-demo/`
- If this was a PR: download the `allure-report` artifact, unzip, open `index.html`
- Walk through:
  - **Overview** — 76 tests, 100% pass rate, duration
  - **Suites** — 7 test suites broken down by service
  - **Graphs** — visual pass/fail distribution
  - **Timeline** — execution timeline showing test ordering

### Key Talking Points for Demo 1
- *"Zero manual effort — the developer just pushes code and gets instant feedback"*
- *"76 tests covering Catalog, Basket, Ordering, Webhooks, and cross-service flows"*
- *"Full traceability — every test maps back to a specific API endpoint"*
- *"Rich reporting — not just pass/fail, but traces, timing, and visual dashboards"*

---

## Demo 2 — Step-by-Step Script: Self-Healing on Breaking Change

**Narrative:** *"Now watch what happens when a developer makes a breaking API change — Devin detects the failures and fixes the tests automatically."*

### Step 1: Introduce the Breaking Change (1 min)
- In Devin or directly in GitHub, make a breaking change to the mock server. The pre-prepared change is:
  - Open `tests/mock-server/server.js`
  - On the catalog list endpoint, change the pagination response fields:
    ```js
    // BEFORE:
    res.json({ pageIndex, pageSize, count: totalItems, data });

    // AFTER:
    res.json({ pageIndex, pageSize, totalCount: totalItems, items: data });
    ```
  - *"This simulates a backend developer renaming API response fields — a common real-world scenario"*
- Commit and push to a new branch, open a PR

### Step 2: Watch CI Fail (2-3 min)
- Switch to **GitHub Actions** tab
- The workflow triggers automatically
- *"Watch the test run — you'll see failures appearing as the tests hit the renamed fields"*
- Once complete, show the **red X** on the workflow
- Click into the run, show the failure summary: **13 out of 76 tests failed**
- Show a specific error message: *"Expected `body.count` to be greater than 0, but received `undefined` — because the field was renamed to `totalCount`"*

### Step 3: Trigger Self-Healing via Devin (1 min)
- Switch to the **Devin** tab
- Run the **"Self-Heal Failing Tests"** Playbook with the branch name
- Or type manually: *"The integration tests are failing on branch {branch_name} in eShop-demo. Analyze the failures and fix the tests."*

### Step 4: Watch Devin Fix the Tests (2-3 min)
- Devin will:
  1. Clone/pull the repo and checkout the branch
  2. Run the tests — sees 13 failures
  3. Read each error message: `body.count is undefined`, `body.data is undefined`
  4. Understand the pattern: `count` was renamed to `totalCount`, `data` was renamed to `items`
  5. Update all 13 test assertions across 4 spec files
  6. Add `// HEALED:` comments explaining each change
  7. Run tests again — all 76 pass
  8. Commit and push the fix

### Step 5: Watch CI Re-Run and Pass (2-3 min)
- Switch back to **GitHub Actions**
- *"The push from Devin has triggered CI again automatically"*
- Watch the workflow run — this time all 76 tests pass
- Show the green checkmark on the PR

### Step 6: Show the Healed Code (1 min)
- Open the PR diff in GitHub
- Show the healing commit — each changed line has a `// HEALED:` comment:
  ```typescript
  // HEALED: API renamed 'count' -> 'totalCount' and 'data' -> 'items'
  expect(body.totalCount).toBeGreaterThan(0);
  expect(body.items.length).toBeLessThanOrEqual(10);
  ```
- *"Devin didn't just blindly fix the assertions — it understood the API contract change and documented it"*

### Key Talking Points for Demo 2
- *"13 tests broke from a single API change — Devin fixed all 13 in under a minute"*
- *"The fixes are documented with HEALED comments — full audit trail"*
- *"No human intervention required — developer pushes a breaking change, Devin adapts the tests"*
- *"This works for any type of API contract change: renamed fields, changed status codes, new required fields, modified response structures"*

---

## Pre-Prepared Breaking Changes (Ready to Use in Demo)

If you want a quick demo without editing code live, these changes are pre-built in **PR #2**:

| Change | Impact | Tests Affected |
|--------|--------|----------------|
| `count` -> `totalCount` in pagination responses | 6 tests fail on `body.count` being undefined | B01, B04, G01, G03, G16 |
| `data` -> `items` in pagination responses | 12 tests fail on `body.data` being undefined | B01-B05, B08, B09, B12, G01, G03, G04, G16, E01 |
| DELETE returns 200+body instead of 204 | 1 test fails on status code check | A10 |

**Total: 13 unique test failures across 4 spec files.**

---

## Creating the Playbooks in Devin

### How to Create a Playbook

1. Go to **Devin Settings** > **Playbooks** (or `https://app.devin.ai/playbooks`)
2. Click **"Create Playbook"**
3. Enter the name (e.g., "Run Integration Tests")
4. Paste the instructions from the relevant section above
5. Save

### How to Trigger a Playbook

1. Open a new Devin session
2. Click **"Run Playbook"** or type the playbook name
3. Fill in any parameters (e.g., `{branch_name}`)
4. Devin executes the instructions automatically

---

## Demo Timeline

| Time | Action |
|------|--------|
| 0:00 | Introduction — show the repo, test suite, Allure dashboard |
| 1:00 | **Demo 1 Start** — make a code change, create PR |
| 2:00 | Show CI triggering automatically |
| 4:00 | Show green CI, Allure report with 76/76 passed |
| 5:00 | **Demo 2 Start** — introduce breaking API change |
| 6:00 | Show CI failing with 13 test failures |
| 7:00 | Trigger Devin self-healing Playbook |
| 9:00 | Show Devin fixing tests, pushing, CI re-running |
| 11:00 | Show green CI, healed code with HEALED comments |
| 12:00 | Summary — key value props, Q&A |

**Total demo time: ~12 minutes**

---

## File Structure Reference

```
tests/
├── mock-server/
│   ├── server.js              # Express mock for all 4 microservices
│   ├── data/catalog-seed.json # 101 products from actual catalog
│   └── package.json
├── playwright/
│   ├── playwright.config.ts   # Auto-starts mock server, Allure reporter configured
│   ├── helpers/test-data.ts   # Shared test utilities and factories
│   ├── specs/
│   │   ├── catalog/
│   │   │   ├── catalog-crud.spec.ts    # 14 tests (A01-A14)
│   │   │   └── catalog-query.spec.ts   # 12 tests (B01-B12)
│   │   ├── basket/
│   │   │   └── basket-operations.spec.ts # 8 tests (C01-C08)
│   │   ├── ordering/
│   │   │   └── order-lifecycle.spec.ts   # 12 tests (D01-D12)
│   │   ├── integration/
│   │   │   └── cross-service.spec.ts     # 8 tests (E01-E08)
│   │   ├── webhooks/
│   │   │   └── webhook-management.spec.ts # 6 tests (F01-F06)
│   │   └── edge-cases/
│   │       └── error-handling.spec.ts     # 16 tests (G01-G16)
│   └── package.json
.github/workflows/
└── integration-tests.yml      # CI: test + Allure report + GitHub Pages deploy
```

---

## Quick Commands

```bash
# Run all tests against mock server
cd tests/playwright && npm install && npm test

# Run with tracing
npm run test:trace

# Run and generate Allure report
npm run test:allure

# Open Allure dashboard in browser
npm run allure:serve

# Run against a live environment
BASE_URL=https://your-env.com npx playwright test

# View Playwright HTML report
npx playwright show-report

# Trigger via GitHub Actions (manual)
# Go to Actions tab > Integration Tests > Run workflow > Select environment
```
