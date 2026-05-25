class CheckoutPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.firstNameInput = page.locator('[data-test="firstName"]');
    this.lastNameInput = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');
    this.continueButton = page.locator('[data-test="continue"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  async fillInformation(firstName, lastName, postalCode) {
    if (firstName !== undefined && firstName !== '') {
      await this.firstNameInput.fill(firstName);
    } else {
      await this.firstNameInput.fill('');
    }

    if (lastName !== undefined && lastName !== '') {
      await this.lastNameInput.fill(lastName);
    } else {
      await this.lastNameInput.fill('');
    }

    if (postalCode !== undefined && postalCode !== '') {
      await this.postalCodeInput.fill(postalCode);
    } else {
      await this.postalCodeInput.fill('');
    }
  }

  async clickContinue() {
    await this.continueButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async getErrorMessage() {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return '';
  }
}

module.exports = { CheckoutPage };
