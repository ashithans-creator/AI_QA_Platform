const sauceDemoTests = [
  {
    id: 'TC_AUTH_LOGIN',
    title: 'Verify login behaviors',
    defaultSuites: ['Smoke'],
    category: 'Functional',
    preconditions: 'User is on the SauceDemo login page.',
    steps: [
      'Validate invalid credentials show the expected login error.',
      'Validate empty username shows the username required error.',
      'Validate locked_out_user shows the locked account error.',
      'Validate standard_user can log in successfully.'
    ],
    expectedResult: 'Login validation behaves correctly for invalid, empty, locked, and valid user states.',
    priority: 'High',
    severity: 'Critical',
    description: 'Validates invalid, empty, locked, and successful login states.'
  },
  {
    id: 'TC_CATALOG_CART',
    title: 'Verify product display, sorting, and cart counts',
    defaultSuites: ['Sanity'],
    category: 'Functional',
    preconditions: 'Standard user is logged in and viewing the product catalog.',
    steps: [
      'Verify products are displayed with names and prices.',
      'Sort products by price low to high.',
      'Add two products to the cart.',
      'Remove one product from the cart.'
    ],
    expectedResult: 'Products display correctly, sorting is accurate, and cart count updates after add/remove actions.',
    priority: 'High',
    severity: 'Major',
    description: 'Checks inventory display, price sorting, and cart add/remove counts.'
  },
  {
    id: 'TC_PURCHASE_STANDARD',
    title: 'Data-driven purchase flow for standard_user',
    defaultSuites: ['Regression'],
    category: 'Regression',
    preconditions: 'standard_user has valid credentials.',
    steps: [
      'Log in as standard_user.',
      'Add Sauce Labs Backpack to the cart.',
      'Proceed to checkout.',
      'Enter valid checkout information.',
      'Finish the order.'
    ],
    expectedResult: 'Order completes successfully and confirmation page displays a thank-you message.',
    priority: 'High',
    severity: 'Critical',
    description: 'Completes an end-to-end purchase as standard_user.'
  },
  {
    id: 'TC_PURCHASE_PERFORMANCE',
    title: 'Data-driven purchase flow for performance_glitch_user',
    defaultSuites: ['Regression'],
    category: 'Regression',
    preconditions: 'performance_glitch_user has valid credentials.',
    steps: [
      'Log in as performance_glitch_user.',
      'Add Sauce Labs Backpack to the cart.',
      'Proceed to checkout.',
      'Enter valid checkout information.',
      'Finish the order.'
    ],
    expectedResult: 'Order completes successfully despite slower product page behavior.',
    priority: 'Medium',
    severity: 'Major',
    description: 'Completes an end-to-end purchase as performance_glitch_user.'
  },
  {
    id: 'TC_PURCHASE_PROBLEM',
    title: 'Data-driven purchase flow for problem_user',
    defaultSuites: ['Regression'],
    category: 'Regression',
    preconditions: 'problem_user has valid credentials.',
    steps: [
      'Log in as problem_user.',
      'Add Sauce Labs Backpack to the cart.',
      'Proceed to checkout.',
      'Enter checkout information.',
      'Observe checkout validation behavior.'
    ],
    expectedResult: 'Known problem_user checkout behavior is captured and asserted correctly.',
    priority: 'Medium',
    severity: 'Major',
    description: 'Covers the known problem_user checkout behavior.'
  },
  {
    id: 'TC_CHECKOUT_VALIDATIONS',
    title: 'Verify checkout fields validations',
    defaultSuites: ['Regression'],
    category: 'Negative',
    preconditions: 'Standard user has one product in the cart and is on the checkout information page.',
    steps: [
      'Submit checkout with missing first name.',
      'Submit checkout with missing last name.',
      'Submit checkout with missing postal code.'
    ],
    expectedResult: 'Checkout shows the correct required-field error for each missing field.',
    priority: 'High',
    severity: 'Major',
    description: 'Checks first name, last name, and postal code validation errors.'
  }
];

function toGeneratedTestCase(testCase) {
  return {
    testCaseId: testCase.id,
    title: testCase.title,
    preconditions: testCase.preconditions,
    steps: testCase.steps,
    expectedResult: testCase.expectedResult,
    priority: testCase.priority,
    severity: testCase.severity,
    category: testCase.category
  };
}

module.exports = {
  sauceDemoTests,
  toGeneratedTestCase
};
