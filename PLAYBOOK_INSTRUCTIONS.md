# Devin Playwright Integration Testing Playbook

## Overview

This document describes how to use Devin as an automated Playwright testing agent triggered by code commits to the eShop-demo repository. It covers the end-to-end demo flow for clients.

---

## Demo Flow: Code Commit Triggers Integration Tests

### What Happens Automatically (GitHub Actions)

When a developer pushes code to `main` or opens a PR that modifies `src/` or `tests/`:

1. **GitHub Actions** triggers the `Integration Tests (Playwright)` workflow
2. The workflow installs the mock server and Playwright dependencies
3. **76 integration tests** run automatically against the mock server
4. HTML report and trace artifacts are uploaded to GitHub Actions
5. PR gets a green/red check status

This is already configured in `.github/workflows/integration-tests.yml`.

### What Devin Adds on Top (The Agent Layer)

For a richer demo, use Devin Playbooks to go beyond basic CI:

---

## Playbook 1: Run Integration Tests

**Trigger:** Manual or on-demand via Devin UI/API

**Instructions for Devin:**
```
Clone https://github.com/krantikdas/eShop-demo.git
Navigate to tests/playwright
Run: npm install
Run: npx playwright test --trace on
Summarize the results: total tests, passed, failed, duration
If any tests fail, analyze the trace files and report root cause
Generate an HTML report screenshot
```

---

## Playbook 2: Run Tests Against a Live Environment

**Trigger:** When a SIT/QA/UAT environment is available

**Instructions for Devin:**
```
Clone https://github.com/krantikdas/eShop-demo.git
Navigate to tests/playwright
Run: npm install
Run: BASE_URL={environment_url} npx playwright test --trace on
Summarize results with environment context
Compare results to last known baseline
Report any environment-specific failures vs test logic failures
```

**Environment URLs (to be configured as Devin secrets):**
- SIT: `SIT_BASE_URL`
- QA: `QA_BASE_URL`
- UAT: `UAT_BASE_URL`
- PROD (smoke): `PROD_BASE_URL`

---

## Playbook 3: Analyze Test Failures and Self-Heal

**Trigger:** When CI reports test failures on a PR

**Instructions for Devin:**
```
Check the PR at {pr_url} for failed integration test checks
Download the trace artifacts from the failed GitHub Actions run
Analyze each failure: is it a test issue or a code issue?
If test issue: fix the test and push a commit to the PR branch
If code issue: create a detailed bug report comment on the PR
Re-run the tests to verify the fix
```

---

## Playbook 4: Generate New Tests for Code Changes

**Trigger:** When new API endpoints are added

**Instructions for Devin:**
```
Review the diff on PR {pr_url}
Identify any new or modified API endpoints in src/
For each new endpoint, generate Playwright integration tests following the existing patterns in tests/playwright/specs/
Add tests to the appropriate spec file (catalog/, ordering/, basket/, webhooks/)
Run the full test suite to ensure no regressions
Push the new tests to the PR branch
```

---

## Client Demo Script (Step-by-Step)

### Prerequisites
- GitHub repo: `krantikdas/eShop-demo`
- Devin session connected to the repo

### Demo Steps

1. **Show the codebase** — Open the repo, show the microservices architecture (4 APIs)

2. **Show the test plan** — Open `INTEGRATION_TEST_PLAN.md`, walk through the 7 test categories

3. **Show the test code** — Browse `tests/playwright/specs/` to show the automated tests

4. **Trigger a test run** — Either:
   - Push a small code change to trigger GitHub Actions automatically
   - Or ask Devin: *"Run the integration tests on eShop-demo and report results"*

5. **Show results in real-time** — Watch Devin execute tests, see pass/fail in the terminal

6. **Show the CI integration** — Open the GitHub Actions tab, show the Integration Tests workflow passing

7. **Show the HTML report** — Download the artifact from GitHub Actions, open the Playwright HTML report

8. **Show trace analysis** — Click into a test trace to show the API call timeline, request/response details

9. **Demonstrate self-healing** — Introduce a deliberate test breakage, ask Devin to fix it

10. **Show multi-environment support** — Explain how `BASE_URL` switches between mock/SIT/QA/UAT/Prod

### Key Talking Points

| Feature | What to Show |
|---------|-------------|
| **Automated generation** | Devin reads .NET source code and generates TypeScript Playwright tests |
| **Mock server approach** | No live infrastructure needed — tests run anywhere |
| **CI integration** | GitHub Actions triggers on every push/PR |
| **Self-healing** | Devin can fix broken tests automatically |
| **Multi-environment** | Same tests run against mock, SIT, QA, UAT, Prod |
| **Traceability** | Every test maps back to source code endpoints |
| **Rich reporting** | HTML reports with traces, screenshots, timing |

---

## File Structure Reference

```
tests/
├── mock-server/
│   ├── server.js              # Express mock for all 4 microservices
│   ├── data/catalog-seed.json # 101 products from actual catalog
│   └── package.json
├── playwright/
│   ├── playwright.config.ts   # Auto-starts mock server, configurable BASE_URL
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
└── integration-tests.yml      # CI workflow (push/PR/manual trigger)
```

---

## Quick Commands

```bash
# Run all tests against mock server
cd tests/playwright && npm install && npm test

# Run with tracing
npm run test:trace

# Run against a live environment
BASE_URL=https://your-sit-env.com npx playwright test

# View HTML report
npx playwright show-report

# Trigger via GitHub Actions (manual)
# Go to Actions tab > Integration Tests > Run workflow > Select environment
```
