class ProductsPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.sortSelect = page.locator('[data-test="product-sort-container"]');
    this.cartLink = page.locator('.shopping_cart_link');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.inventoryItemNames = page.locator('.inventory_item_name');
    this.inventoryItemPrices = page.locator('.inventory_item_price');
  }

  async sortProducts(sortOption) {
    // Option values: 'az', 'za', 'lohi', 'hilo'
    await this.sortSelect.selectOption(sortOption);
  }

  async addProductToCart(productName) {
    const formattedName = productName.toLowerCase().replace(/\s+/g, '-');
    const addButton = this.page.locator(`[data-test="add-to-cart-${formattedName}"]`);
    await addButton.click();
  }

  async removeProductFromCart(productName) {
    const formattedName = productName.toLowerCase().replace(/\s+/g, '-');
    const removeButton = this.page.locator(`[data-test="remove-${formattedName}"]`);
    await removeButton.click();
  }

  async getCartCount() {
    if (await this.cartBadge.isVisible()) {
      const text = await this.cartBadge.textContent();
      return parseInt(text || '0');
    }
    return 0;
  }

  async goToCart() {
    await this.cartLink.click();
  }

  async getAllProductNames() {
    return await this.inventoryItemNames.allTextContents();
  }

  async getAllProductPrices() {
    const prices = await this.inventoryItemPrices.allTextContents();
    return prices.map(price => parseFloat(price.replace('$', '')));
  }
}

module.exports = { ProductsPage };
