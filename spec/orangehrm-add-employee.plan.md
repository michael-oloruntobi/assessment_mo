# OrangeHRM Add Employee & Search Feature Test Plan

## Application Overview

This test plan covers the PIM "Add Employee" flow of the OrangeHRM OS 5.9 demo application
(https://opensource-demo.orangehrmlive.com) and verifying a newly added employee is findable via
PIM > Employee List search. It was built from direct, live exploration of the running app (logged
in as Admin/admin123), not from the raw recorder trace previously in `tests/seed.spec.ts` — that
file has been reduced to a minimal login-only seed used to set up the browser state.

### Add Employee form (`/web/index.php/pim/addEmployee`)

Reached via the 'PIM' top-nav link -> Employee List page -> ' Add' button (accessible name has a
leading space/icon).

- Optional profile photo upload ('Choose File', accepts jpg/.png/.gif up to 1MB) — out of scope.
- `Employee Full Name*` group: `First Name` textbox, `Middle Name` textbox (optional), `Last Name`
  textbox.
- `Employee Id` textbox — **auto-populated on page load with the next sequential numeric id** (e.g.
  '0416', then '0417', '0420' on later loads — observed incrementing across my exploration session
  as other data was added). The field is editable.
- `Create Login Details` checkbox (unchecked by default; toggles username/password creation fields
  when checked) — out of scope for this plan.
- `Cancel` and `Save` buttons, with a `* Required` legend.

**Confirmed validation behavior:** Clicking 'Save' with First Name and Last Name both empty shows a
`Required` message directly beneath each of those two fields (matching the pattern used on the
Login form); the page does not navigate away. Employee Id has no independent "Required" indicator
since it is always pre-filled.

**Confirmed Employee Id collision behavior:** If the value in the `Employee Id` field (whether left
at its auto-populated value or manually overwritten) matches an id already assigned to another
employee, clicking 'Save' shows an inline error reading exactly **`Employee Id already exists`**
immediately below the `Employee Id` field. The page stays on the Add Employee form, and the already
-entered First/Middle/Last Name values are preserved (not cleared). I reproduced this directly by
saving an employee (auto id '0416'), then deliberately reusing '0416' for a second employee — the
error appeared verbatim, and after overwriting the Employee Id field with a fresh unused numeric
value ('998877') and clicking 'Save' again, the save succeeded immediately.

This is a real, non-hypothetical risk for automated tests, not just a hardcoded-data problem: this
is a shared, actively-changing, `fullyParallel` demo instance. The next-id suggestion is fetched
per page load, so two workers/tests loading the Add Employee form around the same moment can be
handed the *same* suggested id, and whichever saves second collides. **I observed this data churn
directly while exploring**: the Employee List's total record count changed from 23 -> 26 across a
few page loads during this session, including a row (`0417 dffdfd dffdfdf`) that I did not create,
confirming other processes are writing to this same dataset concurrently.

**Confirmed success behavior:** On successful save, the app navigates to
`/web/index.php/pim/viewPersonalDetails/empNumber/<n>` (a numeric employee number assigned by the
backend, distinct from the user-facing Employee Id). This page shows a heading with the employee's
full name (`"<First> <Last>"`), a tab strip (Personal Details, Contact Details, Emergency Contacts,
Dependents, Immigration, Job, Salary, Tax Exemptions, Report-to, Qualifications, Memberships), and a
Personal Details section that redisplays `First Name` / `Middle Name` / `Last Name` and
`Employee Id` (plus other fields not set by Add Employee, e.g. Nickname, Other Id).

### Employee List / search page (`/web/index.php/pim/viewEmployeeList`)

This is also the PIM module's landing page.

- A filter panel with: `Employee Name` (autocomplete textbox, placeholder 'Type for hints...'),
  `Employee Id` textbox, `Employment Status` dropdown, `Include` dropdown, `Supervisor Name`
  (autocomplete), `Job Title` dropdown, `Sub Unit` dropdown, and `Reset` / `Search` buttons.
- Typing into `Employee Name` opens a live `listbox` of matching `option`s (e.g. typing a unique
  generated name showed exactly one option, `"<First> <Last>"`); clicking an option fills the box
  with the full name. Clicking 'Search' is what actually applies the filter — typing/selecting alone
  does not filter the table.
- Above the results `table` is a record-count line whose wording changes with the count: **plural**
  `"(N) Records Found"` for N != 1 (e.g. `"(26) Records Found"`), **singular**
  `"(1) Record Found"` for exactly one match (confirmed live), and **`"No Records Found"`** (table
  renders with no data rows) when nothing matches.
- Results table columns: checkbox, `Id`, `First (& Middle) Name`, `Last Name`, `Job Title`,
  `Employment Status`, `Sub Unit`, `Supervisor`, `Actions`.
- Searching for a run-unique name I had just added returned `"(1) Record Found"` with exactly the
  expected row — confirming search precision is reliable *only* when the name is actually unique
  in this shared dataset, reinforcing why hardcoded literal test names are unsafe here.

### Test Data & Implementation Notes

- No PIM page objects exist yet. New page objects should be added (e.g. `PimAddEmployeePage` with
  firstNameInput/middleNameInput/lastNameInput/employeeIdInput/saveButton/duplicateIdError/
  requiredFirstNameError/requiredLastNameError locators, and `PimEmployeeListPage` with
  employeeNameSearchInput/searchButton/resultsTable/recordCountText/noRecordsFoundMessage), wired
  into `fixtures/fixtures.ts` following the pattern of `pages/LoginPage.ts` /
  `pages/DashboardPage.ts`.
- A test-data helper (e.g. `utils/employee.ts`) should generate a unique `{ firstName,
  lastName }` pair per test invocation (e.g. suffixing a base string with `Date.now()` and/or
  `test.info().workers`/a random token, to stay collision-safe under `fullyParallel` execution), and
  a function to produce a fresh unique numeric Employee Id candidate for retries.
- A `saveWithRetry()` helper on `PimAddEmployeePage` should encapsulate: click Save -> if the
  `Employee Id already exists` error becomes visible, generate a new unique numeric id, fill it in,
  click Save again -> repeat up to a small bounded number of attempts (e.g. 3) -> otherwise the
  first Save is the result. All scenarios that add an employee should use this helper rather than a
  bare `saveButton.click()`.
- The **same** generated `{ firstName, lastName }` (and the Employee Id actually saved, after any
  retries) must be threaded from the add step into the search step within a test — never
  regenerated independently — so the search assertion is verifying the exact record just created.

## Test Scenarios

### 1. Add Employee and Verify via Search (primary end-to-end flow)

**Seed:** `tests/seed.spec.ts`

#### 1.1. Adding a new employee with unique run-scoped data makes it immediately findable via PIM search

**File:** `tests/employee/add-employee.spec.ts`

**Steps:**
  1. Log in as Admin (username 'Admin', password 'admin123')
    - expect: Dashboard is displayed
  2. Click the 'PIM' nav link, then click the ' Add' button
    - expect: The Add Employee form is displayed with First Name, Last Name, and an auto-populated Employee Id field visible
  3. Generate a unique run-scoped First Name and Last Name for this test invocation (e.g. a fixed prefix plus `Date.now()`, such as `QaFirst<timestamp>` / `QaLast<timestamp>`) and fill them into the First Name and Last Name fields
    - expect: The fields display exactly the generated values
  4. Read the auto-populated Employee Id value
    - expect: The field is non-empty and numeric
  5. Click 'Save'
    - expect: Either the page navigates to the employee's Personal Details tab (URL matches `/pim/viewPersonalDetails/empNumber/<n>`), OR the `Employee Id already exists` error is shown beneath the Employee Id field
    - If the duplicate-id error is shown: generate a new unique numeric Employee Id, overwrite the Employee Id field with it, and click 'Save' again; repeat up to 3 attempts
    - expect: Save eventually succeeds and the page navigates to the Personal Details tab; record the Employee Id that was ultimately saved
  6. Verify the saved employee record on the Personal Details page
    - expect: The page heading shows `"<generated First Name> <generated Last Name>"`
    - expect: The First Name field shows the generated First Name
    - expect: The Last Name field shows the generated Last Name
    - expect: The Employee Id field shows the id captured in step 5 (non-empty, unique)
  7. Click the 'PIM' nav link to return to the Employee List page
    - expect: The `Employee Name` search box and 'Search' button are visible
  8. Type the same generated First Name (from step 3 — not a newly generated value) into the `Employee Name` search box
    - expect: An autocomplete suggestion appears containing `"<generated First Name> <generated Last Name>"`
  9. Select the autocomplete suggestion, then click 'Search'
    - expect: The record-count line reads `"(1) Record Found"`
    - expect: The results table contains exactly one row
    - expect: That row's `Id` column matches the Employee Id captured in step 5
    - expect: That row's `First (& Middle) Name` column matches the generated First Name and `Last Name` column matches the generated Last Name
    - expect: No other/unrelated employee rows are present, confirming the unique run-scoped name avoided any collision with pre-existing data in this shared environment

### 2. Add Employee Edge Cases

**Seed:** `tests/seed.spec.ts`

#### 2.1. Duplicate Employee Id is rejected, then recoverable by supplying a fresh unique id

**File:** `tests/employee/add-employee.spec.ts`

**Steps:**
  1. Log in and navigate to PIM > Add Employee
    - expect: Add Employee form is visible
  2. Fill First Name and Last Name with a unique run-scoped value, then overwrite the Employee Id field with an id that is already known to be in use (e.g. the Employee Id saved by scenario 1.1, or the id currently auto-populated by the form on a page that was already saved from earlier in the same test)
    - expect: Fields show the entered values before submit
  3. Click 'Save'
    - expect: The error `Employee Id already exists` is displayed directly beneath the Employee Id field
    - expect: The page does not navigate away from the Add Employee form (URL remains `/pim/addEmployee`)
    - expect: The First Name and Last Name values entered are still present in the form (not cleared)
  4. Overwrite the Employee Id field with a freshly generated unique numeric value and click 'Save' again
    - expect: Save succeeds this time and the page navigates to `/pim/viewPersonalDetails/empNumber/<n>`, confirming the app recovers once a genuinely unique Employee Id is supplied

#### 2.2. Validation error when First Name and Last Name are left empty

**File:** `tests/employee/add-employee.spec.ts`

**Steps:**
  1. Log in and navigate to PIM > Add Employee
    - expect: Add Employee form is visible with First Name and Last Name empty
  2. Click 'Save' without entering First Name or Last Name
    - expect: A `Required` message is displayed directly beneath the First Name field
    - expect: A `Required` message is displayed directly beneath the Last Name field
    - expect: The page does not navigate away from the Add Employee form

#### 2.3. Searching for a run-unique name with no matching employees shows the empty state

**File:** `tests/employee/add-employee.spec.ts`

**Steps:**
  1. Log in and navigate to PIM > Employee List (no employee needs to be added first)
    - expect: The `Employee Name` search box and 'Search' button are visible
  2. Type a unique run-scoped name guaranteed not to exist (e.g. `NoSuchEmployee<timestamp>`) directly into the search box (without selecting an autocomplete suggestion, since none should appear)
    - expect: No autocomplete suggestions are shown
  3. Click 'Search'
    - expect: The record-count line reads exactly `"No Records Found"`
    - expect: The results table shows no data rows
