import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for the OrangeHRM PIM "Employee List" / search page, which is
 * also the PIM module's landing page.
 * https://opensource-demo.orangehrmlive.com/web/index.php/pim/viewEmployeeList
 */
export class PimEmployeeListPage {
  readonly page: Page;
  readonly url = 'https://opensource-demo.orangehrmlive.com/web/index.php/pim/viewEmployeeList';

  readonly employeeNameSearchInput: Locator;
  readonly employeeIdSearchInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly addButton: Locator;
  readonly resultsTable: Locator;
  /** The record-count line above the table; wording varies with match count
   * ("(N) Records Found", "(1) Record Found", or "No Records Found"). */
  readonly recordCountText: Locator;

  constructor(page: Page) {
    this.page = page;

    const employeeNameGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Employee Name', { exact: true }) });
    this.employeeNameSearchInput = employeeNameGroup.getByRole('textbox');

    const employeeIdGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Employee Id', { exact: true }) });
    this.employeeIdSearchInput = employeeIdGroup.getByRole('textbox');

    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.resultsTable = page.getByRole('table');
    // Scoped to <span> to exclude the transient toast notification, which
    // briefly renders the same text in a <p class="oxd-toast-content-text">.
    this.recordCountText = page
      .locator('span.oxd-text--span')
      .filter({ hasText: /^\((\d+)\) Records? Found$|^No Records Found$/ });
  }

  async goto() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
  }

  autocompleteOption(fullName: string): Locator {
    return this.page.getByRole('option', { name: fullName });
  }

  async searchByEmployeeName(fullName: string) {
    await this.employeeNameSearchInput.fill(fullName);
    await this.autocompleteOption(fullName).click();
    await this.searchButton.click();
  }

  resultRowFor(employeeId: string): Locator {
    return this.resultsTable.getByRole('row').filter({ hasText: employeeId });
  }
}
