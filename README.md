# OnlineMart demo store (created by TestMaadu.in)

A small ecommerce site for demoing TestMaadu: functional, end-to-end and API testing.
Plain HTML, CSS and JavaScript plus a tiny Node API. No build step, no npm install, no database.

## Pages
| Page | What is on it |
|---|---|
| `index.html` Market | search text box, category dropdown, 3 checkboxes, sort radio buttons, product links, wishlist, Add to cart |
| `product.html?id=P101` | quantity +/−, Add to cart, Buy now, breadcrumb links |
| `cart.html` | quantity dropdowns, Remove, coupon text box (TESTMAADU10, FREESHIP) |
| `checkout.html` | address form (text boxes, textarea, state dropdown), delivery radio cards, gift wrap checkbox, payment radio (Card / UPI / COD), **card form inside an iframe** (`pay-frame.html`), terms checkbox + link |
| `orders.html` My orders | order cards, search box, time-range dropdown, expandable order details, Buy again |
| `profile.html` | sign in form (show password, remember me), then profile tabs with radio buttons, dropdown, checkboxes, Save |
| `help.html` | FAQ, terms, **support chat inside an iframe** (`support-frame.html`) |
| `api-docs.html` | Swagger UI for `openapi.json` |

Every page footer says "Created by TestMaadu.in".

## Demo login
`demo@testmaadu.in` / `Demo@123` (or any email with a 6+ character password).
Card: any 16 digits, for example `4111 1111 1111 1111`, any month/year, any 3 digit CVV.

## Same price, different products (dynamic elements demo)
**Aurora Wireless Headphones (P101)** and **Classic Denim Jacket (P105)** both cost **₹2,499** (MRP ₹3,999, 38% off). Their cards look alike and their position changes with sort and filters, so a locator such as "the Add to cart next to ₹2,499" matches two products. Use them to show locating by the product name instead of by price or position.

## The intentional bug
`POST /api/checkout` returns **402 PAYMENT_FAILED** ("Payment could not be processed", code GW-5001) whenever the cart has exactly **1 item in total** (one product with quantity 1). Two or more items (two products, or one product with quantity 2) succeed with **201** and the order shows in My orders.
The bug is only in the API, so it shows up in the UI, in Log a Bug network capture, and in API Tests.

## API (all under /api)
`GET /health`, `POST /auth/login`, `GET /categories`, `GET /products`, `GET /products/{id}`, `POST /cart/quote`,
`POST /checkout`, `GET /orders`, `GET /orders/{id}`, `GET /profile`, `PUT /profile`.
Checkout, orders and profile need `Authorization: Bearer <token>` from login. Full spec: `/openapi.json` (use it in TestMaadu's Swagger test).

Orders are kept in server memory. On Vercel they can reset when the function goes cold; the browser keeps its own copy, so My orders always shows orders placed from that browser.

## Run locally
Needs Node 18 or newer.
```
node server.js
```
Open http://localhost:3000

## Deploy on Vercel (separate project, keep testmaadu.in untouched)
1. Create a new GitHub repo, for example `onlinemart-demo`.
2. Upload everything in this folder to the repo root (index.html, api/, assets/, vercel.json, openapi.json and the rest). Biggest file is about 1.5 MB, well under GitHub's 25 MB web upload limit.
3. In Vercel: Add New > Project > import the repo. Framework preset: **Other**. Leave build and output settings empty. Deploy.
4. Optional: Settings > Domains > add `shop.testmaadu.in`, then in GoDaddy DNS add a CNAME record `shop` pointing to the value Vercel shows.
5. Check: open `/api/health` (should say ok) and place one order with 1 item (fails) and one with 2 items (succeeds).
