# GENTWear Admin Operations Manual

This document outlines the internal systems, algorithms, database operations, and configurations for GENTWear administrative users.

## Admin Dashboard & Analytics

The admin dashboard aggregates store metrics and provides controls to manage the product catalog and customer accounts.
*   **KPI Metrics:** Includes total revenue (sum of paid orders), customer count, order counts, and number of low stock variants.
*   **Analytics Route:** `/admin/analytics/sales` generates daily, weekly, and monthly sales data charts, as well as listing the top 5 selling products and recent orders.

---

## Inventory & Low-Stock Alerts (MinHeap)

GENTWear uses a custom **MinHeap** data structure to run high-performance inventory audits.
*   **The Cron Job:** Runs on server startup and every **1 hour** thereafter.
*   **Logic:**
    1. Fetches all product variants from the database.
    2. Inserts each variant into a `MinHeap` ordered by `stock_qty`.
    3. Successively extracts the minimum stock items.
    4. If an extracted item has a `stock_qty` **under 10**, it is flagged.
    5. If an item has 10 or more stock, the process breaks early because all remaining items in the heap are guaranteed to have 10 or more stock.
*   **Alerting:** Details of low stock items are output to the server logs and available to admins at `/admin/inventory/low-stock-heap`.

---

## Promotions & Discounts

Administrators can create promotional codes that apply savings during the checkout process:
*   **Discount Types:**
    *   *Percent:* Subtracts a percentage from the order total (e.g. `20` for 20% off).
    *   *Fixed:* Subtracts a flat dollar amount from the order total (e.g. `15` for $15.00 off).
*   **Validation Rules:**
    *   Promo codes must be unique and uppercase.
    *   Must be marked as active (`is_active = true`).
    *   Must not be expired (`expiry_date` is either null or in the future).
*   **Admin Route:** Create, edit, and delete promotions via `/admin/promotions` endpoints.

---

## Customer & Review Moderation

*   **Customer Management:** Admins can view customer spend profiles and block or unblock users via `/admin/customers/:id/block`. Blocked users are restricted from logging in or placing orders.
*   **Review Moderation:** Customer product reviews are held in a moderation queue (`is_approved = false`) until reviewed by an admin.
    *   *Approve:* POST `/admin/reviews/:id/approve` updates approval state to make it public.
    *   *Reply:* POST `/admin/reviews/:id/reply` saves an official admin reply.
    *   *Reject/Delete:* DELETE `/admin/reviews/:id` deletes the review from the database.
