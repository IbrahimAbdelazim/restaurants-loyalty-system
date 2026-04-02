# Cashier task 02 — API curl examples

Base URL: `http://localhost:3000` (adjust host/port as needed).

## POST `/api/orders` — single guest

```bash
curl -s -X POST 'http://localhost:3000/api/orders?lang=en' \
  -H 'Content-Type: application/json' \
  -d '{
    "clientId": "c1",
    "table": "5",
    "notes": "",
    "promoCode": "WELCOME10",
    "items": [
      { "menuItemId": "m2", "quantity": 1 },
      { "menuItemId": "m4", "quantity": 2 }
    ]
  }'
```

Arabic primary message (`messagePrimary`):

```bash
curl -s -X POST 'http://localhost:3000/api/orders?lang=ar' \
  -H 'Content-Type: application/json' \
  -d '{
    "clientId": "c1",
    "table": "5",
    "items": [ { "menuItemId": "m10", "quantity": 2 } ]
  }'
```

## POST `/api/orders` — split (even)

```bash
curl -s -X POST 'http://localhost:3000/api/orders?lang=en' \
  -H 'Content-Type: application/json' \
  -d '{
    "splitMode": "even",
    "clientIds": ["c1", "c2"],
    "table": "3",
    "notes": "Split bill",
    "items": [
      { "menuItemId": "m2", "quantity": 1 },
      { "menuItemId": "m13", "quantity": 2 }
    ]
  }'
```

## POST `/api/orders` — split (by item)

Assign each cart line to a guest (`menuItemId` → `clientId`):

```bash
curl -s -X POST 'http://localhost:3000/api/orders?lang=en' \
  -H 'Content-Type: application/json' \
  -d '{
    "splitMode": "by_item",
    "clientIds": ["c1", "c2"],
    "table": "7",
    "assignment": {
      "m2": "c1",
      "m13": "c2"
    },
    "items": [
      { "menuItemId": "m2", "quantity": 1 },
      { "menuItemId": "m13", "quantity": 2 }
    ]
  }'
```

## GET `/api/shift-log` — today’s shift summary

```bash
curl -s 'http://localhost:3000/api/shift-log?lang=en'
```

Specific date:

```bash
curl -s 'http://localhost:3000/api/shift-log?date=2026-04-02&lang=ar'
```

## GET `/api/promos` — list active codes (optional)

```bash
curl -s 'http://localhost:3000/api/promos?lang=en'
```

Validate a code (used by cashier UI for discount hint):

```bash
curl -s 'http://localhost:3000/api/promos?code=WELCOME10&lang=en'
```

## POST `/api/visits` — check-in with table

```bash
curl -s -X POST 'http://localhost:3000/api/visits?lang=en' \
  -H 'Content-Type: application/json' \
  -d '{
    "clientId": "c3",
    "table": "12"
  }'
```

## DELETE `/api/visits` — remove guest from active list

```bash
curl -s -X DELETE 'http://localhost:3000/api/visits?clientId=c3&lang=ar'
```
