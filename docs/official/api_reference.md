# API Reference

The Order Book API is a RESTful service that accepts user intents and allows relayers to fetch open orders.

## Base URL
`https://api.intent.movement/v1` (Example)

## Endpoints

### 1. Submit Order
Broadcast a new signed intent to the network.

*   **URL**: `/orders`
*   **Method**: `POST`
*   **Content-Type**: `application/json`

**Request Body**
```json
{
  "maker": "0x123...",
  "nonce": "15",
  "sellToken": "0x1::aptos_coin::AptosCoin",
  "buyToken": "0x..::usdc::USDC",
  "sellAmount": "100000000",
  "startBuyAmount": "1000000",
  "endBuyAmount": "990000",
  "startTime": "1700000000",
  "endTime": "1700000300",
  "signature": "0xabc..."
}
```

**Response (201 Created)**
```json
{
  "id": "ord_8723648723...",
  "status": "open",
  "createdAt": "2023-11-15T10:00:00Z"
}
```

### 2. Get Open Orders
Fetch a list of active orders for relayers to process.

*   **URL**: `/orders`
*   **Method**: `GET`
*   **Query Params**:
    *   `sellToken` (optional): Filter by sell token address.
    *   `buyToken` (optional): Filter by buy token address.
    *   `maker` (optional): Filter by user address.

**Response (200 OK)**
```json
{
  "orders": [
    {
      "id": "ord_1...",
      "maker": "0x...",
      "intent": { ... },
      "status": "open"
    },
    ...
  ]
}
```

### 3. Get Order Status
Check the status of a specific order.

*   **URL**: `/orders/{id}`
*   **Method**: `GET`

**Response (200 OK)**
```json
{
  "id": "ord_1...",
  "status": "filled", // open, filled, expired, cancelled
  "fillTxHash": "0x999...", // Present if filled
  "filledAt": "2023-11-15T10:02:00Z"
}
```

## Error Codes

| Code | Description |
| :--- | :--- |
| `400` | Invalid signature or malformed payload. |
| `409` | Nonce already used (Replay protection). |
| `422` | Invalid parameters (e.g., `endBuyAmount > startBuyAmount`). |
| `500` | Internal server error. |
