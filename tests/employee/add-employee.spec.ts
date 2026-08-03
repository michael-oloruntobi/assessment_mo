// spec: spec/orangehrm-add-employee.plan.md (sections 1-2)
// seed: tests/seed.spec.ts

import { test, expect } from '../fixtures';
import { ADMIN_CREDENTIALS } from '../data/credentials';
import { DASHBOARD_URL } from '../data/urls';
import { generateUniqueEmployeeName, generateUniqueEmployeeId } from '../data/employee';

test.describe('Add Employee and Verify via Search (primary end-to-end flow)', () => {

  test('Adding a new employee with unique run-scoped data makes it immediately findable via PIM search', async ({ page, loginPage, pimAddEmployeePage, pimEmployeeListPage }) => {
    // Log in as Admin
    await loginPage.goto();
    await loginPage.login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(DASHBOARD_URL);

    // Click the 'PIM' nav link, then click the ' Add' button
    await page.getByRole('link', { name: 'PIM' }).click();
    await pimEmployeeListPage.addButton.click();
    await expect(page).toHaveURL(/\/pim\/addEmployee$/);
    await expect(pimAddEmployeePage.firstNameInput).toBeVisible();
    await expect(pimAddEmployeePage.lastNameInput).toBeVisible();
    await expect(pimAddEmployeePage.employeeIdInput).not.toHaveValue('');

    // Generate a unique run-scoped First Name and Last Name and fill them in
    const { firstName, lastName } = generateUniqueEmployeeName();
    await pimAddEmployeePage.fillEmployeeName(firstName, lastName);
    await expect(pimAddEmployeePage.firstNameInput).toHaveValue(firstName);
    await expect(pimAddEmployeePage.lastNameInput).toHaveValue(lastName);

    // Read the auto-populated Employee Id value
    const employeeIdBefore = await pimAddEmployeePage.employeeIdInput.inputValue();
    expect(employeeIdBefore.trim()).toMatch(/^\d+$/);

    // Click 'Save', retrying with a fresh Employee Id if a duplicate-id error appears
    const savedEmployeeId = await pimAddEmployeePage.saveWithRetry();
    await expect(page).toHaveURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/);

    // Verify the saved employee record on the Personal Details page
    await expect(page.getByRole('heading', { name: `${firstName} ${lastName}` })).toBeVisible();
    await expect(pimAddEmployeePage.firstNameInput).toHaveValue(firstName);
    await expect(pimAddEmployeePage.lastNameInput).toHaveValue(lastName);
    await expect(pimAddEmployeePage.employeeIdInput).toHaveValue(savedEmployeeId);

    // Click the 'PIM' nav link to return to the Employee List page
    await page.getByRole('link', { name: 'PIM' }).click();
    await expect(pimEmployeeListPage.employeeNameSearchInput).toBeVisible();
    await expect(pimEmployeeListPage.searchButton).toBeVisible();

    // Type the same generated First Name into the Employee Name search box
    await pimEmployeeListPage.employeeNameSearchInput.fill(firstName);
    const suggestion = pimEmployeeListPage.autocompleteOption(`${firstName} ${lastName}`);
    await expect(suggestion).toBeVisible();

    // Select the autocomplete suggestion, then click 'Search'
    await suggestion.click();
    await pimEmployeeListPage.searchButton.click();

    // Verify exactly one matching record is found and it's the one just created
    await expect(pimEmployeeListPage.recordCountText).toHaveText('(1) Record Found');
    await expect(pimEmployeeListPage.resultsTable.getByRole('row')).toHaveCount(2); // header + 1 data row
    const row = pimEmployeeListPage.resultRowFor(savedEmployeeId);
    await expect(row.getByRole('cell').nth(1)).toHaveText(savedEmployeeId);
    await expect(row.getByRole('cell').nth(2)).toHaveText(firstName);
    await expect(row.getByRole('cell').nth(3)).toHaveText(lastName);
  });

});

