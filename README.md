# Order Sparkle

Phase 1 Jewellery Ecommerce Website

Build a production-ready, premium and scalable ecommerce website for a jewellery store.

Core Concept

Phase 1 does not include online payments or customer login/signup.

The customer flow is:

Browse → Product Details → Cart → Customer Details → Request Order → Backend creates Order → Generate Order ID → Open WhatsApp

The owner then contacts the customer through WhatsApp, confirms availability/payment, collects payment manually and fulfils the order.

WhatsApp is only the communication channel. The database is the source of truth.

Customer Website

Create:

Home

Shop/Product Listing

Categories

Product Details

Search

Filtering/sorting

Cart

Guest Order Request

Order Success page

Product

Products should support:

Name

SKU

Description

Price

Images/gallery

Category

Material/details

Size/variant where applicable

Availability/stock

Featured/New Arrival flags

Do not hardcode products, categories or prices in the frontend.

Cart

Support:

Add/remove products

Quantity changes

Variant selection where applicable

Subtotal

Empty-cart state

Persistent cart across refreshes

Continue shopping

Request Order

Do not show "Pay Now". Use Request Order / Send Order Request.

Guest Order Request

No customer account is required.

Collect:

Full name

Mobile number

Email (optional)

Address

City

State

Pincode

Customer note (optional)

Validate all fields properly with clear inline errors.

Preserve entered data when validation fails.

Order Creation

When the customer submits an order:

Frontend → Backend → Database → WhatsApp

The backend must:

Validate the request.

Validate products and availability.

Retrieve actual prices from the database.

Calculate totals server-side.

Create the customer/order/order-item records.

Generate a unique human-readable Order ID such as ORD-20260816-0001.

Set status to PendingConfirmation.

Return the Order ID/message information.

Never trust frontend prices or totals.

Prevent accidental duplicate submissions and disable the submit button while processing.

The order must be successfully stored before WhatsApp is opened.

WhatsApp Handoff

After successful order creation, open WhatsApp with a pre-filled message containing:

Store name

Order ID

Customer name

Products

Quantities

Prices

Total

Delivery location

Customer note

Do not require WhatsApp Business API in Phase 1.

Keep WhatsApp functionality isolated so a WhatsApp Business API can be added later.

If WhatsApp fails to open, the order must still exist in the Admin Portal.

Admin Portal

Create a separate authenticated /admin area.

Dashboard

Show:

Total orders

Pending confirmation

Confirmed

Payment pending

Processing

Shipped

Delivered

Cancelled

Recent orders

Order Management

Admin can:

Search/filter/sort orders

View complete order details

View customer details

View products and quantities

Update order status

Update payment status

Add internal notes

Cancel orders where appropriate

Order statuses:

PendingConfirmation → Confirmed → PaymentPending → PaymentReceived → Processing → Shipped → Delivered

Also support Cancelled.

Customer Management

Customers do not need accounts, but their information must be permanently stored.

Admin should be able to see:

Name

Phone

Email

Address

Previous orders

Number of orders

Total order value

Design the data model so customer accounts/UserId can be introduced later.

Product & Category Management

Admin can:

Add/edit/archive products

Manage images

Update prices

Update availability/stock

Manage SKU/details

Create/edit/archive categories

Assign products to categories

Mark featured/new products

Do not hard-delete products referenced by historical orders.

Historical orders must retain their original product information and price.

Database / Architecture

Use a clean relational design with entities such as:

Users/AdminUsers, Customers, Addresses, Products, ProductImages, Categories, Orders, OrderItems, OrderStatus, PaymentStatus

Use proper:

Primary/foreign keys

Indexes

Constraints

CreatedAt/UpdatedAt

Decimal money fields

Referential integrity

Keep frontend, API, business logic, database access, authentication and integrations separated.

Avoid giant components, duplicated code and hardcoded business logic.

Security & Reliability

Implement:

Secure admin authentication/authorization

Backend validation

Protected admin APIs

Password hashing

Proper error handling

Rate limiting where appropriate

Protection against manipulated prices/order totals

Duplicate submission protection

Never expose internal exceptions/database errors to customers.

Use user-friendly loading, success, error, empty and retry states throughout the application.

Every button/form/interaction must have a real working behavior. Avoid dead buttons or placeholder functionality.

UI / UX

Create a premium jewellery brand aesthetic, not a generic ecommerce/SaaS template.

Use:

Elegant typography

Serif display font for branding/headings

Clean sans-serif for UI/body

Black/charcoal

Ivory/off-white

Gold/champagne accents

Generous spacing

High-quality product imagery

Subtle animations

Clean navigation

Strong visual hierarchy

Theme

Support a complete Light / Dark theme toggle.

Persist the user's selected theme.

Respect system preference initially if no preference exists.

Ensure both themes are properly designed rather than simply inverting colours.

Maintain readable contrast, buttons, forms, cards, tables and product imagery in both themes.

Admin Portal should also support the same theme system.

Responsive & Performance

Fully responsive for:

Mobile

Tablet

Desktop

Mobile UX is especially important because customers may arrive from Instagram/WhatsApp.

Implement appropriate:

Lazy-loaded routes/components

Lazy-loaded images

Responsive images

Skeleton/loading states

Efficient API calls

Code splitting where appropriate

Avoid layout shifts and unnecessary loading.

SEO & Accessibility

Implement basic:

SEO-friendly URLs

Page titles/meta descriptions

Open Graph metadata

Semantic HTML

Product image alt text

Keyboard accessibility

Proper labels

Focus states

Good colour contrast

Future-Proofing

Do not implement these in Phase 1, but architect for them:

Customer signup/login

Google authentication

My Orders

Wishlist

Saved addresses

Online payments

Payment webhooks/refunds

WhatsApp Business API

Automated notifications

Shipping integration/tracking

Coupons/discounts

Reviews

The future features should be addable without rewriting the core order/product architecture.

Phase 1 Must Deliver

Customer

Home, Shop, Categories, Product Details, Search/Filter, Cart, Guest Order Request, Order persistence, Order ID, WhatsApp handoff, Light/Dark theme.

Admin

Secure Admin Login, Dashboard, Product Management, Category Management, Order Management, Customer Information, Order/Payment Status Management, Light/Dark theme.

Critical Business Rule

Always persist the order first:

Customer → Frontend → Backend → Database → Order ID → WhatsApp

The database must remain the permanent source of truth.

Build Phase 1 as a polished real-world jewellery ecommerce application with a clean, scalable architecture rather than a prototype.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0806b4ad-d7d8-40fd-94bb-3dcdac0f1b90).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
