# Devin Playwright Integration Testing — Demo Playbooks

## Overview

This document provides two Devin Playbooks and step-by-step demo scripts for presenting automated integration testing to clients. The demos show how a code commit to GitHub triggers automated Playwright tests, and how Devin can self-heal failing tests.

---

## Prerequisites — What to Do Before the Demo

### Step P1: Merge PR #1 to `main` (One-Time Setup)

This must be done once before any demo. It puts the test suite and CI workflow on the `main` branch.

1. Open your browser and go to: `https://github.com/krantikdas/eShop-demo/pull/1`
2. You'll see the PR page. Scroll down to the green **"Merge pull request"** button at the bottom
3. Click **"Merge pull request"**
4. Click **"Confirm merge"**
5. You should see a purple "Merged" badge appear at the top of the PR

### Step P2: Verify GitHub Pages is Enabled

After merging, the CI will run on `main` and deploy the Allure report. To verify GitHub Pages is active:

1. Go to: `https://github.com/krantikdas/eShop-demo/settings/pages`
   - To get there manually: go to the repo page → click the **"Settings"** tab (gear icon, far right of the top tabs) → scroll down the left sidebar and click **"Pages"**
2. Under "Build and deployment", you should see **Source: GitHub Actions**
3. Wait 3-5 minutes after the merge for CI to finish
4. Open: `https://krantikdas.github.io/eShop-demo/`
5. You should see the Allure test dashboard — this is your baseline report

### Step P3: Open These Browser Tabs Before the Demo

Open 4 tabs in your browser:

| Tab | URL | What It Shows |
|-----|-----|--------------|
| 1. GitHub Repo | `https://github.com/krantikdas/eShop-demo` | The source code |
| 2. GitHub Actions | `https://github.com/krantikdas/eShop-demo/actions` | CI workflow runs |
| 3. Allure Report | `https://krantikdas.github.io/eShop-demo/` | Live test dashboard |
| 4. Devin | `https://app.devin.ai` | The AI agent |

### Step P4: Create the Playbooks in Devin (One-Time Setup)

You need to create 2 Playbooks in Devin. Do this once before the demo:

**Creating Playbook 1 — "Run Integration Tests":**
1. Go to: `https://app.devin.ai/playbooks`
   - Or from the Devin home screen: click your profile/settings icon → click **"Playbooks"**
2. Click the **"Create Playbook"** button (usually top-right)
3. In the **Name** field, type: `Run Integration Tests`
4. In the **Instructions** field, paste this text:
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
5. Click **"Save"**

**Creating Playbook 2 — "Self-Heal Failing Tests":**
1. Still on the Playbooks page, click **"Create Playbook"** again
2. In the **Name** field, type: `Self-Heal Failing Tests`
3. In the **Instructions** field, paste this text:
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
4. Click **"Save"**

You now have both Playbooks ready. You can verify them by going back to the Playbooks list — you should see both entries.

---

## DEMO 1 — Automated Regression on Code Change

**What you're showing:** *A developer makes a code change, pushes it, and the full regression suite runs automatically with results visible in a rich dashboard.*

---

### Demo 1, Step 1: Show the Test Suite in GitHub (1 min)

**What you say:** *"Let me show you the test suite we have in this repository."*

1. Switch to your **GitHub Repo tab** (`https://github.com/krantikdas/eShop-demo`)
2. You'll see the repo's file list on the main page. Click on the **`tests`** folder
3. Click on the **`playwright`** folder
4. Click on the **`specs`** folder
5. You'll now see 7 subfolders:
   ```
   basket/
   catalog/
   edge-cases/
   integration/
   ordering/
   webhooks/
   ```
6. **What you say:** *"We have 76 automated Playwright integration tests organized into 7 categories, covering all 4 microservices — Catalog, Basket, Ordering, and Webhooks."*
7. Click into **`catalog/`** to show the spec files inside — you'll see `catalog-crud.spec.ts` and `catalog-query.spec.ts`
8. Click on **`catalog-crud.spec.ts`** to show actual test code — scroll through briefly to show the test structure
9. Click the browser **Back** button twice to return to the `specs/` folder

### Demo 1, Step 2: Show the Allure Report Baseline (1 min)

**What you say:** *"And here's our live test dashboard — this updates automatically after every test run."*

1. Switch to your **Allure Report tab** (`https://krantikdas.github.io/eShop-demo/`)
2. You'll see the Allure dashboard with:
   - A large number **"76"** (total tests) at the top
   - A green circle showing 100% pass rate
   - Test suite breakdown on the left sidebar
