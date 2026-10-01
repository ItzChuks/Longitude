# Longitude: setup

## 0. Fastest path: Appwrite Console Terminal
Paste the commands from `appwrite-terminal-setup.txt` into the Terminal at the bottom of your project in the Appwrite Console. `js/config.js` is already set to project `longitude` on `fra.cloud.appwrite.io`. Then add a Web app (Connect → Apps) for `localhost` and your domain. The steps below are the manual alternative.

## 1. Try it now (demo mode)
Open `index.html` in a browser (or serve the folder: `npx serve .`). With no Appwrite project configured, everything works using browser storage. Try tracking `LGT-DEMO0001`. Staff page: `admin.html`, any email and password.

## 2. Connect Appwrite
1. Create a project in Appwrite. Under **Overview → Integrations → Platforms**, add a **Web** platform with your domain (and `localhost` for testing).
2. Create an **API key** with the `databases.read` and `databases.write` scopes (plus `collections`, `attributes`, `indexes` read/write).
3. Provision the database:
   ```bash
   npm i node-appwrite
   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
   APPWRITE_PROJECT_ID=your_project_id \
   APPWRITE_API_KEY=your_key \
   node setup-appwrite.mjs
   ```
   If your `node-appwrite` version rejects a method signature, create the collections by hand using the schema below.
4. In **Auth → Users**, create your staff user, open it, and add the label `admin`.
5. Edit `js/config.js` and replace `YOUR_PROJECT_ID` (and the endpoint if self-hosted).

## Schema (database id `logistics`)
**shipments** (document security off)
| Attribute | Type | Size / note |
|---|---|---|
| trackingId | string | 32, **unique index** |
| mode | string | 8 (`road`, `sea`, `air`) |
| origin, destination | string | 32 (city ids) |
| originName, destName | string | 80 |
| cargoType | string | 60 |
| description | string | 1000 |
| senderName, receiverName | string | 120 |
| senderEmail | string | 160 |
| receiverPhone | string | 40 |
| status | string | 40 |
| weightKg, priceUsd | float | |
| etaDays | integer | |

Permissions: create `any`, read `any`, update `label:admin`, delete `label:admin`.

**events**
| Attribute | Type | Size / note |
|---|---|---|
| trackingId | string | 32, key index |
| status | string | 40 |
| location | string | 120, optional |
| note | string | 240, optional |

Permissions: read `any`; create, update, delete `label:admin`.

## Before you go live
- **Tracking privacy:** `read: any` on shipments means anyone who can query the API can list shipments, not just look one up by ID. For production, replace the public read with an Appwrite Function that returns a single shipment by tracking ID, and call it from `trackShipment` in `js/api.js`.
- **Price integrity:** the quote is calculated in the browser and saved with the booking. Treat it as an estimate and confirm the final price at pickup, or recompute it in a Function.
- **Notifications and payments:** not included. Add an Appwrite Function on event creation to send email/SMS, and Paystack or Flutterwave for online payment.
- Edit rates, cities and statuses in `js/data.js`. Edit the SDK version in the two HTML files if you upgrade Appwrite.

## Files
```
index.html        public site: quote planner, services, tracking, booking
admin.html        staff dashboard: list, filter, post status updates, delete
css/styles.css    custom styles
js/config.js      Appwrite settings
js/data.js        cities, pricing rules, route-chart renderer
js/api.js         Appwrite data layer + demo-mode fallback
js/app.js         public page logic
js/admin.js       dashboard logic
setup-appwrite.mjs  one-shot database provisioning
```
