# O2N User Guide

This guide explains the features currently available in the project, based on the working prototype and storefront files in the repository. It is written for end users and administrators who want to understand what the platform can do today.

## 1. Product overview

O2N is a local marketplace and shop discovery platform designed to help small businesses reach nearby customers. The current implementation is a working prototype that supports two major user journeys:

1. Seller journey: create a shop, add products, manage listings, and upload images.
2. Shopper journey: discover approved shops, browse products, filter by area, and view store details.

The project currently includes:

- a seller/admin dashboard prototype
- a public storefront for discovering approved shops
- a product catalog experience for each seller
- image upload and storage support via Supabase
- role-based login checks for sellers and administrators

This is a marketplace MVP, not yet a full e-commerce checkout system.

---

## 2. Who can use the platform?

### 2.1 Seller
A seller is a user who represents a local business and manages a shop profile and product catalog.

Seller responsibilities include:

- creating and updating a shop
- uploading a logo
- submitting the shop for approval
- listing products
- setting prices, stock, discounts, and variants
- publishing or pausing products
- managing product photos

### 2.2 Admin / super admin
Admins can access seller management structures and verify role-based authentication. Their access is controlled by role validation and permission checks.

Typical admin responsibilities implied by the code:

- approve or monitor sellers
- review shop submissions
- enforce moderation or access rules
- verify seller permissions

### 2.3 Shopper / customer
A shopper is a visitor who browses the marketplace without seller privileges. They can:

- view approved shops
- search for shops and products
- filter by location
- browse product listings
- view shop profiles and details
- share store links and QR codes

---

## 3. Main screens and workflows

### 3.1 Seller Centre
The Seller Centre is the seller dashboard. It is used to:

- login
- choose a role
- view shop information
- create or edit shops
- create or edit products
- manage status and visibility

### 3.2 Public shop discovery page
The public storefront lists approved shops. It allows shoppers to search and explore local businesses around a region.

The storefront includes:

- search bar
- district filter
- sorting options
- grid/list display switch
- shop cards
- detailed shop profile view

---

## 4. Detailed user features

## 4.1 Login and account access

### Login flow
Users can access the seller area by entering:

- email
- password

The system validates credentials with Supabase Auth.

### Role selection
The sign-in page includes a role choice between:

- seller
- admin
- FSE

The code checks the signed-in user against the expected role and permission rules before granting access.

### Access restrictions
The system blocks unauthorized users with messages such as:

- "This account is not a Seller."
- "This account is not an Admin."
- "FSE permission not enabled for this account."

### Sign out
A logged-in seller or admin can sign out from the dashboard.

---

## 4.2 Seller shop management

### Create a new shop
A seller can create a new business listing by entering:

- shop name
- description
- phone number
- address
- district
- state
- logo image

The app validates required fields before saving.

### Required details
The system requires the following important values for a new shop:

- shop name
- district
- state
- logo file

Without a logo, the shop cannot be submitted as a new listing.

### Shop logo upload
When a seller uploads a logo, the platform supports:

- JPG
- PNG
- WEBP

It validates file size and image type. The system also includes an image crop workflow for logos and supports square cropping before saving.

### Shop submission status
New shop entries are submitted as:

- pending

This means the shop is not visible as approved until administrative approval is completed.

### Edit shop
Existing shops can be edited at any time. A seller can update:

- name
- description
- contact number
- address
- district
- state
- logo

The current app also informs sellers whether the shop is approved or pending.

### Shop approval logic
The app checks whether a shop is approved before allowing product publishing. This ensures shops are reviewed before they fully go live.

---

## 4.3 Product management

### Add a new product
A seller can add a product with the following information:

- title
- product description
- category
- price
- compare-at price
- stock quantity
- colors
- sizes
- product images
- product publish status

### Price and discount flow
The product form includes fields for:

- MRP
- discount percentage

The interface shows the result in real time:

- selling price
- savings amount

The calculation is:

- selling price = MRP × (1 - discount / 100)
- discount amount = MRP × discount / 100

This allows a seller to quickly determine the final selling price.

### Product status states
The app handles product lifecycle states such as:

- pending
- active
- archived
- paused/inactive style behavior in UI logic

The seller can:

- save as pending
- publish immediately
- pause active listings
- archive old listings
- edit later

### Edit product
A seller can re-open an existing product and change:

- title
- description
- category
- pricing
- stock
- sizes
- colors
- product media

Products can be updated without losing previously stored image references.

### Product variants
The platform supports product variant metadata such as:

- colours
- sizes

These are stored as comma-separated values and saved as structured variant options.

### Product stock management
The seller can set stock quantity for each product, which is displayed in the seller dashboard.

### Seller product list
The product list includes details such as:

- product name
- price
- original price
- discount percentage
- stock level
- status
- variant summary
- edit action
- publish/pause action
- archive action

---

## 4.4 Product image upload

### Image limits
A seller can upload multiple product images. The app supports:

- up to 8 images per product
- JPG
- PNG
- WEBP
- GIF
- file size up to 5 MB each

### Upload behavior
When an image is selected:

