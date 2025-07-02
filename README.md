# Ever Bloom — Demo E-commerce Project

Welcome to the **"Ever Bloom"** demo e-commerce project, created as part of a portfolio showcase. This application demonstrates a complete shopping cycle, from product display to payment processing and inventory management.

🌐 **Live Demo**: [https://ever-bloom-backend.onrender.com/#shop](https://ever-bloom-backend.onrender.com/#shop)

> ⚠️ This is a DEMO application – no real purchases are made on this website.

---

## Table of Contents

- [Project Description](#project-description)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Airtable Configuration](#airtable-configuration)
- [Important Notes (Demo Environment)](#important-notes-demo-environment)
- [Contact](#contact)

---

## Project Description

**Ever Bloom** is a demo online store offering handmade decorations. The project was built for educational and portfolio purposes, showcasing the integration of a frontend (HTML, CSS, JavaScript) with a backend deployed on **Render**, and external services like **Stripe** for payment processing and **Airtable** for product and order data management.

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

- JavaScript (deployed via Render platform)
- Stripe SDK (for payment processing)
- Airtable.js (for data access)
- Express (within Render deployment)
- dotenv
- cors

### Database/CMS:

- Airtable (for product and order management)

---

## Airtable Configuration

To modify products or orders, configure your Airtable base with the following structure:

### Table 1: `Products` (Produkty)

Field names (case-sensitive):

- `ID Product` – Number
- `Product Name` – Single line text
- `Description` – Long text
- `Price` – Currency (e.g., GBP)
- `Stock` – Number (integer)
- `Image` – Attachment
- `Status` – Single select (`available`, `unavailable`)
- `Additional Images` – Attachment (optional)

Example:

| ID Product | Product Name                | Price | Stock | Status    |
| ---------- | --------------------------- | ----- | ----- | --------- |
| 1          | Carved wooden monkeys       | 27.50 | 2     | available |
| 2          | Porcelain teacup and saucer | 23.99 | 2     | available |

> ☑️ Upload actual images in the `Image` field!

---

### Table 2: `Zamówienia` (Orders)

Columns:

- `ID zamówienia` – Single line text
- `Produkt` – Single line text
- `Kwota` – Number
- `Data` – Date
- `Status` – Single select (must include `Zakończone`)

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
