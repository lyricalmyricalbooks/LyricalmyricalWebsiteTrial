export function validateDiscountDraft(form: any, now = new Date().toISOString().slice(0, 10)): Record<string, string> {
  const errors: Record<string, string> = {};
  const code = String(form.code || "").trim();
  if (!code) errors.code = "Enter a code customers will type at checkout.";
  else if (!/^[A-Z0-9_-]{3,32}$/i.test(code)) errors.code = "Use 3–32 letters, numbers, hyphens, or underscores.";
  if (form.type === "percentage" && !(Number(form.value) > 0 && Number(form.value) <= 100)) errors.value = "Enter a percentage between 1 and 100.";
  if (form.type === "fixed" && !(Number(form.value) > 0)) errors.value = "Enter an amount greater than zero.";
  if (form.appliesTo === "categories" && !(form.selectedCategories || []).length) errors.applies = "Choose at least one category.";
  if (form.appliesTo === "products" && !(form.selectedProducts || []).length) errors.applies = "Choose at least one book.";
  if (form.expiryDate && form.expiryDate < now) errors.expiryDate = "Choose today or a future date.";
  if (form.usageLimit !== "" && (!(Number(form.usageLimit) >= 1) || !Number.isInteger(Number(form.usageLimit)))) errors.usageLimit = "Use a whole-number limit of at least 1.";
  if (form.minOrderAmount !== "" && Number(form.minOrderAmount) < 0) errors.minOrderAmount = "Minimum order cannot be negative.";
  if (form.minQuantity !== "" && (!(Number(form.minQuantity) >= 0) || !Number.isInteger(Number(form.minQuantity)))) errors.minQuantity = "Minimum quantity must be a whole number.";
  if (form.type === "bogo" && (!(Number(form.buyQuantity) >= 1) || !(Number(form.getQuantity) >= 1) || Number(form.getDiscountValue) < 0 || Number(form.getDiscountValue) > 100)) errors.bogo = "BOGO quantities must be at least 1 and the discount must be 0–100%.";
  if (form.type === "tiered") {
    const tiers = form.tiers || [];
    if (!tiers.length || tiers.some((tier: any) => Number(tier.value) <= 0) || tiers.some((tier: any, index: number) => index > 0 && Number(tier.minSpend) <= Number(tiers[index - 1].minSpend))) errors.tiers = "Add positive discounts with minimum spends in ascending order.";
  }
  return errors;
}