test.describe('Add Employee Edge Cases', () => {

  test('Duplicate Employee Id is rejected, then recoverable by supplying a fresh unique id', async ({ page, loginPage, pimAddEmployeePage }) => {
    // Log in and navigate to PIM > Add Employee
    await loginPage.goto();
    await loginPage.login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(DASHBOARD_URL);
    await pimAddEmployeePage.goto();
    await expect(pimAddEmployeePage.firstNameInput).toBeVisible();

    // First, add an employee normally to establish an Employee Id known to be in use
    const first = generateUniqueEmployeeName();
    await pimAddEmployeePage.fillEmployeeName(first.firstName, first.lastName);
    const usedEmployeeId = await pimAddEmployeePage.saveWithRetry();
    await expect(page).toHaveURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/);

    // Add a second employee, deliberately reusing that Employee Id
    await pimAddEmployeePage.goto();
    const second = generateUniqueEmployeeName();
    await pimAddEmployeePage.fillEmployeeName(second.firstName, second.lastName);
    await pimAddEmployeePage.employeeIdInput.fill(usedEmployeeId);
    await expect(pimAddEmployeePage.firstNameInput).toHaveValue(second.firstName);
    await expect(pimAddEmployeePage.lastNameInput).toHaveValue(second.lastName);

    // Click 'Save'
    await pimAddEmployeePage.saveButton.click();

    // The error is displayed, the page stays on the Add Employee form, and entered
    // names are preserved (not cleared)
    await expect(pimAddEmployeePage.duplicateIdError).toHaveText('Employee Id already exists');
    await expect(page).toHaveURL(/\/pim\/addEmployee$/);
    await expect(pimAddEmployeePage.firstNameInput).toHaveValue(second.firstName);
    await expect(pimAddEmployeePage.lastNameInput).toHaveValue(second.lastName);

    // Overwrite the Employee Id with a freshly generated unique value and click 'Save' again
    await pimAddEmployeePage.employeeIdInput.fill(generateUniqueEmployeeId());
    await pimAddEmployeePage.saveButton.click();
    await expect(page).toHaveURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/);
  });

  test('Validation error when First Name and Last Name are left empty', async ({ page, loginPage, pimAddEmployeePage }) => {
    // Log in and navigate to PIM > Add Employee
    await loginPage.goto();
    await loginPage.login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(DASHBOARD_URL);
    await pimAddEmployeePage.goto();
    await expect(pimAddEmployeePage.firstNameInput).toHaveValue('');
    await expect(pimAddEmployeePage.lastNameInput).toHaveValue('');

    // Click 'Save' without entering First Name or Last Name
    await pimAddEmployeePage.saveButton.click();

    // A 'Required' message is displayed beneath each of the First Name and Last Name fields
    await expect(pimAddEmployeePage.requiredMessageFor(pimAddEmployeePage.firstNameInput)).toBeVisible();
    await expect(pimAddEmployeePage.requiredMessageFor(pimAddEmployeePage.lastNameInput)).toBeVisible();
    await expect(page).toHaveURL(/\/pim\/addEmployee$/);
  });

  test('Searching for a run-unique name with no matching employees shows the empty state', async ({ page, loginPage, pimEmployeeListPage }) => {
    // Log in and navigate to PIM > Employee List
    await loginPage.goto();
    await loginPage.login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(DASHBOARD_URL);
    await pimEmployeeListPage.goto();
    await expect(pimEmployeeListPage.employeeNameSearchInput).toBeVisible();
    await expect(pimEmployeeListPage.searchButton).toBeVisible();

    // Type a unique run-scoped name guaranteed not to exist
    const noSuchName = `NoSuchEmployee${Date.now()}`;
    await pimEmployeeListPage.employeeNameSearchInput.fill(noSuchName);
    await expect(pimEmployeeListPage.autocompleteOption(noSuchName)).toHaveCount(0);

    // Click 'Search'
    await pimEmployeeListPage.searchButton.click();

    // The record-count line reads exactly "No Records Found" and the table has no data rows
    await expect(pimEmployeeListPage.recordCountText).toHaveText('No Records Found');
    await expect(pimEmployeeListPage.resultsTable.getByRole('row')).toHaveCount(1); // header row only
  });

});
