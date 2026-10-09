// Discount arithmetic shared by every checkout path (Stripe, PayPal, manual, free).
// Mirrored for display in src/app/features/site/discountMath.ts (discountMath.parity.test.ts).
// Items are server-priced lines; gift-card lines and a free-gift line are never discounted.
const { bogoPercent } = require("./localFulfillment");

function moneyFmt(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// Gift cards are bought at face value and the free-gift line is paid for by its own discount.
const discountableItems = items => (items || []).filter(item => item && item.giftCard !== true && item.promoGift !== true);

// Computes the discount amount from server-trusted item prices.
// booksById maps item.id -> book data (for category targeting).
function computeDiscountAmount(discount, items, booksById) {
  // Never more than the books cost (a 150% tier must not eat into shipping and tax), never negative.
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const raw = Number(computeRawDiscountAmount(discount, items, booksById)) || 0;
  return capDiscountAmount(discount, Math.max(0, Math.min(raw, subtotal)));
}

// Optional "Maximum discount" ceiling (CA$) set on a code; never raises an amount.
function capDiscountAmount(discount, amount) {
  const cap = Number(discount && discount.maxDiscountAmount);
  return cap > 0 && amount > cap ? cap : amount;
}

function computeRawDiscountAmount(discount, items, booksById, ctx = {}) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (discount.minOrderAmount && subtotal < Number(discount.minOrderAmount)) {
    throw new Error(`This code requires a minimum order of ${moneyFmt(discount.minOrderAmount)}.`);
  }
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  if (discount.minQuantity && totalQty < Number(discount.minQuantity)) {
    throw new Error(`This code requires a minimum of ${discount.minQuantity} items.`);
  }

  // 1. BOGO Calculation
  if (discount.type === "bogo") {
    const buyQty = Number(discount.buyQuantity) || 1;
    const getQty = Number(discount.getQuantity) || 1;
    const getVal = bogoPercent(discount.getDiscountValue);

    let qualItems = [];
    if (discount.appliesTo === "categories") {
      const selected = discount.selectedCategories || [];
      qualItems = items.filter(i => {
        const cats = (booksById[i.id] && booksById[i.id].categories) || [];
        return cats.some(c => selected.includes(c));
      });
      if (qualItems.length === 0) {
        throw new Error("This BOGO code only applies to specific categories not in your cart.");
      }
    } else if (discount.appliesTo === "products") {
      const selected = discount.selectedProducts || [];
      qualItems = items.filter(i => selected.includes(i.id));
      if (qualItems.length === 0) {
        throw new Error("This BOGO code only applies to specific products not in your cart.");
      }
    } else {
      qualItems = items;
    }

    const unitPrices = [];
    qualItems.forEach(i => {
      for (let k = 0; k < i.quantity; k++) {
        unitPrices.push(i.price);
      }
    });

    const totalQualUnits = unitPrices.length;
    const requiredUnits = buyQty + getQty;
    if (totalQualUnits < requiredUnits) {
      throw new Error(`This code requires buying at least ${requiredUnits} qualifying items.`);
    }

    unitPrices.sort((a, b) => b - a);

    const sets = Math.floor(totalQualUnits / requiredUnits);
    const discountQty = sets * getQty;

    let discountAmount = 0;
    const cheapestUnits = unitPrices.slice(-discountQty);
    cheapestUnits.forEach(price => {
      discountAmount += price * (getVal / 100);
    });

    return discountAmount;
  }

  // 2. Tiered Calculation
  if (discount.type === "tiered") {
    const tiers = discount.tiers || [];
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return 0;
    }

    let qualSubtotal = subtotal;
    if (discount.appliesTo === "categories") {
      const selected = discount.selectedCategories || [];
      qualSubtotal = items.reduce((s, i) => {
        const cats = (booksById[i.id] && booksById[i.id].categories) || [];
        return cats.some(c => selected.includes(c)) ? s + i.price * i.quantity : s;
      }, 0);
      if (qualSubtotal === 0) {
        throw new Error("This tiered code only applies to specific categories not in your cart.");
      }
    } else if (discount.appliesTo === "products") {
      const selected = discount.selectedProducts || [];
      qualSubtotal = items.reduce(
        (s, i) => (selected.includes(i.id) ? s + i.price * i.quantity : s), 0
      );
      if (qualSubtotal === 0) {
        throw new Error("This tiered code only applies to specific products not in your cart.");
      }
    }

    const sortedTiers = [...tiers].sort((a, b) => Number(b.minSpend) - Number(a.minSpend));
    const matchingTier = sortedTiers.find(t => qualSubtotal >= Number(t.minSpend));

    if (!matchingTier) {
      const lowestMinSpend = Math.min(...tiers.map(t => Number(t.minSpend)));
      throw new Error(`This code requires a minimum spend of ${moneyFmt(lowestMinSpend)} on qualifying items.`);
    }

    const val = Number(matchingTier.value);
    if (matchingTier.type === "percentage") {
      return qualSubtotal * (Math.min(100, Math.max(0, val)) / 100);
    } else if (matchingTier.type === "fixed") {
      return Math.min(val, qualSubtotal);
    }
    return 0;
  }

  // 3. Legacy Percentage & Fixed Calculation
  let qualifying = subtotal;
  if (discount.appliesTo === "categories") {
    const selected = discount.selectedCategories || [];
    qualifying = items.reduce((s, i) => {
      const cats = (booksById[i.id] && booksById[i.id].categories) || [];
      return cats.some(c => selected.includes(c)) ? s + i.price * i.quantity : s;
    }, 0);
    if (qualifying === 0) throw new Error("This code only applies to specific categories not in your cart.");
  } else if (discount.appliesTo === "products") {
    const selected = discount.selectedProducts || [];
    qualifying = items.reduce(
      (s, i) => (selected.includes(i.id) ? s + i.price * i.quantity : s), 0
    );
    if (qualifying === 0) throw new Error("This code only applies to specific products not in your cart.");
  }

  // 4. Free gift: the gift's own catalog price (worked out by the caller, who adds the gift line).
  if (discount.type === "gift") {
    const price = Number(ctx.giftPrice);
    if (!Number.isFinite(price) || price < 0) throw new Error("The free gift is not available right now.");
    return price;
  }
  if (discount.type === "percentage") return qualifying * (Math.min(100, Math.max(0, Number(discount.value))) / 100);
  if (discount.type === "fixed") return Math.min(Number(discount.value), qualifying);
  return 0;
}

