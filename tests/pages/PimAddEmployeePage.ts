import { type Page, type Locator } from '@playwright/test';
import { generateUniqueEmployeeId } from '../data/employee';

/**
 * Page Object for the OrangeHRM PIM "Add Employee" form.
 * https://opensource-demo.orangehrmlive.com/web/index.php/pim/addEmployee
 */
export class PimAddEmployeePage {
  readonly page: Page;
  readonly url = 'https://opensource-demo.orangehrmlive.com/web/index.php/pim/addEmployee';

  readonly firstNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly employeeIdInput: Locator;
  readonly duplicateIdError: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name' });
    this.middleNameInput = page.getByRole('textbox', { name: 'Middle Name' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name' });

    // Employee Id has no accessible name of its own, so it's scoped by the
    // "Employee Id" label within its shared .oxd-input-group wrapper (the same
    // pattern used across OrangeHRM forms, e.g. LoginPage's Required messages).
    const employeeIdGroup = page
      .locator('.oxd-input-group')
      .filter({ has: page.getByText('Employee Id', { exact: true }) });
    this.employeeIdInput = employeeIdGroup.getByRole('textbox');
    this.duplicateIdError = employeeIdGroup.getByText('Employee Id already exists');

    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  async goto() {
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
  }

  async fillEmployeeName(firstName: string, lastName: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
  }

  /**
   * "Required" validation text is rendered as a sibling of its field within a
   * per-field `.oxd-input-group.oxd-input-field-bottom-space` wrapper. The
   * First/Middle/Last Name fields additionally sit inside an outer plain
   * `.oxd-input-group` for the whole "Employee Full Name" group, so the extra
   * `.oxd-input-field-bottom-space` class is required to scope to the single
   * field rather than matching both fields' Required messages at once.
   */
  requiredMessageFor(field: Locator): Locator {
    return this.page
      .locator('.oxd-input-group.oxd-input-field-bottom-space')
      .filter({ has: field })
      .getByText('Required');
  }

  /**
   * Clicks Save. The form's auto-suggested Employee Id is not guaranteed
   * unique in this shared, actively-changing demo environment, so a duplicate
   * error is retried with a freshly generated id up to `maxAttempts` times
   * before giving up. Each attempt waits out the full navigation timeout
   * before consulting the duplicate-id error, since that error element can
   * remain in the DOM (stale) from a prior failed attempt and would otherwise
   * cause a false-positive "duplicate" read on this attempt.
   */
  async saveWithRetry(maxAttempts = 3): Promise<string> {
    let employeeId = (await this.employeeIdInput.inputValue()).trim();
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.saveButton.click();
      try {
        await this.page.waitForURL(/\/pim\/viewPersonalDetails\/empNumber\/\d+/, { timeout: 8_000 });
        return employeeId;
      } catch {
        // Didn't navigate within the timeout; fall through to check why.
      }
      if (!(await this.duplicateIdError.isVisible())) {
        throw new Error('Save did not navigate to Personal Details and no duplicate Employee Id error was shown');
      }
      employeeId = generateUniqueEmployeeId();
      await this.employeeIdInput.fill(employeeId);
    }
    throw new Error(`Failed to save employee after ${maxAttempts} attempts due to repeated duplicate Employee Id errors`);
  }
}
