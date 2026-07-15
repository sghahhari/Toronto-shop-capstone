# Build Spec — "Toronto Shop" E-Commerce Capstone

## Overview
Multi-category store (watches, clothing, shoes — men's and women's) with customer accounts, order tracking, demo Stripe payment, and an admin panel. Built entirely with Terraform. Serverless AWS stack.

## Architecture

**Frontend:** S3 static website hosting, plain HTML/CSS/JS + Tailwind via CDN (no build step, still looks polished).

**Auth:** Cognito User Pool with two groups: `Admin` and `Customer`. Signup defaults new users to `Customer`. Admin group membership assigned manually (via console or a one-time CLI command) — do not expose "become admin" in the UI.

**API:** API Gateway (HTTP API) with a Cognito JWT authorizer. Public routes (product browsing) skip auth; everything else requires a valid token; admin routes additionally check the `cognito:groups` claim inside the Lambda.

**Data (DynamoDB):**
- `products` — PK `productId`. Attributes: `name`, `description`, `price`, `category` (watches/clothing/shoes), `gender` (men/women/unisex), `imageUrl`, `stock`.
- `orders` — PK `orderId`. Attributes: `userId`, `items`, `total`, `status`, `createdAt`, `shippingAddress`. **GSI on `userId`** so customers can fetch their own order history and admin can list everything.
- `profiles` — PK `userId` (Cognito `sub`). Attributes: `name`, `email`, `phone`, `shippingAddress`.

**Payment:** Stripe test mode — Checkout Session or PaymentIntent with a test secret key. Order is written as `status: "Pending Payment"` until Stripe confirms, then updated to `"Confirmed"`.

**Messaging:** SNS topic, email subscription, fires on order confirmation.

**Monitoring:** CloudWatch Logs (automatic with Lambda) — no extra work needed.

**Images:** Use a free placeholder image service, no licensing/attribution needed for a demo — e.g. `https://picsum.photos/seed/<product-slug>/600/600` gives a consistent image per product without hosting anything yourself. Good enough for a capstone demo; swap for real product photos later if desired.

## Order status lifecycle
`Pending Payment` → `Confirmed` → `Shipped` → `Delivered`, with `Cancelled` reachable from `Confirmed` or `Shipped` (not from `Delivered`). Admin can transition status; customer can only view it.

## Lambda functions / API routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/products` | GET | Public | List all products, optional `?category=` `&gender=` query filters |
| `/products/{id}` | GET | Public | Single product detail |
| `/orders` | POST | Customer | Create order after Stripe payment succeeds |
| `/orders/mine` | GET | Customer | Customer's own order history (via `userId` GSI) |
| `/profile` | GET | Customer | Fetch own profile |
| `/profile` | PUT | Customer | Update own profile (name, address, phone) |
| `/admin/products` | POST | Admin | Add a new product |
| `/admin/products/{id}` | PUT | Admin | Edit a product |
| `/admin/orders` | GET | Admin | List all orders |
| `/admin/orders/{id}/status` | PATCH | Admin | Cancel / update status |
| `/admin/orders/{id}/reorder` | POST | Admin | Copy a past order's items into a brand-new order for that customer |

Every Admin-tagged Lambda must check `event.requestContext.authorizer.jwt.claims['cognito:groups']` includes `Admin` before doing anything — the JWT authorizer only confirms *a* valid user, not which group.

## Frontend pages
- `index.html` — hero + category navigation (Watches / Clothing / Shoes, Men's / Women's)
- `shop.html?category=&gender=` — filtered product grid
- `product.html?id=` — product detail, add to cart
- `cart.html` — cart contents (localStorage-based), checkout button
- `checkout.html` — shipping info + Stripe test payment
- `login.html` / `signup.html` — Cognito auth
- `profile.html` — view/edit profile info
- `orders.html` — customer's own order history with status
- `admin/dashboard.html` — simple overview (order count, revenue total — optional nice-to-have)
- `admin/products.html` — add/edit product form + list
- `admin/orders.html` — all orders, cancel button, reorder button

## Things Terraform genuinely can't do — you'll need the console/CLI for these
1. **Stripe test API keys** — created in the Stripe dashboard, not AWS. Paste into Lambda env vars manually or via a `terraform.tfvars` file that's gitignored.
2. **SNS email subscription confirmation** — Terraform can create the subscription, but you must click the confirmation link AWS emails you before notifications actually deliver.
3. **Assigning the first Admin user to the `Admin` Cognito group** — do this once via AWS CLI (`aws cognito-idp admin-add-user-to-group`) or the console, after the user pool exists and you've signed up your first account.
4. **DNS / custom domain** (if you ever want `toronto-shop.com` instead of the raw S3/CloudFront URL) — not needed for the capstone, skip entirely.

## Build order (don't skip ahead — verify each layer before moving to the next)
1. DynamoDB tables (products, orders + GSI, profiles) + IAM role
2. Cognito user pool + groups, test signup/login before continuing
3. Lambda functions + API Gateway, test each route with `curl`/Postman using a real JWT before touching frontend
4. Seed the products table with sample data across all three categories, both genders
5. Frontend: shop pages first (browse → cart → checkout), then auth, then profile/orders, then admin panel last
6. Stripe test integration
7. SNS wiring + email confirmation
8. End-to-end test: signup → browse → buy → see order in profile → admin sees/cancels/reorders it

## What to cut first if time runs short
1. Admin dashboard overview page (nice-to-have, not required by rubric)
2. Reorder-for-customer (keep cancel, drop reorder)
3. Product edit (keep add-product, drop edit)
4. Category/gender filtering (fall back to one flat product grid)
