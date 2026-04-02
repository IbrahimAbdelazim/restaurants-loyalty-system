# API curl examples — Task 03 (real-time SSE)

Base URL: `http://localhost:3000`. The events stream is intended for browsers (`EventSource`); `curl` can still show the first events with `-N` (no buffer).

## Server-Sent Events — subscribe for one guest

Stream order notifications for `clientId` (same Node process as the app; in-memory bus):

```bash
curl -N -s "http://localhost:3000/api/events?clientId=c1"
```

You should see lines like:

- `data: {"type":"connected","clientId":"c1"}`
- After a cashier completes checkout for that guest: `data: {"type":"order","clientId":"c1","orderId":"..."}`

## Events — missing `clientId` (400)

English (default):

```bash
curl -s "http://localhost:3000/api/events"
```

Arabic `message` via query or `Accept-Language`:

```bash
curl -s "http://localhost:3000/api/events?lang=ar" -H "Accept-Language: ar"
```

Response shape matches other APIs: `{ "error": { "en", "ar" }, "message": "..." }`.

## Orders — triggers SSE (unchanged contract)

Completing checkout emits an in-process event for each saved order. Example single-guest POST (adjust `clientId`, `items` to your data):

```bash
curl -s -X POST "http://localhost:3000/api/orders?lang=en" \
  -H "Content-Type: application/json" \
  -d '{"clientId":"c1","table":"3","items":[{"menuItemId":"m1","quantity":1}]}'
```

With an open `curl -N` stream for `clientId=c1`, a matching `order` event should appear after this succeeds.
