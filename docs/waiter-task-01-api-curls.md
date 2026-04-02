# API curl examples — Waiter Task 01

Base URL examples use `http://localhost:3000`. Add `Accept-Language: ar` or `?lang=ar` for Arabic `message` / `messagePrimary`; responses include `{ en, ar }` objects for errors and some success payloads.

## Clients — partial search (4+ digits)

```bash
curl -s "http://localhost:3000/api/clients?digits=0501"
```

## Clients — exact phone (full profile)

```bash
curl -s "http://localhost:3000/api/clients?phone=0501234567"
```

## Clients — profile by id

```bash
curl -s "http://localhost:3000/api/clients?id=c1"
```

## Clients — register new guest (POST)

```bash
curl -s -X POST "http://localhost:3000/api/clients" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Guest","phone":"0509998877","birthday":"1992-06-01","notes":"Walk-in"}'
```

Arabic-preferring client hint:

```bash
curl -s -X POST "http://localhost:3000/api/clients?lang=ar" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{"name":"ضيف جديد","phone":"0509998876","birthday":null,"notes":""}'
```

## Visits — list active in-house guests

```bash
curl -s "http://localhost:3000/api/visits"
```

## Visits — mark arrived

```bash
curl -s -X POST "http://localhost:3000/api/visits" \
  -H "Content-Type: application/json" \
  -d '{"clientId":"c1"}'
```

## Visits — mark departed

```bash
curl -s -X DELETE "http://localhost:3000/api/visits?clientId=c1"
```
