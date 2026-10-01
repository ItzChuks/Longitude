/* Data layer. Uses Appwrite when configured, otherwise a localStorage demo with identical methods. */
(function () {
  'use strict';
  const C = window.LGT_CONFIG, L = window.LGT;
  const demo = !C.projectId || C.projectId === 'YOUR_PROJECT_ID' || !window.Appwrite;

  /* ---------------- Appwrite ---------------- */
  function appwriteImpl() {
    const { Client, Databases, Account, ID, Query } = window.Appwrite;
    const client = new Client().setEndpoint(C.endpoint).setProject(C.projectId);
    const db = new Databases(client), account = new Account(client);
    const D = C.databaseId, S = C.shipmentsCollectionId, E = C.eventsCollectionId;

    const listEvents = async trackingId => (await db.listDocuments(D, E, [
      Query.equal('trackingId', [trackingId]), Query.orderAsc('$createdAt'), Query.limit(100)])).documents;

    return {
      listEvents,
      async trackShipment(id) {
        const r = await db.listDocuments(D, S, [Query.equal('trackingId', [id]), Query.limit(1)]);
        if (!r.documents.length) return null;
        return { shipment: r.documents[0], events: await listEvents(id) };
      },
      createShipment: data => db.createDocument(D, S, ID.unique(), { ...data, trackingId: L.newTrackingId(), status: 'Booking received' }),
      async listShipments() {
        return (await db.listDocuments(D, S, [Query.orderDesc('$createdAt'), Query.limit(100)])).documents;
      },
      async addEvent(shipment, ev) {
        await db.createDocument(D, E, ID.unique(), { trackingId: shipment.trackingId, status: ev.status, location: ev.location || '', note: ev.note || '' });
        return db.updateDocument(D, S, shipment.$id, { status: ev.status });
      },
      async deleteShipment(shipment) {
        for (const ev of await listEvents(shipment.trackingId)) await db.deleteDocument(D, E, ev.$id);
        await db.deleteDocument(D, S, shipment.$id);
      },
      async currentUser() {
        try { const u = await account.get(); return (u.labels || []).includes('admin') ? u : null; } catch (e) { return null; }
      },
      async login(email, password) {
        await account.createEmailPasswordSession(email, password);
        const u = await this.currentUser();
        if (!u) { await account.deleteSession('current'); throw new Error('This account is not an admin. Add the label "admin" to the user in the Appwrite console.'); }
        return u;
      },
      logout: () => account.deleteSession('current')
    };
  }

  /* ---------------- Demo mode ---------------- */
  function demoImpl() {
    const KEY = 'lgt_demo_v1', SESSION = 'lgt_demo_admin';
    let mem = null;
    const ago = ms => new Date(Date.now() - ms).toISOString(), H = 3600e3, DAY = 24 * H;
    function seed() {
      const s1 = { $id: 's1', $createdAt: ago(3 * DAY), trackingId: 'LGT-DEMO0001', mode: 'air', origin: 'lagos', destination: 'london', originName: 'Lagos', destName: 'London', weightKg: 100, cargoType: 'Electronics', description: 'Two cartons of laptops', senderName: 'Ada Obi', senderEmail: 'ada@example.com', receiverName: 'Tom Harris', receiverPhone: '+44 20 7946 0000', status: 'In transit', priceUsd: 612, etaDays: 2 };
      const s2 = { $id: 's2', $createdAt: ago(16 * DAY), trackingId: 'LGT-DEMO0002', mode: 'sea', origin: 'shanghai', destination: 'rotterdam', originName: 'Shanghai', destName: 'Rotterdam', weightKg: 2400, cargoType: 'Textiles', description: '20ft container of fabric rolls', senderName: 'Li Wei', senderEmail: 'li@example.com', receiverName: 'Anke de Vries', receiverPhone: '+31 10 123 4567', status: 'Customs clearance', priceUsd: 3880, etaDays: 27 };
      const ev = (id, i, status, location, note, age) => ({ $id: `${id}e${i}`, $createdAt: ago(age), trackingId: id, status, location, note });
      return {
        shipments: [s2, s1],
        events: [
          ev('LGT-DEMO0001', 1, 'Booking received', 'Lagos', 'Shipment booked online', 3 * DAY),
          ev('LGT-DEMO0001', 2, 'Picked up', 'Ikeja, Lagos', 'Collected from sender', 2.8 * DAY),
          ev('LGT-DEMO0001', 3, 'Departed origin hub', 'Murtala Muhammed Airport', 'Cleared export screening', 2 * DAY),
          ev('LGT-DEMO0001', 4, 'In transit', 'Airborne', 'Flight in progress', 1 * DAY),
          ev('LGT-DEMO0002', 1, 'Booking received', 'Shanghai', 'Shipment booked online', 16 * DAY),
          ev('LGT-DEMO0002', 2, 'Picked up', 'Shanghai', 'Container sealed and collected', 15 * DAY),
          ev('LGT-DEMO0002', 3, 'Departed origin hub', 'Yangshan Port', 'Loaded on vessel', 13 * DAY),
          ev('LGT-DEMO0002', 4, 'In transit', 'Indian Ocean', 'Vessel at sea', 8 * DAY),
          ev('LGT-DEMO0002', 5, 'Customs clearance', 'Rotterdam', 'Awaiting customs release', 1 * DAY)
        ]
      };
    }
    const load = () => { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* ignore */ } return mem || save(seed()); };
    function save(d) { mem = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } return d; }
    const evsFor = (d, id) => d.events.filter(e => e.trackingId === id).sort((x, y) => x.$createdAt.localeCompare(y.$createdAt));

    return {
      async listEvents(id) { return evsFor(load(), id); },
      async trackShipment(id) {
        const d = load(), shipment = d.shipments.find(s => s.trackingId === id);
        return shipment ? { shipment, events: evsFor(d, id) } : null;
      },
      async createShipment(data) {
        const d = load();
        const s = { ...data, $id: 's' + Date.now(), $createdAt: new Date().toISOString(), trackingId: L.newTrackingId(), status: 'Booking received' };
        d.shipments.unshift(s); save(d); return s;
      },
      async listShipments() { return load().shipments.slice(); },
      async addEvent(shipment, ev) {
        const d = load();
        d.events.push({ $id: 'e' + Date.now(), $createdAt: new Date().toISOString(), trackingId: shipment.trackingId, status: ev.status, location: ev.location || '', note: ev.note || '' });
        const s = d.shipments.find(x => x.$id === shipment.$id); if (s) s.status = ev.status;
        save(d); return s;
      },
      async deleteShipment(shipment) {
        const d = load();
        d.shipments = d.shipments.filter(s => s.$id !== shipment.$id);
        d.events = d.events.filter(e => e.trackingId !== shipment.trackingId);
        save(d);
      },
      async currentUser() { try { return sessionStorage.getItem(SESSION) ? { email: sessionStorage.getItem(SESSION) } : null; } catch (e) { return null; } },
      async login(email, password) {
        if (!email || !password) throw new Error('Enter any email and password in demo mode.');
        try { sessionStorage.setItem(SESSION, email); } catch (e) { /* ignore */ }
        return { email };
      },
      async logout() { try { sessionStorage.removeItem(SESSION); } catch (e) { /* ignore */ } }
    };
  }

  window.LGT_API = Object.assign({ demo }, demo ? demoImpl() : appwriteImpl());
})();
