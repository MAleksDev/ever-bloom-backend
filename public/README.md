
# Ever Bloom E-commerce Project (Demo)

Welcome to the **"Ever Bloom"** demo e-commerce project, created as part of a portfolio showcase. This application demonstrates a complete shopping cycle, from product display to payment processing and inventory management.

---

## Table of Contents

- [Project Description](#project-description)  
- [Features](#features)  
- [Technologies Used](#technologies-used)  
- [Setup and Installation](#setup-and-installation)  
  - [Prerequisites](#prerequisites)  
  - [Installing Dependencies](#installing-dependencies)  
  - [Environment Variables Configuration (.env)](#environment-variables-configuration-env)  
  - [Airtable Configuration](#airtable-configuration)  
- [Running the Application](#running-the-application)  
- [Important Notes (Demo Environment)](#important-notes-demo-environment)  
- [Contact](#contact)

---

## Project Description

**Ever Bloom** is a demo online store offering handmade decorations. The project was built for educational and portfolio purposes, showcasing the integration of a frontend (HTML, CSS, JavaScript) with a backend (Node.js/Express.js) and external services like **Stripe** for payment processing and **Airtable** for product and order data management.

> ⚠️ This is a DEMO application – no real purchases are made on this website.

---

## Features

- **Product Display**: Dynamic loading of product details based on a URL ID.
- **Product Information**: Presentation of product name, price, description, and an image gallery.
- **Stock Level Check**: Real-time verification of product availability using Airtable.
- **Stripe Checkout Integration**: Secure redirection to the Stripe payment form.
- **Order Logging**: Saving details of successful payments to an Airtable database (`Zamówienia` / `Orders` table).
- **Inventory Update**: Automatic reduction of product stock levels in Airtable after a successful payment.
- **Responsive Design**: The website adapts to various screen sizes (desktop, tablet, mobile).

---

## Technologies Used

### Frontend:
- HTML5  
- CSS3  
- JavaScript (ES6+)  
- Stripe.js (Stripe client-side library)

### Backend:
- Node.js  
- Express.js  
- Stripe Node.js Library  
- Airtable.js  
- dotenv  
- cors

### Database/CMS:
- Airtable (for product and order management)

---

## Setup and Installation

To get this project running locally, follow the steps below.

### Prerequisites

- Node.js (version 14.x or newer)  
- Stripe Account (in test mode)  
- Airtable Account

### Installing Dependencies

1. Clone the repository (if hosted) or navigate to your project directory.
2. Open your terminal in the root project directory (`package.json` and `server.js` should be here).
3. Run:

   ```bash
   npm install express stripe airtable cors dotenv
   ```

---

### Environment Variables Configuration (.env)

Create a `.env` file in the root of your project and add:

```
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
AIRTABLE_API_KEY=patYOUR_AIRTABLE_PERSONAL_ACCESS_TOKEN
AIRTABLE_BASE_ID=appYOUR_AIRTABLE_BASE_ID
```

- `STRIPE_SECRET_KEY`: Found in Stripe Dashboard → Developers → API keys.
- `AIRTABLE_API_KEY`: Create in Airtable Developer Hub → Personal access tokens. Required scopes:  
  - `schema.bases:read`  
  - `data.records:read`  
  - `data.records:write`
- `AIRTABLE_BASE_ID`: Found in Airtable API docs (Help → API documentation).

---

### Airtable Configuration

Create a base in Airtable.

#### Table 1: `Products` (Produkty)

Field names (case-sensitive):

- `ID Product` – Number (Auto-number or regular Number)  
- `Product Name` – Single line text  
- `Description` – Long text  
- `Price` – Currency (e.g., GBP)  
- `Stock` – Number (integer)  
- `Image` – Attachment  
- `Status` – Single select (`available`, `unavailable`)  
- `Additional Images` – Attachment (optional)

Example rows:

| ID Product | Product Name                  | Price | Stock | Status     |
|------------|-------------------------------|-------|-------|------------|
| 1          | Carved wooden monkeys         | 27.50 | 2     | available  |
| 2          | Porcelain teacup and saucer   | 23.99 | 2     | available  |

> ☑️ Upload actual images in the `Image` field!

#### Table 2: `Zamówienia` (Orders)

Columns:

- `ID zamówienia` – Single line text  
- `Produkt` – Single line text  
- `Kwota` – Number  
- `Data` – Date  
- `Status` – Single select (must include `Zakończone`)

Ensure `success.html` and `cancel.html` exist in your public directory.

---

## Running the Application

1. Complete all previous configuration steps.
2. Start the server:

   ```bash
   node server.js
   ```

3. Open in your browser:

   ```
   http://localhost:3000/ever-bloom.html?id=1
   ```

   Replace `id=1` with a valid product ID from Airtable.

---

## Important Notes (Demo Environment)

- **Demo Only**: Do **not** enter real personal or payment info.
- **Test Payment** (Stripe):

  ```
  Card Number: 4242 4242 4242 4242
  Expiration: Any future date (e.g., 12/28)
  CVC: Any 3-digit number (e.g., 123)
  ```

- **Warnings**: Ignore browser warnings about WebAssembly/CSP when testing Stripe.

- **Inventory**: After a successful payment:
  - Stock is reduced in Airtable.
  - New record appears in the `Zamówienia` (Orders) table.

---

## Contact

If you have any questions or would like to know more about the project, feel free to contact me.
