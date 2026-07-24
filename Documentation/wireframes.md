# Food Donation Platform - Wireframes

These are simple layout wireframes for the core pages of the platform to establish the structure before applying fancy UI and styling.

## 1. Home Page
```text
+---------------------------------------------------------------+
| [Logo]          Home   About   How it works   [Login] [Sign Up] |
+---------------------------------------------------------------+
|                                                               |
|             Hero Section: "Share Food, Spread Hope"           |
|      [ Donate Food Now ]        [ Register as NGO ]           |
|                                                               |
+---------------------------------------------------------------+
|                        How it Works                           |
|  [Icon 1]                 [Icon 2]                 [Icon 3]   |
| 1. Request Pickup   ->  2. NGO Accepts    ->   3. Delivered   |
+---------------------------------------------------------------+
|                      Recent Donations                         |
|  [ Donation Card ]    [ Donation Card ]    [ Donation Card ]  |
+---------------------------------------------------------------+
| Footer: Links, Contact info, Social media                     |
+---------------------------------------------------------------+
```

## 2. Login
```text
+---------------------------------------------------------------+
|                            [Logo]                             |
+---------------------------------------------------------------+
|                                                               |
|                      +----------------+                       |
|                      |  Welcome Back  |                       |
|                      |                |                       |
|                      | Email: [____]  |                       |
|                      | Pass:  [____]  |                       |
|                      |                |                       |
|                      |    [ Login ]   |                       |
|                      |                |                       |
|                      | New? [Register]|                       |
|                      +----------------+                       |
|                                                               |
+---------------------------------------------------------------+
```

## 3. Registration
```text
+---------------------------------------------------------------+
|                            [Logo]                             |
+---------------------------------------------------------------+
|                                                               |
|                      +----------------+                       |
|                      | Create Account |                       |
|                      |                |                       |
|                      | Name:  [____]  |                       |
|                      | Email: [____]  |                       |
|                      | Pass:  [____]  |                       |
|                      | Role:  [v]     | <- Dropdown (Donor,   |
|                      |                 NGO, Volunteer)        |
|                      |  [ Register ]  |                       |
|                      |                |                       |
|                      | Have acc? Login|                       |
|                      +----------------+                       |
|                                                               |
+---------------------------------------------------------------+
```

## 4. Donor Dashboard
```text
+---------------------------------------------------------------+
| [Logo] Dashboard                    [New Donation] [Logout]   |
+---------------------------------------------------------------+
| Welcome back, [Donor Name]!                                   |
|                                                               |
| +-------------------+ +-------------------+                   |
| | Total Donations:  | | Active Requests:  |                   |
| |        15         | |         2         |                   |
| +-------------------+ +-------------------+                   |
|                                                               |
| Your Recent Donations:                                        |
| ------------------------------------------------------------- |
| Date       | Food Type    | Qty     | Status    | Action      |
| ------------------------------------------------------------- |
| 2026-07-24 | Cooked Meals | 50      | Pending   | [View]      |
| 2026-07-20 | Groceries    | 20kg    | Delivered | [View]      |
| ------------------------------------------------------------- |
+---------------------------------------------------------------+
```

## 5. NGO Dashboard
```text
+---------------------------------------------------------------+
| [Logo] NGO Dashboard                           [Profile] [Logout]|
+---------------------------------------------------------------+
| Organization: [NGO Name] | Status: Verified                   |
|                                                               |
| Available Donations Nearby:                                   |
| ------------------------------------------------------------- |
| Location   | Food Type    | Qty     | Action                  |
| ------------------------------------------------------------- |
| Downtown   | Cooked Meals | 50      | [Accept Request]        |
| Suburb A   | Baked Goods  | 10 boxes| [Accept Request]        |
| ------------------------------------------------------------- |
|                                                               |
| Your Accepted Pickups:                                        |
| ------------------------------------------------------------- |
| [Pending] 50 Meals - Downtown -> [Mark as Picked Up]          |
+---------------------------------------------------------------+
```

## 6. Volunteer Dashboard
```text
+---------------------------------------------------------------+
| [Logo] Volunteer Hub                           [Profile] [Logout]|
+---------------------------------------------------------------+
| Hello, [Volunteer Name]!                                      |
|                                                               |
| Delivery Tasks:                                               |
| ------------------------------------------------------------- |
| Pickup: Downtown -> Dropoff: Shelter A                        |
| Food: 50 Meals                     [ Accept Task ]            |
| ------------------------------------------------------------- |
| Pickup: Suburb A -> Dropoff: Community Center                 |
| Food: 10 boxes                     [ Accept Task ]            |
| ------------------------------------------------------------- |
+---------------------------------------------------------------+
```

## 7. Admin Dashboard
```text
+---------------------------------------------------------------+
| [Logo] Admin Panel                                   [Logout] |
+---------------------------------------------------------------+
|  + Users  | Pending NGO Approvals:                            |
|  + NGOs   | ------------------------------------------------- |
|  + Donats | [NGO Name] - Req #123    [Approve] [Reject]       |
|  + Stats  | [NGO Name 2]- Req #124   [Approve] [Reject]       |
|           | ------------------------------------------------- |
|           |                                                   |
|           | Platform Statistics:                              |
|           | Total Users: 1,250 | Total Meals Saved: 5,400     |
+---------------------------------------------------------------+
```

## 8. Create Donation Page
```text
+---------------------------------------------------------------+
| [Logo]                                     [Cancel]           |
+---------------------------------------------------------------+
|                      +----------------+                       |
|                      | New Donation   |                       |
|                      |                |                       |
|                      | Food Type:     |                       |
|                      | [__________]   |                       |
|                      |                |                       |
|                      | Quantity:      |                       |
|                      | [__________]   |                       |
|                      |                |                       |
|                      | Address:       |                       |
|                      | [__________]   |                       |
|                      |                |                       |
|                      | Notes:         |                       |
|                      | [__________]   |                       |
|                      |                |                       |
|                      |  [ Submit ]    |                       |
|                      +----------------+                       |
+---------------------------------------------------------------+
```

## 9. Donation Details Page
```text
+---------------------------------------------------------------+
| [Logo]                                       [Back]           |
+---------------------------------------------------------------+
|                                                               |
|  Donation #D-84729                                            |
|  Status: [ IN TRANSIT ]                                       |
|                                                               |
|  Details:                                                     |
|  - Food Type: Cooked Meals                                    |
|  - Quantity: 50                                               |
|  - Donor: John Doe (Downtown)                                 |
|                                                               |
|  Accepted By:                                                 |
|  - NGO: Helping Hands Org                                     |
|  - Volunteer: Jane Smith (Phone: 555-1234)                    |
|                                                               |
|  [ Update Status: Delivered ] (visible based on role)         |
|                                                               |
+---------------------------------------------------------------+
```
