import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PimAddEmployeePage } from './pages/PimAddEmployeePage';
import { PimEmployeeListPage } from './pages/PimEmployeeListPage';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  pimAddEmployeePage: PimAddEmployeePage;
  pimEmployeeListPage: PimEmployeeListPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  pimAddEmployeePage: async ({ page }, use) => {
    await use(new PimAddEmployeePage(page));
  },
  pimEmployeeListPage: async ({ page }, use) => {
    await use(new PimEmployeeListPage(page));
  },
});

export { expect } from '@playwright/test';
