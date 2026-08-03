# ubulu_assessment — OrangeHRM Playwright Test Suite

End-to-end tests for the [OrangeHRM OS 5.9 demo application](https://opensource-demo.orangehrmlive.com),
written with [Playwright Test](https://playwright.dev/) and TypeScript. The suite covers the Login
feature and the PIM "Add Employee" flow (add → verify via search).

## Tech stack

- [Playwright Test](https://playwright.dev/) `^1.62.1` (Chromium, Firefox, WebKit)
- TypeScript
- GitHub Actions CI ([.github/workflows/playwright.yml](.github/workflows/playwright.yml)) — runs on
  push/PR to `main`/`master`, publishes the HTML report as a build artifact

## Getting started

```bash
npm install
npx playwright install --with-deps   # first run only, installs browser binaries
```

Run the full suite (all three browser projects):

```bash
npx playwright test
```

Useful variants:

```bash
npx playwright test tests/login/            # login tests only
npx playwright test tests/employee/         # employee tests only
npx playwright test --project=chromium      # single browser
npx playwright test --headed                # watch it run
npx playwright test --ui                    # interactive UI mode
npx playwright show-report                  # open the last HTML report
```

There is no app to stand up locally — every test runs against the public, shared OrangeHRM demo
instance, so no `.env`, base URL, or local server configuration is required.

## Project structure

This repo follows a **plan → seed → page-object → spec** workflow, with framework code kept as
top-level sibling folders to `tests/` (rather than nested inside it) so specs stay focused on
scenarios:

```
spec/                    Test plans (Markdown) — Application Overview + numbered scenarios
  orangehrm-login.plan.md
  orangehrm-add-employee.plan.md
tests/                   Spec files only, grouped by feature
  login/
    valid-login.spec.ts
    invalid-login.spec.ts
  employee/
    add-employee.spec.ts
  seed.spec.ts            Used by the Playwright MCP planner/generator tools to prime browser state
pages/                    Page Object Model classes
  LoginPage.ts
  DashboardPage.ts
  PimAddEmployeePage.ts
  PimEmployeeListPage.ts
fixtures/
  fixtures.ts              Wires page objects into custom Playwright fixtures
data/                     Static, reusable test data
  login/credentials.ts
  common/urls.ts
utils/                    Helper/generator functions (not static data)
  employee.ts              generateUniqueEmployeeName / generateUniqueEmployeeId
playwright.config.js
```

- **Plans first**: each feature gets a `spec/*.plan.md` describing the observed app behavior
  (selectors, validation text, edge cases) followed by numbered test scenarios with expected
  outcomes. Specs are implemented directly from these plans.
- **Specs** import page objects through `fixtures/fixtures.ts` (`import { test, expect } from
  '../../fixtures/fixtures'`) rather than instantiating page objects inline, so tests read as
  business steps, not DOM plumbing.
- **Data vs. utils**: fixed literals (credentials, URLs) live in `data/`; anything that *generates*
  a value (unique names, unique IDs) lives in `utils/`, since it isn't a static record.

## Test coverage

### Login (`spec/orangehrm-login.plan.md`, `tests/login/`)

- Valid login and logout, including confirming a terminated session can't reach the dashboard by
  direct URL.
- Invalid credentials (wrong password, wrong username, both wrong), empty-field validation,
  whitespace-only input treated as empty, password case-sensitivity, a SQL-injection-style payload
  safely rejected, and repeated failed attempts not locking the account.

### Add Employee (`spec/orangehrm-add-employee.plan.md`, `tests/employee/`)

- **Primary flow**: add an employee with unique, run-scoped data, verify the saved record on its
  Personal Details page, then confirm it's immediately findable via PIM search with an exact
  single-record match.
- **Edge cases**: duplicate Employee Id rejected then recovered with a fresh id, empty
  First/Last Name validation, and a search with zero matches shows the correct empty state.

## High-risk flow: why "Add Employee"

**Employee creation was selected as the high-risk workflow** because it is a core business process
that many other HR functions depend on. A failure at this stage can prevent employee onboarding and
impact downstream modules such as leave, attendance, payroll, performance management, and user
administration. Validating that a newly created employee is successfully saved *and* searchable
gives confidence that the application's primary data management workflow is functioning correctly —
which is why it gets both a happy-path end-to-end test and dedicated edge-case coverage (duplicate
IDs, empty required fields, no-match search), rather than just a single smoke test.

## A source of flakiness I actually hit, and how I handled it

During implementation, `page.goto()` called immediately after a login-triggered navigation
intermittently threw `net::ERR_ABORTED` — reproducible consistently for one specific test even under
a single worker (so it wasn't just cross-worker contention). It happened even after asserting
`expect(page).toHaveURL(DASHBOARD_URL)` was *missing* beforehand — Playwright's `goto()` was racing
the SPA's own post-login redirect/render, and the login-triggered navigation would sometimes still be
in flight when the next `goto()` fired, causing the browser to abort it.

**Fix:** treat `await expect(page).toHaveURL(DASHBOARD_URL)` as a required assertion — not just a
nice-to-have check — immediately after every `login()` call and before any subsequent
`page.goto()`. Awaiting that assertion lets Playwright's auto-retrying wait absorb the in-flight
navigation before issuing the next one. Every test that had this assertion in place navigated
cleanly; every test that skipped it hit the abort. This is now applied consistently across
`tests/login/valid-login.spec.ts` and `tests/employee/add-employee.spec.ts`.

A second, related source of flakiness is structural rather than a one-off bug: the demo app's
**Employee Id auto-suggestion is not guaranteed unique**. The next-id value is fetched fresh per
page load against a shared, `fullyParallel`, continuously-changing dataset (other users, other CI
runs, concurrent workers), so two Add Employee page loads can be handed the same suggested id, and
whichever one saves second gets a validation error. This is handled by
`PimAddEmployeePage.saveWithRetry()` ([pages/PimAddEmployeePage.ts](pages/PimAddEmployeePage.ts)):
click Save, and if the `Employee Id already exists` error appears, generate a fresh numeric id and
retry, up to 3 attempts, rather than failing the test on the first collision. Employee/first/last
names are similarly generated per run via `generateUniqueEmployeeName()`
([utils/employee.ts](utils/employee.ts)) so search assertions can't accidentally match a stale row
left over from an earlier run.

## What I would do differently against a dedicated test environment with seeded data

This suite runs against a public, shared, continuously-mutating demo instance with no reset
mechanism and no API/DB access — which shapes several choices below. Against a dedicated environment
with seeded, controllable data, I would:

- **Use deterministic test data.** Instead of generating unique employee names with timestamps or
  random tokens, I'd use seeded fixtures with known users, departments, and leave records. This
  makes tests easier to debug and produces consistent, reviewable results across runs.
- **Perform full CRUD validation.** In the shared demo I avoid modifying or deleting existing
  records where possible, since other users/tests depend on that data. In a dedicated environment
  I'd create, update, verify, and delete records within the same test to fully validate the
  business workflow end to end.
- **Reset test state between runs.** I'd use database seeding, API endpoints, or environment reset
  scripts to restore the application to a known baseline before each test suite run, eliminating
  order-dependence and cross-run interference between test executions.
- **Validate data persistence beyond the UI.** Beyond verifying UI changes, I'd confirm data is
  correctly persisted by querying the application's API or database directly where appropriate,
  rather than trusting the UI as the only source of truth.
- **Increase coverage of edge cases.** With predictable data I'd expand the data-driven tests to
  cover boundary values, duplicate records, special characters, maximum field lengths, and
  permission-based scenarios.
- **Add cross-role end-to-end scenarios.** With dedicated accounts and stable data, I'd validate
  workflows spanning multiple user roles — for example, an employee submitting a leave request
  followed by an administrator approving it.

## Notes on the shared demo environment

- The app is a live, publicly shared instance — data (including employee counts) changes between
  and during test runs from other users and CI jobs, independent of this suite. Tests are written to
  tolerate that: assertions target the specific run-generated record rather than absolute counts.
- Retries are disabled locally and set to 2 on CI (`playwright.config.js`) as a safety net for
  transient network/demo-instance flakiness, but the collision-handling described above is a
  deliberate design choice, not a substitute for retries.