3. **What you say:** *"76 tests, 100% passing. This is our current baseline. Now let's see what happens when a developer makes a code change."*

### Demo 1, Step 3: Make a Code Change in GitHub (1 min)

**What you say:** *"Now I'll simulate a developer making a small code change."*

**Option A — Do it via Devin (recommended for the demo):**
1. Switch to your **Devin tab** (`https://app.devin.ai`)
2. Type in the chat: *"Make a small comment change to src/Catalog.API/Program.cs in eShop-demo and open a PR to main"*
3. Devin will edit the file, create a branch, push, and open a PR
4. Move on to Step 4 while Devin works

**Option B — Do it manually in GitHub:**
1. Switch to your **GitHub Repo tab**
2. In the file list at the top, click on the **`src`** folder
3. Click on **`Catalog.API`**
4. Click on **`Program.cs`**
5. You'll see the file contents. Click the **pencil icon** (top-right of the file content area, next to the trash icon) to edit
6. Add a comment anywhere, e.g. on line 1 add: `// Performance optimization v2`
7. Scroll down to the bottom of the page. You'll see a section called **"Commit changes"**
8. Select **"Create a new branch for this commit and start a pull request"**
9. In the branch name field, type something like: `demo/code-change`
10. Click the green **"Propose changes"** button
11. On the next screen (Open a pull request), click the green **"Create pull request"** button
12. **What you say:** *"I've committed a code change and opened a Pull Request — just like a developer would in their normal workflow."*

### Demo 1, Step 4: Watch CI Trigger Automatically (2-3 min)

**What you say:** *"Now watch — the integration tests are triggered automatically by the Pull Request."*

1. Switch to your **GitHub Actions tab** (`https://github.com/krantikdas/eShop-demo/actions`)
   - To get here from any GitHub page: look at the **top tab bar** of the repo (Code, Issues, Pull requests, **Actions**, Projects, etc.) and click **"Actions"**
2. You'll see a list of workflow runs. At the very top, there should be a **new run** with:
   - A **yellow spinning circle** icon (meaning "in progress")
   - The name of your commit message
   - The workflow name: **"Integration Tests (Playwright)"**
3. **Click on that running workflow** (click the commit message text)
4. You'll see the workflow detail page. It shows a **job box** called **"Run Integration Tests"** with a yellow spinning icon
5. **Click on "Run Integration Tests"** to see the live logs
6. You'll see expandable steps on the left. The ones to point out:
   - **"Install mock server dependencies"** — sets up the Express mock server
   - **"Install Playwright test dependencies"** — installs Playwright and Allure
   - **"Run integration tests"** — this is where the tests actually run
7. Click on **"Run integration tests"** to expand the live log
8. **What you say:** *"You can see each test running in real-time — Catalog CRUD tests, Basket tests, Ordering lifecycle, cross-service integration, and so on."*
9. Wait for the run to complete (typically 2-3 minutes). The spinning icon will turn to a **green checkmark**

### Demo 1, Step 5: Show the CI Results (1 min)

**What you say:** *"All 76 tests passed. Let's look at the detailed results."*

1. After the workflow completes, you'll see a green checkmark next to **"Run Integration Tests"**
2. Scroll down the page — at the very bottom you'll see a section called **"Artifacts"**
3. You'll see 3 downloadable items:
   - **`allure-report`** — click to download (this is the visual dashboard)
   - **`allure-results`** — raw test data
   - **`playwright-html-report`** — Playwright's built-in report
4. **What you say:** *"The CI automatically generates three types of reports as downloadable artifacts."*

### Demo 1, Step 6: Show the PR with Green Check (1 min)

**What you say:** *"Let's go back to the Pull Request to see the status."*

1. Click the **"Pull requests"** tab at the top of the repo (or go to `https://github.com/krantikdas/eShop-demo/pulls`)
2. Click on the PR you created in Step 3
3. Scroll down to the **"Checks"** section (below the PR description)
4. You'll see: **"Integration Tests (Playwright) — All checks have passed"** with a green checkmark
5. **What you say:** *"The Pull Request now shows a green status check — the developer and reviewers can see at a glance that all integration tests pass."*

### Demo 1, Step 7: Show the Allure Report (1 min)

**What you say:** *"Now let's look at the rich visual test report."*

**If viewing the live GitHub Pages version** (after merging to main):
1. Switch to your **Allure Report tab** and refresh the page (`https://krantikdas.github.io/eShop-demo/`)
2. The report should now show the latest run data

