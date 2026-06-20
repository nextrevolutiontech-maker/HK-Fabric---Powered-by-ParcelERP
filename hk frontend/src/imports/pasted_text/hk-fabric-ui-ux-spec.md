HK FABRIC COURIER & COD MANAGEMENT SYSTEM
MASTER UI/UX SPECIFICATION DOCUMENT
VERSION 1.0

====================================================

1. DESIGN PHILOSOPHY
   ====================================================

System Goal:

Fast Order Entry

Minimum Clicks

Large Tables

Mobile Friendly

Desktop Optimized

No Complex ERP Screens

Designed For:

Sami
Abid

====================================================
2. BRANDING
===========

Shop Name:
HK Fabric

Business:
Bedsheets & Home Textiles

Theme:

Primary:
#0F172A (Navy)

Secondary:
#FFFFFF (White)

Accent:
#D4AF37 (Gold)

Success:
Green

Warning:
Orange

Danger:
Red

====================================================
3. MAIN LAYOUT
==============

TOP HEADER

HK Fabric Logo

Global Search

Notifications

Current Date

Current Time

---

LEFT SIDEBAR

Dashboard

Create Order

Orders

Tracking

COD

Settlements

Reports

Activity Logs

Settings

====================================================
4. DASHBOARD SCREEN
===================

Cards

Today's Orders

Pending Tracking

Pending COD

Received COD

Today's Revenue

Void Orders

---

Recent Orders Table

Order No

Customer

Amount

Handled By

Status

Date

---

Recent COD Table

Order No

Amount

Status

Received Date

---

Alerts

Pending Tracking

Pending COD

Settlement Waiting

====================================================
5. GLOBAL SEARCH
================

Visible On Every Screen

Search By:

Order Number

Tracking Number

WhatsApp Number

Customer Name

---

Search Result Popup

Customer

Orders

Tracking

COD History

====================================================
6. CREATE ORDER SCREEN
======================

SECTION A

Handled By

○ Sami

○ Abid

---

SECTION B

Customer Information

WhatsApp Number *

Alternate Number

Customer Name

City

Address

---

Auto Customer Detection

If Number Exists

Show:

Previous Orders

Total Spend

Last Order

Auto Fill Details

---

SECTION C

Products

Add Product Button

Rows

Product Name

Quantity

Unit Price

Line Total

---

SECTION D

Order Summary

Subtotal

Grand Total

Order Type

○ COD

○ NON-COD

Notes

---

Buttons

Save Order

Save & Print Label

Cancel

====================================================
7. ORDER LIST SCREEN
====================

Filters

Today

Week

Month

Year

Custom Date

---

Filters

Handled By

Status

Courier

COD Status

---

Columns

Order No

Customer

WhatsApp

Amount

Handled By

Status

Date

Actions

---

Actions

View

Edit

Print Label

Void

====================================================
8. ORDER DETAILS SCREEN
=======================

Customer Card

Products Card

Tracking Card

COD Card

Activity Timeline

---

Timeline Example

Order Created

Label Printed

Tracking Added

Delivered

COD Received

====================================================
9. PARCEL LABEL DESIGN
======================

4x6 Thermal Format

---

HK FABRIC

Order No:
HKF-2026-000001

Date:
21-Jun-2026

Time:
11:45 AM

Handled By:
Sami

Customer:
Ali Raza

WhatsApp:
03001234567

Address:
Complete Address

COD:
Rs 6200

QR Code

---

Print Types

Single Label

Bulk Labels

====================================================
10. TRACKING SCREEN
===================

Tabs

Awaiting Tracking

Tracking Added

---

Awaiting Tracking

Order No

Customer

Courier

Tracking Number

Save

---

Tracking Form

Courier

TCS

PostEx

Leopard

M&P

Other

Tracking Number

Receipt Upload

Save

====================================================
11. COD SCREEN
==============

Cards

Pending COD

Received COD

Total COD

---

Pending COD Table

Order No

Tracking

Amount

Courier

Status

---

Receive COD Modal

Amount

Reference Number

Notes

Received Date

Save

====================================================
12. SETTLEMENT SCREEN
=====================

Upload Section

Excel

CSV

---

Preview Table

Tracking

Amount

Matched Order

Status

---

Buttons

Approve Settlement

Reject Settlement

====================================================
13. REPORTS SCREEN
==================

Report Types

Daily

Weekly

Monthly

Yearly

Custom

---

Export

PDF

Excel

---

Charts

Orders

Revenue

COD

Returns

====================================================
14. ACTIVITY LOG SCREEN
=======================

Columns

Date

Time

Action

Order

Performed By

---

Actions

Create Order

Update Order

Void Order

Tracking Added

COD Received

Label Printed

====================================================
15. SETTINGS SCREEN
===================

Shop Name

Shop Logo

Owner PIN

Change PIN

====================================================
16. VOID ORDER FLOW
===================

Click Void

↓

PIN Modal

↓

Enter Owner PIN

↓

Reason

Duplicate Entry

Wrong Customer

Customer Cancelled

Test Entry

Other

↓

Confirm

↓

Status = VOID

====================================================
17. MOBILE DESIGN
=================

Responsive

Large Buttons

Fast Search

Single Column Forms

Bottom Action Buttons

====================================================
18. USER FLOW
=============

Customer Order

↓

Create Order

↓

Select Sami/Abid

↓

Save Order

↓

Print Label

↓

Attach Label To Parcel

↓

Courier Pickup

↓

Awaiting Tracking

↓

Add Tracking

↓

Delivered

↓

COD Pending

↓

COD Received

↓

Settlement Closed

====================================================
19. DAILY CLOSING SCREEN
========================

Orders Today

Sales Today

Delivered Today

Pending Tracking

Pending COD

Received COD

Void Orders

====================================================
20. FUTURE UI MODULES
=====================

WhatsApp Notifications

Inventory

Courier API

Analytics Dashboard

Multi Shop SaaS

====================================================
21. FINAL DESIGN RULES
======================

Maximum 3 Clicks To Create Order

Maximum 2 Clicks To Add Tracking

Maximum 2 Clicks To Receive COD

Global Search Always Visible

WhatsApp Number Mandatory

No Hard Delete

Owner PIN For Critical Actions

All Actions Logged

System Must Be Usable By Non-Technical Staff
