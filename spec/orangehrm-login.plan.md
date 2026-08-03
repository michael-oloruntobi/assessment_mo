# OrangeHRM Login Feature Test Plan

## Application Overview

This test plan covers the Login feature of the OrangeHRM OS 5.9 demo application (https://opensource-demo.orangehrmlive.com/web/index.php/auth/login). It was built from direct exploration of the live login page.

Observed page structure / selectors:
- Username field: `input[name="username"]`, type="text", placeholder="Username" (accessible role: textbox "Username")
- Password field: `input[name="password"]`, type="password", placeholder="Password" (accessible role: textbox "Password", masked input)
- Login button: `button[type="submit"]` with accessible name "Login"
- Client-side "Required" validation text appears directly beneath each empty field after a submit attempt (element with class containing `oxd-input-field-error-message`, text "Required")
- Server-side authentication failure shows a dismissible alert banner above the form (role="alert") containing the text "Invalid credentials"; on this failure both input fields are cleared and focus returns to the Username field
- A demo credentials hint is always visible on the page: "Username : Admin" / "Password : admin123"
- A "Forgot your password?" link/paragraph is present below the Login button and navigates to `/web/index.php/auth/requestPasswordResetCode` (out of scope for this plan but noted)
- Successful login navigates to `/web/index.php/dashboard/index`, displaying a "Dashboard" heading and a top-right user menu showing the logged-in user's display name (name changes per session), with a menu offering About / Support / Change Password / Logout
- Logout (via user menu -> Logout, or navigating to `/web/index.php/auth/logout`) returns the user to the login page
- Directly navigating to a protected URL (e.g. the dashboard) while unauthenticated redirects back to the login page, confirming route/session protection
- Behavioral observations confirmed via live exploration: whitespace-only input in either field is treated as empty and triggers the "Required" validation (client-side trims/does not accept blank-only values); the Username field matched case-insensitively (lowercase "admin" successfully authenticated as the Admin account) while the Password field is case-sensitive (an uppercase variant of the correct password was rejected); a SQL-injection-style payload (`' OR '1'='1`) in either field was safely rejected with the standard "Invalid credentials" message, with no error/crash/bypass observed, confirming no SQL injection vulnerability via this form

## Test Scenarios

### 1. Valid Login Scenarios

**Seed:** `tests/seed.spec.ts`

#### 1.1. Successful login with valid Admin credentials

**File:** `tests/login/valid-login.spec.ts`

**Steps:**
  1. Navigate to https://opensource-demo.orangehrmlive.com/web/index.php/auth/login
    - expect: The login page loads
    - expect: The 'Login' heading, Username field, Password field, and Login button are visible
  2. Fill the Username field with 'Admin'
    - expect: The typed value 'Admin' appears in the Username field
  3. Fill the Password field with 'admin123'
    - expect: The Password field shows masked characters (input type=password) rather than plain text
  4. Click the 'Login' button
    - expect: The user is redirected to the URL /web/index.php/dashboard/index
    - expect: A 'Dashboard' heading is displayed
    - expect: The top-right user menu displays the logged-in user's name
    - expect: No 'Invalid credentials' alert is shown

#### 1.2. Successful logout returns user to login page

**File:** `tests/login/valid-login.spec.ts`

**Steps:**
  1. Navigate to the login page and log in with username 'Admin' and password 'admin123'
    - expect: User lands on the Dashboard page (/web/index.php/dashboard/index)
  2. Click the user avatar/name in the top-right corner to open the user dropdown menu
    - expect: A menu appears containing 'About', 'Support', 'Change Password', and 'Logout' options
  3. Click the 'Logout' menu item
    - expect: The user is redirected to the login page (/web/index.php/auth/login)
    - expect: The Username and Password fields are visible and empty
    - expect: The Login button is visible again
  4. Attempt to navigate directly to https://opensource-demo.orangehrmlive.com/web/index.php/dashboard/index
    - expect: The application redirects back to the login page instead of showing the dashboard, confirming the session was terminated

### 2. Invalid Login Scenarios

**Seed:** `tests/seed.spec.ts`

#### 2.1. Login fails with correct username and wrong password

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Fill Username with 'Admin' and Password with an incorrect value, e.g. 'wrongpass123'
    - expect: Fields contain the entered values before submit
  3. Click the 'Login' button
    - expect: The user remains on the login page (URL stays /web/index.php/auth/login)
    - expect: An alert banner is displayed containing the text 'Invalid credentials'
    - expect: Both the Username and Password fields are cleared
    - expect: No navigation to the dashboard occurs

#### 2.2. Login fails with incorrect username and correct password

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Fill Username with a non-existent value, e.g. 'NotAdmin', and Password with 'admin123'
    - expect: Fields contain the entered values before submit
  3. Click the 'Login' button
    - expect: The user remains on the login page
    - expect: An 'Invalid credentials' alert is displayed
    - expect: Both fields are cleared
    - expect: No navigation to the dashboard occurs

#### 2.3. Login fails with both incorrect username and incorrect password

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Fill Username with 'WrongUser' and Password with 'WrongPass1'
    - expect: Fields contain the entered values before submit
  3. Click the 'Login' button
    - expect: The user remains on the login page
    - expect: An 'Invalid credentials' alert is displayed
    - expect: Both fields are cleared

#### 2.4. Validation error when Username field is left empty

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Leave the Username field empty and fill the Password field with 'admin123'
    - expect: Username field remains empty, Password field contains 'admin123'
  3. Click the 'Login' button
    - expect: A 'Required' validation message is displayed directly beneath the Username field
    - expect: No 'Required' message is displayed beneath the Password field
    - expect: The page does not navigate away from the login page
    - expect: No server request for authentication is made (client-side validation blocks submission)

#### 2.5. Validation error when Password field is left empty

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Fill the Username field with 'Admin' and leave the Password field empty
    - expect: Username field contains 'Admin', Password field remains empty
  3. Click the 'Login' button
    - expect: A 'Required' validation message is displayed directly beneath the Password field
    - expect: No 'Required' message is displayed beneath the Username field
    - expect: The page does not navigate away from the login page

#### 2.6. Validation error when both Username and Password fields are left empty

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible with both fields empty
  2. Click the 'Login' button without entering any text
    - expect: A 'Required' validation message is displayed beneath the Username field
    - expect: A 'Required' validation message is displayed beneath the Password field
    - expect: The page remains on the login URL
    - expect: No 'Invalid credentials' alert is shown (this is client-side validation, not a server auth failure)

#### 2.7. Whitespace-only Username and Password are treated as empty

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Fill the Username field with only spaces (e.g. '   ') and the Password field with only spaces (e.g. '   ')
    - expect: Fields visually contain the spaces before submission
  3. Click the 'Login' button
    - expect: A 'Required' validation message is displayed beneath the Username field
    - expect: A 'Required' validation message is displayed beneath the Password field
    - expect: The form does not submit to the server, confirming whitespace-only input is trimmed and treated as empty by client-side validation

#### 2.8. Password field is case-sensitive

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Fill Username with 'Admin' and Password with an incorrectly-cased variant of the valid password, e.g. 'ADMIN123'
    - expect: Fields contain the entered values before submit
  3. Click the 'Login' button
    - expect: The user remains on the login page
    - expect: An 'Invalid credentials' alert is displayed, confirming the Password field is case-sensitive and 'ADMIN123' is not accepted as equivalent to 'admin123'

#### 2.9. SQL-injection-like input is safely rejected (robustness/security check)

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Fill both the Username and Password fields with a SQL-injection-style payload, e.g. "' OR '1'='1"
    - expect: Fields accept the text as plain string input without executing any script or causing a client-side error
  3. Click the 'Login' button
    - expect: The application does not authenticate the user and does not navigate to the dashboard
    - expect: An 'Invalid credentials' alert is displayed
    - expect: No unhandled exception, stack trace, or SQL error is exposed on the page, confirming the login form is not vulnerable to this basic SQL-injection pattern

#### 2.10. Repeated invalid login attempts do not lock or disable the account (documented behavior check)

**File:** `tests/login/invalid-login.spec.ts`

**Steps:**
  1. Navigate to the login page
    - expect: Login form is visible
  2. Submit the login form 5 times in a row using Username 'Admin' and an incorrect password each time (e.g. 'wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5')
    - expect: Each attempt returns the standard 'Invalid credentials' alert with no account lockout, CAPTCHA, or rate-limiting message observed on this demo instance
  3. Immediately after, submit the login form again with the correct credentials Username 'Admin' and Password 'admin123'
    - expect: Login succeeds and the user is redirected to the dashboard, confirming prior failed attempts did not lock the account on this demo environment. If the target environment under test does implement lockout after N attempts, this test should be updated to assert the lockout/disabled-state message instead
