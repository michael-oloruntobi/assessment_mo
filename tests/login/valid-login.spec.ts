// spec: spec/orangehrm-login.plan.md (section 1: Valid Login Scenarios)
// seed: tests/seed.spec.ts

import { test, expect } from '../../fixtures/fixtures';
import { ADMIN_CREDENTIALS } from '../../data/login/credentials';
import { DASHBOARD_URL } from '../../data/common/urls';

test.describe('Valid Login Scenarios', () => {

  test('Successful login with valid Admin credentials', async ({ page, loginPage, dashboardPage }) => {
    // Navigate to https://opensource-demo.orangehrmlive.com/web/index.php/auth/login
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();

    // Fill the Username field with 'Admin'
    await loginPage.usernameInput.fill(ADMIN_CREDENTIALS.username);
    await expect(loginPage.usernameInput).toHaveValue(ADMIN_CREDENTIALS.username);

    // Fill the Password field with 'admin123'
    await loginPage.passwordInput.fill(ADMIN_CREDENTIALS.password);
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

    // Click the 'Login' button
    await loginPage.loginButton.click();
    await expect(page).toHaveURL(DASHBOARD_URL);
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.userMenuTrigger).toBeVisible();
    await expect(loginPage.invalidCredentialsAlert).toBeHidden();
  });

  test('Successful logout returns user to login page', async ({ page, loginPage, dashboardPage }) => {
    // Navigate to the login page and log in with username 'Admin' and password 'admin123'
    await loginPage.goto();
    await loginPage.login(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
    await expect(page).toHaveURL(DASHBOARD_URL);

    // Click the user avatar/name in the top-right corner to open the user dropdown menu
    await dashboardPage.openUserMenu();
    await expect(dashboardPage.aboutMenuItem).toBeVisible();
    await expect(dashboardPage.supportMenuItem).toBeVisible();
    await expect(dashboardPage.changePasswordMenuItem).toBeVisible();
    await expect(dashboardPage.logoutMenuItem).toBeVisible();

    // Click the 'Logout' menu item
    await dashboardPage.logoutMenuItem.click();
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.usernameInput).toHaveValue('');
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.passwordInput).toHaveValue('');
    await expect(loginPage.loginButton).toBeVisible();

    // Attempt to navigate directly to https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index
    await page.goto(DASHBOARD_URL);
    await expect(page).not.toHaveURL(DASHBOARD_URL);
    await expect(loginPage.heading).toBeVisible();
  });

});
