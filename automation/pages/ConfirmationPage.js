class ConfirmationPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.finishButton = page.locator('[data-test="finish"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    
    // Overview elements
    this.totalLabel = page.locator('.summary_total_label');
    
    // Final Thank you screen elements
    this.completeHeader = page.locator('.complete-header');
    this.completeText = page.locator('.complete-text');
    this.backHomeButton = page.locator('[data-test="back-to-products"]');
  }

  async clickFinish() {
    await this.finishButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async getSummaryTotal() {
    const text = await this.totalLabel.textContent();
    return text || '';
  }

  async getCompleteHeader() {
    const text = await this.completeHeader.textContent();
    return text || '';
  }

  async clickBackHome() {
    await this.backHomeButton.click();
  }
}

module.exports = { ConfirmationPage };
