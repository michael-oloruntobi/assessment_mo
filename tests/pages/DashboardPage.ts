import { type Locator, type Page } from '@playwright/test';

/**
 * Page Object for the OrangeHRM Dashboard page
 * (https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index),
 * including the top-right user dropdown menu.
 */
export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly userMenuTrigger: Locator;
  readonly aboutMenuItem: Locator;
  readonly supportMenuItem: Locator;
  readonly changePasswordMenuItem: Locator;
  readonly logoutMenuItem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    // Scoped to the banner landmark, and keyed off the stable "profile picture"
    // image rather than the logged-in user's display name, which changes per session.
    this.userMenuTrigger = page.getByRole('banner').getByRole('img', { name: 'profile picture' });
    this.aboutMenuItem = page.getByRole('menuitem', { name: 'About' });
    this.supportMenuItem = page.getByRole('menuitem', { name: 'Support' });
    this.changePasswordMenuItem = page.getByRole('menuitem', { name: 'Change Password' });
    this.logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
  }

  async openUserMenu(): Promise<void> {
    await this.userMenuTrigger.click();
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.logoutMenuItem.click();
  }
}
