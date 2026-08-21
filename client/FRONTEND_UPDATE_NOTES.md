# HEXA Client Update Notes

## Backend compatibility updates
- Bundles are first-class sellable cart items (`itemType: bundle`, `bundleId`) instead of being expanded into separate products.
- Authenticated cart sync supports product and bundle items and keeps guest/authenticated carts isolated.
- Checkout sends the updated product/bundle payload and uses the backend quote endpoint for final pricing.
- Cart, checkout, account orders, invoices, and admin orders display bundles as one order line while retaining component details.
- Bundle admin UI supports create, edit, delete, component product/variant selection, and quantities.
- Coupon admin UI supports create, edit, delete, product/category/bundle targeting, limits, dates, and activation.
- Promotion/campaign admin UI supports targeted/all scope, multiple products/categories/bundles, discount settings, dates, order, create/edit/delete.
- Inventory/order delivery UI is bundle-aware and supports multiple inventory items for bundle/component delivery.

## Theme/UI fixes
- Reworked light-mode color tokens for readable text, borders, inputs, cards, dropdowns, and navigation.
- Fixed media/banner cards so text and CTA buttons stay high-contrast in light and dark mode.
- Replaced the harsh outlined active navigation treatment with neutral text plus a compact accent indicator.
- Header, footer, modal, loader, admin layout, product/order/bundle screens use theme tokens more consistently.
- Preserved purple as an accent instead of using it as the primary light-mode body/header text color.

## Setup
1. Copy `.env.example` to `.env`.
2. Set `VITE_API_URL` to the updated HEXA server API URL.
3. Run `npm install` (or `npm ci`).
4. Run `npm run dev` for development or `npm run build` for production.

The actual `.env`, `node_modules`, and `dist` folders are intentionally excluded from this package.
