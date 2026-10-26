# testmaadu.mart demo store v2.0 (created by TestMaadu.in)

A demo ecommerce shop for showing every TestMaadu SmartInspector tab: Find Element, Log a Bug, Live Page APIs, Swagger, Performance, Security and AI Chatbot.
Plain HTML, CSS and JavaScript plus a small Node API. No build step, no npm install, no database. Formerly "OnlineMart".

Open **/demo.html** (Demo guide) for a step-by-step script per TestMaadu tab.

## Demo accounts
| Role | Email | Password | Can do |
|---|---|---|---|
| Admin | `admin@testmaadu.in` | `Admin@123` | Add, edit, delete products (Admin page), see all orders |
| Customer | `customer@testmaadu.in` | `Demo@123` | Shop, pay, own orders. Blocked from Admin |

`demo@testmaadu.in / Demo@123` still works as a customer (older videos). Any other email with a 6+ character password signs in as a customer.
Card: any 16 digits (4111 1111 1111 1111), any month/year, any 3 digit CVV, then OTP **123456** in the 3-D Secure box.

## Pages
| Page | What is on it |
|---|---|
| `index.html` Market | search with suggestions (listbox), category dropdown, hover "Shop by category" menu, max price slider, checkboxes, sort radios, product cards with random button ids, Quick view dialog, Free delivery tooltip, wishlist, toast with Undo, deal countdown, "Recommended for you" (loads late) |
| `product.html?id=P101` | quantity +/−, Add to cart, Buy now, **Check delivery in shadow DOM** (`<om-pincode>`), tabs (Description / Reviews / Questions), star rating input, accordion, reviews from GraphQL |
| `cart.html` | quantity dropdowns, Remove (browser `confirm()`), Clear cart (custom dialog), coupons |
| `checkout.html` | saved address dropdown, address form, delivery date picker, delivery radio cards, gift wrap, payment radios, **card form in an iframe with an OTP iframe inside it** |
| `orders.html` | cards or **Table view**: sortable headers, 10 rows a page, row checkboxes, View / Return (file upload) / Invoice dialogs |
| `account.html` | single-page app: Overview, Addresses (add/edit/delete/default), Wishlist, Notifications. Tabs change the URL without a reload |
| `admin.html` | admin only: Products table, Add / Edit product dialog with photo upload, Delete, All orders. Customers see "You need admin access" |
| `profile.html` | sign in with Admin / Customer buttons, personal details and preferences |
| `demo.html` | Demo guide |
| `help.html`, `api-docs.html` | FAQ + support chat iframe; Swagger UI for `openapi.json` |

Header: notification bell polled every 30 seconds (XMLHttpRequest). Footer: **Reset demo data** (signs out, clears cart, orders, wishlist and added products in this browser).

## Admin adds a product, customer buys it
Admin → Admin page → Add product (name, category, price, MRP, stock, description, photo). It shows first in Market with a **New** badge.
Sign out, sign in as Customer in the same browser, add 2 of it and pay.
Products are kept per browser (`X-Demo-Session` header, a random id in localStorage), so visitors never see each other's products. The browser keeps a copy, so a server restart (Vercel cold start) does not lose them; the cart sends the product details along for that case.

## Planted bugs (Log a Bug)
| Bug | How to see it | Evidence |
|---|---|---|
| Payment fails with 1 item | Cart with exactly 1 item → Place order | `POST /api/checkout` 402 PAYMENT_FAILED, GW-5001. 2+ items succeed |
| Coupon that lies | Cart → coupon `FESTIVE20` | Says "applied, 20% off", total unchanged, nothing sent to the API |
| "Saved" when it was not | Profile → mobile `+91 98765 43210` → Save | `PUT /api/profile` 400 INVALID_PHONE, page shows "Profile saved" |
| Console crash | Market → heart on sold-out Nimbus Bluetooth Speaker | `TypeError: Cannot read properties of undefined (reading 'notify')` |
| Search stuck | Search `kid's` | `GET /api/products?q=kid's` 500 with SQL text and stack trace, page stays on "Loading products..." |

## Performance
`GET /products` fast; with `q` 300 to 800 ms and **30 searches a minute per visitor**, then 429 with `Retry-After`.
`GET /recommendations` 400 to 900 ms, about 3 in 10 calls take 2 to 3 seconds. `POST /checkout` about 400 ms.

## Security findings (all fake data, nothing runs from user input)
Checked with TestMaadu V9.11.4's own security rules on Market, Checkout and Sign in:
missing CSP / X-Frame-Options / nosniff / Referrer-Policy / Permissions-Policy; JWT in localStorage (HS256 shared secret, 30 days, email and phone inside);
`om_session` cookie without HttpOnly / SameSite / Secure, 45 days; `X-Powered-By: Express/4.17.1` (and `Server: nginx/1.18.0` on the API);
source map on Market; staging host call on Sign in (`staging-api.testmaadu-mart.test`); password in an HTML comment and `paymentApiKey` hidden field on Checkout;
CORS on the API echoes any Origin with credentials.
Access bugs for generated tests: `GET /api/orders/OM-20261013-51862` returns another customer's order (IDOR); `PUT /api/products/{id}` works with a customer token (POST and DELETE correctly return 403).

## AI chat box (Ask AI)
Same as v1.3 (quick replies correct; wrong Denim Jacket price ₹2,199; prompt injection leaks STAFF50; Keerthana/Priya/Rahul data leak; HTML shown as elements; poem not refused; >1,500 characters = 500; system prompt sent from the browser) plus two new weak spots:
"Is FREE100 valid?" or "new customer coupon" invents coupon FREE100; "Do you deliver to 000000?" promises delivery to any PIN code. Model name `testmaadu-mart-assistant-1`.

## API (all under /api, full spec in `/openapi.json`)
Auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` · Catalog: `GET /categories`, `GET /products`, `GET /products/{id}`, `GET /search/suggest`, `GET /recommendations`, `GET /delivery/check`
Reviews: `GET /products/{id}/reviews`, `POST /graphql` (GetReviews, GetRatingSummary) · Cart: `POST /cart/quote` · `POST /checkout` · Orders: `GET /orders`, `GET /orders/{id}`
Account: `GET/PUT /profile`, `GET/POST /wishlist`, `DELETE /wishlist/{id}`, `GET/POST /addresses`, `PUT/DELETE /addresses/{id}`, `GET /notifications`
Admin: `POST /products`, `PUT /products/{id}`, `DELETE /products/{id}`, `GET /admin/orders` · `GET /health`, `POST /chat`

Everything is kept in memory. Each customer also gets 22 sample past orders so the orders table has pages.

## Run locally
Needs Node 18 or newer: `node server.js`, then open http://localhost:3000

## Deploy (same Vercel project as before)
Upload everything in this folder to the root of the GitHub repo (replace the old files; nothing needs deleting). Vercel redeploys on its own. Framework preset **Other**, no build settings.
Check: `/api/health` says version 2.0.0, then follow the Demo guide.
