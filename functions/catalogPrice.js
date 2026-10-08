// The unit price the shop charges for one catalog line. Mirrors catalogUnitPrice in
// src/app/CartContext.tsx: an edition's own price (an edition with no price is not for
// sale), else the sale price only when it is a positive number, else the retail price.
// NaN means "no usable price": callers refuse the line instead of charging $0.
function catalogUnitPrice(book, variant) {
  if (variant) {
    const own = variant.price;
    return own === undefined || own === null || own === "" ? NaN : Number(own);
  }
  return book && book.isOnSale && Number(book.salePrice) > 0 ? Number(book.salePrice) : Number(book && book.retailPrice);
}

module.exports = { catalogUnitPrice };
