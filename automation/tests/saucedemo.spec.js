const { test, expect } = require('@playwright/test');
const path = require('path');
const { LoginPage } = require('../pages/LoginPage');
const { ProductsPage } = require('../pages/ProductsPage');
const { CartPage } = require('../pages/CartPage');
const { CheckoutPage } = require('../pages/CheckoutPage');
const { ConfirmationPage } = require('../pages/ConfirmationPage');
const { parseCsvData } = require('../utils/csvHelper');

// Load CSV test data dynamically for login and checkout scenarios
const loginDataPath = path.join(__dirname, '..', 'data', 'loginData.csv');
const checkoutDataPath = path.join(__dirname, '..', 'data', 'checkoutData.csv');
const loginData = parseCsvData(loginDataPath);
const checkoutData = parseCsvData(checkoutDataPath);

const getLoginRow = (scenario) => loginData.find(row => row.scenario === scenario);
const getCheckoutRow = (scenario) => checkoutData.find(row => row.scenario === scenario);

test.describe('SauceDemo E2E Suite', () => {

  // --- Smoke Suite: Authentication verifications ---
  test('Verify login behaviors @TC_AUTH_LOGIN @smoke', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // 1. Invalid User
    const invalidRow = getLoginRow('invalid_credentials');
    if (invalidRow) {
      await loginPage.login(invalidRow.username, invalidRow.password);
      const err = await loginPage.getErrorMessage();
      expect(err).toContain(invalidRow.expectedError);
    }

    // 2. Empty User
    const emptyUserRow = getLoginRow('empty_username');
    if (emptyUserRow) {
      await loginPage.login(emptyUserRow.username, emptyUserRow.password);
      const err = await loginPage.getErrorMessage();
      expect(err).toContain(emptyUserRow.expectedError);
    }

    // 3. Locked User
    const lockedRow = getLoginRow('locked_user');
    if (lockedRow) {
      await loginPage.login(lockedRow.username, lockedRow.password);
      const err = await loginPage.getErrorMessage();
      expect(err).toContain(lockedRow.expectedError);
    }

    // 4. Valid Standard User
    const standardRow = getLoginRow('valid_standard');
    if (standardRow) {
      await loginPage.login(standardRow.username, standardRow.password);
      expect(page.url()).toContain('/inventory.html');
    }
  });

  // --- Sanity Suite: Catalog interactions ---
  test('Verify product display, sorting, and cart counts @TC_CATALOG_CART @sanity', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const productsPage = new ProductsPage(page);

    await loginPage.navigate();
    const standardRow = getLoginRow('valid_standard');
    await loginPage.login(standardRow.username, standardRow.password);

    // Assert items displayed
    const names = await productsPage.getAllProductNames();
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain('Sauce Labs Backpack');

    // Assert sorting Price Low to High
    await productsPage.sortProducts('lohi');
    const prices = await productsPage.getAllProductPrices();
    // Check if sorted
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i+1]);
    }

    // Add and remove items to verify cart count
    expect(await productsPage.getCartCount()).toBe(0);
    await productsPage.addProductToCart('Sauce Labs Backpack');
    expect(await productsPage.getCartCount()).toBe(1);

    await productsPage.addProductToCart('Sauce Labs Bike Light');
    expect(await productsPage.getCartCount()).toBe(2);

    await productsPage.removeProductFromCart('Sauce Labs Backpack');
    expect(await productsPage.getCartCount()).toBe(1);
  });

  // --- Regression Suite: Data-Driven E2E flows ---
  // Iterate standard, performance, and problem users dynamically
  const runnableUsers = [
    { id: 'TC_PURCHASE_STANDARD', row: getCheckoutRow('standard_purchase') },
    { id: 'TC_PURCHASE_PERFORMANCE', row: getCheckoutRow('performance_purchase') },
    { id: 'TC_PURCHASE_PROBLEM', row: getCheckoutRow('problem_purchase') }
  ].filter(item => item.row);

  for (const { id, row: userRow } of runnableUsers) {
    test(`Data-Driven E2E Purchase flow for user: ${userRow.username} @${id} @regression`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      const productsPage = new ProductsPage(page);
      const cartPage = new CartPage(page);
      const checkoutPage = new CheckoutPage(page);
      const confirmationPage = new ConfirmationPage(page);

      // 1. Login
      await loginPage.navigate();
      await loginPage.login(userRow.username, userRow.password);
      
      // 2. Add product to cart
      await productsPage.addProductToCart('Sauce Labs Backpack');
      await productsPage.goToCart();

      // 3. Click Checkout
      await cartPage.clickCheckout();

      // 4. Fill Address
      await checkoutPage.fillInformation(userRow.firstName, userRow.lastName, userRow.zipCode);
      await checkoutPage.clickContinue();

      if (userRow.username === 'problem_user') {
        // Problem user is known to fail zip/last-name fill due to site defect simulation.
        // We handle this gracefully in our assertion.
        const err = await checkoutPage.getErrorMessage();
        if (err) {
          expect(err).toContain(userRow.expectedError);
          return;
        }
      }

      // 5. Final Checkout overview
      expect(page.url()).toContain('/checkout-step-two.html');
      const total = await confirmationPage.getSummaryTotal();
      expect(total).toContain('Total:');

      // 6. Finish Order
      await confirmationPage.clickFinish();
      
      // 7. Verify Confirmation Thank you headers
      const header = await confirmationPage.getCompleteHeader();
      expect(header.toLowerCase()).toContain('thank you for your order');
    });
  }

  // --- Boundary Suite: Address input validators ---
  test('Verify checkout fields validations @TC_CHECKOUT_VALIDATIONS @regression', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginPage.navigate();
    const standardRow = getLoginRow('valid_standard');
    await loginPage.login(standardRow.username, standardRow.password);

    await productsPage.addProductToCart('Sauce Labs Backpack');
    await productsPage.goToCart();
    await cartPage.clickCheckout();

    // 1. Missing First Name
    const missingFirst = getCheckoutRow('empty_firstname');
    if (missingFirst) {
      await checkoutPage.fillInformation('', missingFirst.lastName, missingFirst.zipCode);
      await checkoutPage.clickContinue();
      const err = await checkoutPage.getErrorMessage();
      expect(err).toContain(missingFirst.expectedError);
    }

    // 2. Missing Last Name
    const missingLast = getCheckoutRow('empty_lastname');
    if (missingLast) {
      // Re-enter page to clear state
      await page.goto('/checkout-step-one.html');
      await checkoutPage.fillInformation(missingLast.firstName, '', missingLast.zipCode);
      await checkoutPage.clickContinue();
      const err = await checkoutPage.getErrorMessage();
      expect(err).toContain(missingLast.expectedError);
    }

    // 3. Missing Zip
    const missingZip = getCheckoutRow('empty_zip');
    if (missingZip) {
      await page.goto('/checkout-step-one.html');
      await checkoutPage.fillInformation(missingZip.firstName, missingZip.lastName, '');
      await checkoutPage.clickContinue();
      const err = await checkoutPage.getErrorMessage();
      expect(err).toContain(missingZip.expectedError);
    }
  });

});