// A free gift's discount is exactly the gift line's price (it is added to the order), never capped.
function discountAmountFor(discount, items, booksById, ctx = {}) {
  if (discount && discount.type === "gift") {
    computeRawDiscountAmount(discount, items, booksById, ctx); // conditions + availability
    return Math.max(0, Number(ctx.giftPrice) || 0);
  }
  return computeDiscountAmount(discount, items, booksById);
}

// Automatic discounts (no code): one per order at most. The biggest saving wins; a free-shipping
// offer applies only when no other offer does. Ties go to the oldest id so every path agrees.
// `giftPriceOf(discount)` returns the free gift's price, or NaN when it can't be given.
// Returns { discount, amount, freeShipping } or null.
function pickAutomaticDiscount(discounts, items, booksById, giftPriceOf = () => NaN) {
  const sorted = [...(discounts || [])].filter(Boolean).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  let best = null;
  for (const discount of sorted) {
    if (discount.type === "freeship") continue;
    let amount = 0;
    try {
      amount = discountAmountFor(discount, items, booksById, { giftPrice: discount.type === "gift" ? giftPriceOf(discount) : undefined });
    } catch {
      continue;
    }
    const cents = Math.round(amount * 100);
    if (cents > 0 && (!best || cents > Math.round(best.amount * 100))) best = { discount, amount: cents / 100, freeShipping: false };
  }
  if (best) return best;
  for (const discount of sorted) {
    if (discount.type !== "freeship") continue;
    try {
      computeRawDiscountAmount(discount, items, booksById);
      return { discount, amount: 0, freeShipping: true };
    } catch {
      // Conditions not met.
    }
  }
  return null;
}

module.exports = { moneyFmt, discountableItems, computeDiscountAmount, capDiscountAmount, computeRawDiscountAmount, discountAmountFor, pickAutomaticDiscount };
