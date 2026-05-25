class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorMessage = page.locator('[data-test="error"]');
  }

  async navigate() {
    await this.page.goto('/');
  }

  async login(username, password) {
    // Fill credentials, checking for empty inputs
    if (username !== undefined && username !== 'empty_user') {
      await this.usernameInput.fill(username);
    } else {
      await this.usernameInput.fill('');
    }
    
    if (password !== undefined && password !== 'empty_pass') {
      await this.passwordInput.fill(password);
    } else {
      await this.passwordInput.fill('');
    }

    await this.loginButton.click();
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }
}

module.exports = { LoginPage };
