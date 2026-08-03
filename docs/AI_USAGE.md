# AI Usage

This assessment was built with [Claude Code](https://claude.com/claude-code) (Anthropic's CLI
agent, model: Claude Sonnet 5) as the primary development tool, plus the Claude API directly for
one standalone utility. This document explains where and how AI was used across the three
deliverables in this repo, what was AI-generated vs. human-directed, and how output was verified.

## 1. Playwright test suite (`spec/`, `tests/`, `pages/`, `fixtures/`, `data/`, `utils/`)

Built with Claude Code driving the [`@playwright/test` MCP server](.mcp.json) (`playwright
run-test-mcp-server`), using three purpose-built sub-agents defined in
[.claude/agents/](.claude/agents/):

| Agent | Role |
|---|---|
| [playwright-test-planner](.claude/agents/playwright-test-planner.md) | Drives a real browser against the OrangeHRM demo, explores the flow under test, and writes a Markdown test plan (`spec/*.plan.md`) — Application Overview + numbered scenarios with expected outcomes, including negative/edge cases. |
| [playwright-test-generator](.claude/agents/playwright-test-generator.md) | Takes one scenario from a saved plan, drives the browser through it, and generates the corresponding `.spec.ts` file plus any page-object code it needs. |
| [playwright-test-healer](.claude/agents/playwright-test-healer.md) | Runs failing specs, inspects the actual DOM/network state via the browser tools, and fixes locators/assertions/timing issues rather than guessing from the source alone. |

**Workflow actually followed** (see commit history and
[[ubulu-assessment-repo-conventions]]): plan → seed page → generate spec → run → heal, repeated
per feature (Login, then Add Employee). Each plan was reviewed and edited by hand before specs
were generated from it; specs were run against all three browsers and iterated until green rather
than accepted on first pass.

**Where AI output was corrected or overridden, not just accepted:**
- The Employee Id collision behavior described in the README (
  [pages/PimAddEmployeePage.ts](../pages/PimAddEmployeePage.ts) `saveWithRetry()`) was a
  structural flakiness in the shared demo app's auto-suggested id that the generator did not
  anticipate — diagnosed and fixed by hand after repeated failures, not generated correctly the
  first time.
- The `net::ERR_ABORTED` race between `login()` and a following `page.goto()` (documented in the
  README under "A source of flakiness I actually hit") was root-caused and fixed manually; the
  generator's first pass did not include the required `await expect(page).toHaveURL(...)` guard.
- The folder restructuring (moving framework code out of `tests/` into top-level `pages/`,
  `fixtures/`, `data/`, `utils/` — see commit `09dbe3c`) was a human architectural decision applied
  after the generator's initial output, to keep `tests/` scoped to spec files only.
- `.env` handling and the GitHub Actions workflow ([.github/workflows/playwright.yml](../.github/workflows/playwright.yml))
  were reviewed for a `USERNAME` collision with a Windows OS environment variable of the same name
  ([[orangehrm-env-username-windows-collision]]) — an AI-blind-spot class of bug that only surfaced
  by actually running the suite locally.

**Verification:** every spec was executed with `npx playwright test` (not just read) across
Chromium/Firefox/WebKit before being considered done; CI (`.github/workflows/playwright.yml`) runs
the full suite sharded, plus a scheduled daily run, as an independent check beyond local execution.

## 2. AI critique of an AI-generated test suite (`docs/AI Critique Docs/`)

## How AI Was Used

### 1. Test Case Generation
- Generated an initial suite of functional test cases in Gemini from the feature specification.
- Applied standard test design techniques including:
  - Boundary Value Analysis (BVA)
  - Equivalence Partitioning (EP)
  - Positive and Negative Testing
- Produced structured test cases with consistent formatting.

### 2. Test Suite Review
- Assisted in analysing the generated test suite.
- Helped identify:
  - Duplicate test cases
  - Missing scenarios
  - Hallucinated behaviour
  - Implementation assumptions
- Supported the creation of the AI Critique Report.

### 3. Documentation
- Assisted in drafting:
  - Test Plan
  - AI Critique Report
  - Executive summaries
  - Conclusions and recommendations
- Improved grammar, structure, and overall readability of documentation.

## Human Review and Validation

All AI-generated content was manually reviewed to ensure:
- Alignment with the feature specification.
- Removal of unsupported assumptions and hallucinated behaviour.
- Elimination of redundant test cases.
- Addition of missing high-risk and edge-case scenarios.
- Technical accuracy and completeness.

No AI-generated output was accepted without manual verification.

## 3. Assertion generator utility (`docs/AI Utility/`)

# AI Usage Log — Assertion Generator Tool

**Date:** 2026-08-03
**AI assistant:** Claude (Anthropic), Claude Sonnet 5, via claude.ai
**Tool built:** `assertion_generator.js` / `assertion_generator.py`

## Summary

Used Claude to design and build a CLI script that calls the Anthropic API to
generate REST Assured (Java) or Postman (JS) test assertions from a sample
API response — covering status code, headers, JSON schema, and field-level
validations.

## Process

1. Asked Claude for small QA task ideas suited to an LLM-calling script; selected the assertion generator.
2. Claude wrote the initial Python version, then a Node.js port on request.
3. Simplified on request: dropped the `--endpoint` flag and switched output to always write a `.txt` file automatically.
4. Verified with `py_compile` / `node --check` and `--dry-run` prompt inspection. 

## Summary

| Deliverable | AI role | Human role |
|---|---|---|
| Playwright suite | Explored the app, drafted plans, generated specs/page objects, attempted fixes | Reviewed/edited every plan, diagnosed structural flakiness (id collisions, navigation race) AI didn't catch, restructured the framework layout, verified via real cross-browser runs and CI |
| AI critique docs | N/A — Claude Code was used only as the writing tool | Authored the critique end-to-end: manually assessed a separately AI-generated test suite against traceability/accuracy/coverage/redundancy/risk criteria |
| Assertion generator | Generates assertions from a sample response, per explicit anti-hallucination rules in its system prompt | Designed the prompt/guardrails, chose the two output formats, added `--dry-run` for auditability |

In every deliverable, AI output was treated as a draft: plans were edited before implementation,
generated specs were run (not just read) before being trusted, and a full critique exercise was
performed specifically to document where AI-generated tests go wrong so the same failure modes
could be guarded against elsewhere in this repo.
