import { type Page, type Locator } from '@playwright/test';
import { LOGIN_URL } from '../data/common/urls';

/**
 * Page Object Model for the OrangeHRM Login page.
 * https://opensource-demo.orangehrmlive.com/web/index.php/auth/login
 */
export class LoginPage {
  readonly page: Page;
  readonly url = LOGIN_URL;

  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly invalidCredentialsAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Login' });
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.invalidCredentialsAlert = page.getByRole('alert').getByText('Invalid credentials');
  }

  async goto() {
    await this.page.goto(this.url);
  }

  async fillUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.loginButton.click();
  }

  async login(username: string, password: string) {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * "Required" validation text is rendered as a sibling of its field within the
   * field's `.oxd-input-group` wrapper, so it must be scoped per field to
   * distinguish the Username message from the Password message.
   */
  requiredMessageFor(field: Locator): Locator {
    return this.page.locator('.oxd-input-group', { has: field }).getByText('Required');
  }
}
