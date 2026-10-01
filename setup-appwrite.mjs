/* Creates the database, collections, attributes, indexes and permissions Longitude needs.
   Usage:  npm i node-appwrite
           APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 APPWRITE_PROJECT_ID=xxx APPWRITE_API_KEY=xxx node setup-appwrite.mjs
   The API key needs the databases.* scopes (read + write). */
import { Client, Databases, Permission, Role } from 'node-appwrite';

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error('Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY first.');
  process.exit(1);
}
const db = new Databases(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));
const DB = 'logistics';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const step = async (label, fn) => {
  try { await fn(); console.log('ok   ', label); }
  catch (e) { console.log(e.code === 409 ? 'exists' : 'FAIL  ', label, e.code === 409 ? '' : '- ' + e.message); }
};
// Indexes can only be created once their attributes are "available", so retry for a while.
const index = async (coll, key, type, attrs) => {
  for (let i = 0; i < 15; i++) {
    try { await db.createIndex(DB, coll, key, type, attrs); console.log('ok    index', key); return; }
    catch (e) { if (e.code === 409) { console.log('exists index', key); return; } await sleep(2000); }
  }
  console.log('FAIL   index', key, '- create it in the console once attributes are available');
};

await step('database', () => db.create(DB, 'Logistics'));

// Anyone can book and look up a shipment; only users labelled "admin" can change or delete.
await step('collection shipments', () => db.createCollection(DB, 'shipments', 'Shipments', [
  Permission.create(Role.any()), Permission.read(Role.any()),
  Permission.update(Role.label('admin')), Permission.delete(Role.label('admin'))
], false));
// Only admins write tracking events; anyone can read them.
await step('collection events', () => db.createCollection(DB, 'events', 'Events', [
  Permission.read(Role.any()), Permission.create(Role.label('admin')),
  Permission.update(Role.label('admin')), Permission.delete(Role.label('admin'))
], false));

const str = (c, k, size, req = true) => step(`${c}.${k}`, () => db.createStringAttribute(DB, c, k, size, req));
const flt = (c, k, req = true) => step(`${c}.${k}`, () => db.createFloatAttribute(DB, c, k, req));
const int = (c, k, req = true) => step(`${c}.${k}`, () => db.createIntegerAttribute(DB, c, k, req));

for (const [k, n] of [['trackingId', 32], ['mode', 8], ['origin', 32], ['destination', 32], ['originName', 80], ['destName', 80],
  ['cargoType', 60], ['senderName', 120], ['senderEmail', 160], ['receiverName', 120], ['receiverPhone', 40], ['status', 40]]) await str('shipments', k, n);
await str('shipments', 'description', 1000);
await flt('shipments', 'weightKg'); await flt('shipments', 'priceUsd'); await int('shipments', 'etaDays');

await str('events', 'trackingId', 32); await str('events', 'status', 40);
await str('events', 'location', 120, false); await str('events', 'note', 240, false);

await index('shipments', 'idx_tracking', 'unique', ['trackingId']);
await index('events', 'idx_tracking', 'key', ['trackingId']);
console.log('\nDone. Now add the label "admin" to your staff user (Auth > Users) and fill in js/config.js.');
