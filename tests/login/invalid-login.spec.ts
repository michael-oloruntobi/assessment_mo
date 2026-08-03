// spec: spec/orangehrm-login.plan.md (section 2: Invalid Login Scenarios, 2.1-2.10)
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Invalid Login Scenarios', () => {

  test('Login fails with correct username and wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();

    // Fill Username with 'Admin' and Password with an incorrect value, e.g. 'wrongpass123'
    await loginPage.fillUsername('Admin');
    await loginPage.fillPassword('wrongpass123');
    await expect(loginPage.usernameInput).toHaveValue('Admin');
    await expect(loginPage.passwordInput).toHaveValue('wrongpass123');

    // Click the 'Login' button
    await loginPage.submit();

    // The user remains on the login page and an 'Invalid credentials' alert is displayed
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(loginPage.invalidCredentialsAlert).toBeVisible();

    // Both the Username and Password fields are cleared and no navigation to the dashboard occurs
    await expect(loginPage.usernameInput).toHaveValue('');
    await expect(loginPage.passwordInput).toHaveValue('');
    await expect(page).not.toHaveURL(/\/dashboard\/index/);
  });

  test('Login fails with incorrect username and correct password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Fill Username with a non-existent value, e.g. 'NotAdmin', and Password with 'admin123'
    await loginPage.fillUsername('NotAdmin');
    await loginPage.fillPassword('admin123');
    await expect(loginPage.usernameInput).toHaveValue('NotAdmin');
    await expect(loginPage.passwordInput).toHaveValue('admin123');

    // Click the 'Login' button
    await loginPage.submit();

    // The user remains on the login page and an 'Invalid credentials' alert is displayed
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(loginPage.invalidCredentialsAlert).toBeVisible();

    // Both fields are cleared and no navigation to the dashboard occurs
    await expect(loginPage.usernameInput).toHaveValue('');
    await expect(loginPage.passwordInput).toHaveValue('');
    await expect(page).not.toHaveURL(/\/dashboard\/index/);
  });

  test('Login fails with both incorrect username and incorrect password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Fill Username with 'WrongUser' and Password with 'WrongPass1'
    await loginPage.fillUsername('WrongUser');
    await loginPage.fillPassword('WrongPass1');
    await expect(loginPage.usernameInput).toHaveValue('WrongUser');
    await expect(loginPage.passwordInput).toHaveValue('WrongPass1');

    // Click the 'Login' button
    await loginPage.submit();

    // The user remains on the login page and an 'Invalid credentials' alert is displayed
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(loginPage.invalidCredentialsAlert).toBeVisible();

    // Both fields are cleared
    await expect(loginPage.usernameInput).toHaveValue('');
    await expect(loginPage.passwordInput).toHaveValue('');
  });

  test('Validation error when Username field is left empty', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Leave the Username field empty and fill the Password field with 'admin123'
    await loginPage.fillPassword('admin123');
    await expect(loginPage.usernameInput).toHaveValue('');
    await expect(loginPage.passwordInput).toHaveValue('admin123');

    // Click the 'Login' button
    await loginPage.submit();

    // A 'Required' validation message is displayed directly beneath the Username field only
    await expect(loginPage.requiredMessageFor(loginPage.usernameInput)).toBeVisible();
    await expect(loginPage.requiredMessageFor(loginPage.passwordInput)).toBeHidden();

    // The page does not navigate away from the login page (client-side validation blocks submission)
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(loginPage.invalidCredentialsAlert).toBeHidden();
  });

  test('Validation error when Password field is left empty', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Fill the Username field with 'Admin' and leave the Password field empty
    await loginPage.fillUsername('Admin');
    await expect(loginPage.usernameInput).toHaveValue('Admin');
    await expect(loginPage.passwordInput).toHaveValue('');

    // Click the 'Login' button
    await loginPage.submit();

    // A 'Required' validation message is displayed directly beneath the Password field only
    await expect(loginPage.requiredMessageFor(loginPage.passwordInput)).toBeVisible();
    await expect(loginPage.requiredMessageFor(loginPage.usernameInput)).toBeHidden();

    // The page does not navigate away from the login page
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('Validation error when both Username and Password fields are left empty', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page with both fields empty
    await loginPage.goto();
    await expect(loginPage.usernameInput).toHaveValue('');
    await expect(loginPage.passwordInput).toHaveValue('');

    // Click the 'Login' button without entering any text
    await loginPage.submit();

    // A 'Required' validation message is displayed beneath both the Username and Password fields
    await expect(loginPage.requiredMessageFor(loginPage.usernameInput)).toBeVisible();
    await expect(loginPage.requiredMessageFor(loginPage.passwordInput)).toBeVisible();

    // The page remains on the login URL and no 'Invalid credentials' alert is shown (client-side validation)
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(loginPage.invalidCredentialsAlert).toBeHidden();
  });

  test('Whitespace-only Username and Password are treated as empty', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Fill the Username field with only spaces and the Password field with only spaces
    await loginPage.fillUsername('   ');
    await loginPage.fillPassword('   ');
    await expect(loginPage.usernameInput).toHaveValue('   ');
    await expect(loginPage.passwordInput).toHaveValue('   ');

    // Click the 'Login' button
    await loginPage.submit();

    // A 'Required' validation message is displayed beneath both fields, confirming whitespace-only
    // input is trimmed and treated as empty, and the form does not submit to the server
    await expect(loginPage.requiredMessageFor(loginPage.usernameInput)).toBeVisible();
    await expect(loginPage.requiredMessageFor(loginPage.passwordInput)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(loginPage.invalidCredentialsAlert).toBeHidden();
  });

  test('Password field is case-sensitive', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Fill Username with 'Admin' and Password with an incorrectly-cased variant of the valid password
    await loginPage.fillUsername('Admin');
    await loginPage.fillPassword('ADMIN123');
    await expect(loginPage.usernameInput).toHaveValue('Admin');
    await expect(loginPage.passwordInput).toHaveValue('ADMIN123');

    // Click the 'Login' button
    await loginPage.submit();

    // The user remains on the login page and an 'Invalid credentials' alert confirms the
    // Password field is case-sensitive and 'ADMIN123' is not accepted as equivalent to 'admin123'
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(loginPage.invalidCredentialsAlert).toBeVisible();
  });

  test('SQL-injection-like input is safely rejected', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const sqlPayload = "' OR '1'='1";

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Fill both the Username and Password fields with a SQL-injection-style payload
    await loginPage.fillUsername(sqlPayload);
    await loginPage.fillPassword(sqlPayload);
    await expect(loginPage.usernameInput).toHaveValue(sqlPayload);
    await expect(loginPage.passwordInput).toHaveValue(sqlPayload);

    // Click the 'Login' button
    await loginPage.submit();

    // The application does not authenticate the user and does not navigate to the dashboard
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page).not.toHaveURL(/\/dashboard\/index/);

    // An 'Invalid credentials' alert is displayed
    await expect(loginPage.invalidCredentialsAlert).toBeVisible();

    // No unhandled exception, stack trace, or SQL error is exposed on the page, and the
    // login form remains intact, confirming the form is not vulnerable to this SQL-injection pattern
    await expect(page.getByText(/exception|stack trace|sqlstate|syntax error/i)).toBeHidden();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('Repeated invalid login attempts do not lock or disable the account', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Navigate to the login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Submit the login form 5 times in a row using Username 'Admin' and an incorrect password each time
    const incorrectPasswords = ['wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5'];
    for (const incorrectPassword of incorrectPasswords) {
      await loginPage.login('Admin', incorrectPassword);

      // Each attempt returns the standard 'Invalid credentials' alert with no account lockout,
      // CAPTCHA, or rate-limiting message observed on this demo instance
      await expect(loginPage.invalidCredentialsAlert).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/login$/);
    }

    // Immediately after, submit the login form again with the correct credentials
    await loginPage.login('Admin', 'admin123');

    // Login succeeds and the user is redirected to the dashboard, confirming prior failed
    // attempts did not lock the account on this demo environment
    await expect(page).toHaveURL(/\/dashboard\/index/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

});