- preview is displayed
- validation checks file format and size
- uploaded assets are saved to Supabase Storage
- public image URLs are stored in the product image table

### Multiple image support
The platform can add more than one image to a product. The UI also maintains sort order for uploaded images.

---

## 4.5 Shop logo crop workflow

The seller dashboard includes a crop modal for logo editing.

Features in the crop flow include:

- zoom adjustment
- drag and move the image within a crop frame
- crop preview before final save
- output stored as a square image
- convert to JPG format before upload

This is useful for keeping store branding consistent across the storefront.

---

## 5. Public storefront experience

The public storefront in the raw HTML shop page allows shoppers to discover approved local businesses.

### 5.1 Homepage storefront layout
The homepage includes:

- header navigation
- branded hero section
- search bar
- district filter
- sort selector
- grid/list display controls
- list of shops

### 5.2 Search and discovery
Visitors can search by:

- shop name
- product title
- district or state information
- general text terms

The app filters visible lists in real time and updates the count of matching shops.

### 5.3 Filters
Users can filter by:

- all locations
- selected district

### 5.4 Sorting options
Shoppers can sort by:

- alphabetical shop name
- newest shop entries
- most products

### 5.5 Grid/list display
The storefront includes two viewing modes:

- grid view
- list view

This helps users browse shops in a style that matches their preference.

---

## 6. Detailed shop profile experience

When a shopper clicks a shop, they open a dedicated shop page with:

- shop logo
- shop name
- location information
- description
- share button
- copy link button
- QR code for the shop
- product grid for that shop

### Share functionality
The shop page offers:

- native browser share if supported
- copy to clipboard
- QR-based sharing

### QR code generation
The app generates a QR code from the shop URL and displays it on the page so people can scan and open the shop instantly.

---

## 7. Product browsing for shoppers

A shopper can view products inside a selected shop and see:

- product image
- title
- price
- compare-at/original price
- discount percentage
- overall product preview

The storefront does not show a full checkout flow yet, but it does present product information in a retail-oriented catalog style.

---

## 8. Admin and moderation features

The seller/admin prototype includes checks for:

- admin role
- super admin role
- FSE permission-based access
- role validation before redirecting to admin screens

The system calls an RPC named `has_admin_permission` to verify whether an account can access moderation-related features.

These features reflect an early admin console model for shop moderation and role management.

---

## 9. User experience features

The app includes several UX touches that improve the seller and shopper experience:

- live value calculation while typing
- dynamic page updates after save
- success and error messaging
- smooth scroll to forms after editing
- hidden or shown sections depending on state
- responsive layouts for smaller screens
- grid/list switching for store browsing
- product count display per shop
- graceful empty-state messages when no data exists

---

## 10. Data and storage model

The app uses Supabase for:

- authentication
- database records
- static and media storage

Main logical records include:

- profiles
- shops
- categories
- products
- product_images

Storage bucket used:

- product-images

This means the MVP is built around a cloud database and media storage system rather than a local-only app.

---

## 11. What is currently available vs. what is not

### Available now
- seller registration workflow and login
- seller shop creation/editing
- product creation/editing
- pricing and discount calculation
- product media upload
- approval-based seller flow
- public shop discovery
- filtering, sorting, and layout toggles
- share and QR functionality
- admin role checks

### Not available in this reviewed code
- full shopping cart
- add-to-cart button
- checkout process
- payment system
- order placement
- order tracking
- shipping integration
- inventory reservation across multiple carts

This is important: the current app is a storefront and seller management prototype, not a complete commerce backend.

---

## 12. Typical user journeys

### Journey A: Seller creates a shop
1. Sign in to the Seller Centre.
2. Choose the role as Seller.
3. Click to add a new shop.
4. Fill out the shop data.
5. Upload a logo.
6. Submit the shop for approval.
7. Wait for approval before publishing products.

### Journey B: Seller adds a product
1. Sign in.
2. Open an approved shop.
3. Fill product details.
4. Enter MRP and discount.
5. Add colors and sizes.
6. Upload product photos.
7. Save and publish or save as pending.

### Journey C: Shopper browses the marketplace
1. Open the storefront.
2. Search for a shop or product.
3. Filter by district.
4. Sort by name/newest/products.
5. Switch between grid/list.
6. Open a shop.
7. View products and pricing.
8. Share or copy a shop link.

---

## 13. Best practices for users

To get the best experience:

- use a clear shop name and description
- upload a professional logo
- keep district and state accurate
- provide valid product information and stock numbers
- use realistic discounts and price comparisons
- add good product images for better presentation
- check approval state before publishing products

---

## 14. Final summary

O2N currently functions as a community marketplace prototype with a focus on small local sellers and public discovery. It supports:

- seller management
- shop creation and editing
- product listings and media upload
- shop approval flow
- public browsing and filtering
- storefront product discovery
- sharing and QR access

What it does not yet include is a full e-commerce transaction flow such as cart, checkout, and payments. The existing product is best understood as a local marketplace MVP designed to bring sellers and buyers together around approved local shops.

This guide reflects the currently available features in the reviewed codebase and should be treated as the product documentation for the existing implementation.