**If viewing from the CI artifact** (during a PR, before merging):
1. Go back to the workflow run page (GitHub Actions → click the completed run)
2. Scroll to **Artifacts** at the bottom
3. Click **`allure-report`** to download it — a `.zip` file will download
4. Open your **Downloads** folder, find `allure-report.zip`, and **unzip** it (double-click on Mac, or right-click → Extract on Windows)
5. Open the unzipped folder, find **`index.html`**, and **double-click** to open it in your browser

6. The Allure dashboard shows:
   - **Overview page** — total tests (76), pass rate (100%), duration
   - Click **"Suites"** in the left sidebar — shows the 7 test categories (Catalog CRUD, Catalog Query, Basket, Orders, etc.)
   - Click **"Graphs"** in the left sidebar — shows visual charts of test status
   - Click **"Timeline"** in the left sidebar — shows when each test ran
   - Click on any individual test name to see its details: steps, duration, assertions
7. **What you say:** *"This gives us a complete visual breakdown — pass rates, timing, suite-by-suite analysis. Not just pass/fail, but rich actionable data."*

### Demo 1 Summary

**What you say:** *"So to summarise Demo 1: the developer pushed a code change, the integration tests ran automatically, all 76 passed, and we have a rich visual dashboard showing the results. Zero manual effort."*

---

## DEMO 2 — Self-Healing on Breaking Change

**What you're showing:** *A developer makes a breaking API change, tests fail, and Devin automatically detects the failures, fixes the tests, and pushes the fix — all without human intervention.*

---

### Demo 2, Step 1: Introduce the Breaking Change in GitHub (2 min)

**What you say:** *"Now I'm going to simulate something that happens all the time in real projects — a developer renames some API fields, which breaks the existing tests."*

1. Switch to your **GitHub Repo tab** (`https://github.com/krantikdas/eShop-demo`)
2. In the file list, click on **`tests`** folder
3. Click on **`mock-server`** folder
4. Click on **`server.js`** — this is the mock API server
5. Click the **pencil icon** (top-right of the file content) to edit the file
6. Use **Ctrl+F** (or Cmd+F on Mac) to open the find box. Search for: `count: totalItems, data`
7. You'll find a line that looks like:
   ```js
   res.json({ pageIndex, pageSize, count: totalItems, data });
   ```
8. Change it to:
   ```js
   res.json({ pageIndex, pageSize, totalCount: totalItems, items: data });
   ```
   (Replace `count:` with `totalCount:` and `data` with `items: data`)
9. Scroll down to the bottom of the page
10. Select **"Create a new branch for this commit and start a pull request"**
11. In the branch name field, type: `demo/breaking-change`
12. Click the green **"Propose changes"** button
13. On the next screen, click the green **"Create pull request"** button
14. **What you say:** *"I've just renamed two API response fields — 'count' to 'totalCount' and 'data' to 'items'. This is a very common real-world scenario."*

### Demo 2, Step 2: Watch CI Fail (2-3 min)

**What you say:** *"Let's watch what happens to the tests."*

1. Click the **"Actions"** tab at the top of the repo
   - Or go to: `https://github.com/krantikdas/eShop-demo/actions`
2. At the top of the list, you'll see a new workflow run with a **yellow spinning circle** (in progress)
3. **Click on the running workflow** (click the commit message text)
4. Click on the **"Run Integration Tests"** job box
5. Wait for it to complete — the icon will change from yellow to a **red X** (failed)
6. Click on the **"Run integration tests"** step to expand the log
7. Scroll through — you'll see red **FAILED** markers. Look for error messages like:
   ```
   Expected: greater than 0
   Received: undefined
   ```
8. **What you say:** *"13 out of 76 tests have failed. The tests expected a field called 'count' but it's now 'totalCount', so they get 'undefined'. This is exactly the kind of breakage that happens when backend teams refactor APIs."*
9. To show the failure summary: scroll to the top of the log output — it will show something like: **"63 passed, 13 failed"**

### Demo 2, Step 3: Trigger Self-Healing via Devin (1 min)

**What you say:** *"Now instead of a developer manually fixing all 13 tests, watch what happens when we ask Devin to handle it."*

1. Switch to your **Devin tab** (`https://app.devin.ai`)
2. **Option A — Using the Playbook:**
   - Click **"New Session"** (or use your current session)
   - Type: `Run the "Self-Heal Failing Tests" playbook on branch demo/breaking-change`
3. **Option B — Typing manually:**
   - Type: `The integration tests are failing on branch demo/breaking-change in krantikdas/eShop-demo. Analyze the failures and fix the tests to match the new API contract.`
4. Press **Enter** to send the message

### Demo 2, Step 4: Watch Devin Fix the Tests (2-3 min)

**What you say:** *"Watch Devin's terminal — it's analyzing each failure and understanding the pattern."*

1. In the Devin session, you'll see Devin:
   - Clone the repo and checkout the `demo/breaking-change` branch
   - Run the Playwright tests — it will see 13 failures
   - Read and analyze each error message
   - Open the test files and update the assertions
   - Add `// HEALED:` comments explaining each fix
   - Run the tests again to verify all 76 pass
   - Commit and push the fix
2. Devin will report back with a summary like: *"Fixed 13 tests across 4 files. Changed `body.count` to `body.totalCount` and `body.data` to `body.items`."*
3. **What you say:** *"Devin identified the pattern — two fields were renamed — and fixed all 13 tests automatically. It even added comments documenting what changed."*

### Demo 2, Step 5: Watch CI Re-Run and Pass (2-3 min)

**What you say:** *"Devin's push has triggered the CI again — let's see if the tests pass now."*

1. Switch to your **GitHub Actions tab** (`https://github.com/krantikdas/eShop-demo/actions`)
2. At the top of the list, you'll see a **new workflow run** triggered by Devin's push (yellow spinning circle)
3. **Click on the running workflow**
4. Click on the **"Run Integration Tests"** job box
5. Wait for it to complete — this time the icon should turn to a **green checkmark**
6. Click on **"Run integration tests"** to expand the log and verify: **"76 passed"**
7. **What you say:** *"All 76 tests are passing again. The entire cycle — failure detection, analysis, fix, verification — happened automatically."*

### Demo 2, Step 6: Show the Healed Code in the PR (1 min)

**What you say:** *"Let me show you exactly what Devin changed."*

1. Click the **"Pull requests"** tab at the top of the repo
   - Or go to: `https://github.com/krantikdas/eShop-demo/pulls`
2. Click on the PR for `demo/breaking-change`
3. Click the **"Files changed"** tab (next to "Conversation" and "Commits" tabs, near the top)
4. You'll see the diff view showing red (removed) and green (added) lines
5. Look for the test file changes — you'll see lines like:
   ```diff
   - expect(body.count).toBeGreaterThan(0);
   + // HEALED: API renamed 'count' -> 'totalCount'
   + expect(body.totalCount).toBeGreaterThan(0);
   ```
6. **What you say:** *"Devin didn't just blindly fix the code — it understood the API contract change and added HEALED comments documenting exactly what changed and why. This gives you a full audit trail."*

### Demo 2 Summary

**What you say:** *"To summarise Demo 2: a developer renamed two API fields, 13 tests broke, Devin detected the failures, understood the pattern, fixed all 13 tests with documentation, and pushed the fix — all automatically. This is the self-healing capability."*

---

## Pre-Prepared Breaking Changes (Ready to Use in Demo)

If you want a quick demo without editing code live, these changes are pre-built in **PR #2** (`https://github.com/krantikdas/eShop-demo/pull/2`):

| Change | Impact | Tests Affected |
|--------|--------|----------------|
| `count` -> `totalCount` in pagination responses | 6 tests fail on `body.count` being undefined | B01, B04, G01, G03, G16 |
| `data` -> `items` in pagination responses | 12 tests fail on `body.data` being undefined | B01-B05, B08, B09, B12, G01, G03, G04, G16, E01 |
| DELETE returns 200+body instead of 204 | 1 test fails on status code check | A10 |

**Total: 13 unique test failures across 4 spec files.**

---

## Demo Timeline

| Time | Action | Where to Look |
|------|--------|---------------|
| 0:00 | Introduction — show the repo and test suite | GitHub Repo tab |
| 1:00 | Show the Allure baseline report | Allure Report tab |
| 2:00 | **Demo 1** — make a code change, create PR | GitHub Repo tab |
| 3:00 | Show CI triggering automatically | GitHub Actions tab |
| 5:00 | Show green CI, download Allure report, walk through dashboard | GitHub Actions tab → downloaded report |
| 6:00 | **Demo 2** — edit server.js to rename API fields, create PR | GitHub Repo tab |
| 8:00 | Show CI failing with 13 test failures | GitHub Actions tab |
| 9:00 | Trigger Devin self-healing Playbook | Devin tab |
| 11:00 | Show Devin fixing tests, pushing, CI re-running | Devin tab → GitHub Actions tab |
| 13:00 | Show green CI, walk through HEALED code in PR diff | GitHub Actions tab → PR "Files changed" tab |
| 14:00 | Summary — key value props, Q&A | — |

**Total demo time: ~15 minutes**

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
