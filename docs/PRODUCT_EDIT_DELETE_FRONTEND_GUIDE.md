# Product Edit and Delete - Frontend Integration Guide

## Overview

This guide documents frontend integration for:
- Editing a product
- Deleting a product (soft delete)

The edit section below is aligned with the latest backend route behavior and DTO validation.

---

## Base URL

Use:

```http
/products
```

If your frontend proxies backend routes under /api, use:

```http
/api/products
```

---

## Product Shape (Response)

Most product endpoints return this object shape:

```typescript
export interface Product {
  id: string;
  productId: string; // PRD001, PRD002...
  name: string;
  category: string;
  barcode: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  variant?: string | null;
  markDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  parentGenId?: string | null;
}
```

---

## 1) Edit Product

### Endpoint

Primary route:

```http
PATCH /products/:id
```

Compatibility alias (also supported):

```http
PATCH /products/edit/:id
```

Recommendation: use PATCH /products/:id as the canonical route in new frontend code.

### Auth Requirement

Currently, this route is not guard-protected in the backend.

### Headers

```http
Content-Type: application/json
```

### Request Body Contract

All fields are optional except userId.

```typescript
export interface UpdateProductRequest {
  name?: string;
  category?: string;
  purchasePrice?: number;
  salePrice?: number;
  quantity?: number;
  userId: string;
}
```

### Validation Rules (Backend-Enforced)

The backend uses whitelist + forbidNonWhitelisted validation. This means unknown fields are rejected.

| Field | Required | Type | Rules |
|---|---|---|---|
| name | No | string | Must not be empty when provided |
| category | No | string | Must not be empty when provided |
| purchasePrice | No | number | Must be greater than or equal to 0 |
| salePrice | No | number | Must be greater than or equal to 0 |
| quantity | No | integer | Must be greater than or equal to 0 |
| userId | Yes | string | Must not be empty |

Notes:
- Unknown properties (example: discount, foo) return 400 Bad Request.
- Numeric strings can be transformed by backend validation, but frontend should still send actual numbers.

### Example Request

```json
{
  "name": "PVC Banner 10x5",
  "category": "Print",
  "purchasePrice": 120,
  "salePrice": 160,
  "quantity": 35,
  "userId": "clx123abc456"
}
```

### Success Response

- Status: 200 OK
- Body: updated Product object

### Backend Behavior Notes

- If quantity changes:
  - Increased quantity creates inventory log type IN
  - Decreased quantity creates inventory log type OUT
- If non-quantity fields change, backend creates inventory log type EDITED.
- userId is used in inventory logs and must be a valid staff id.

### Error Cases

- 400 Bad Request
  - Missing userId
  - Wrong type (example: quantity as non-numeric text)
  - Invalid values (example: quantity < 0)
  - Unknown fields (whitelist validation)
- 404 Not Found when product id does not exist

Typical 400 response shape:

```json
{
  "statusCode": 400,
  "message": [
    "userId should not be empty",
    "property foo should not exist"
  ],
  "error": "Bad Request"
}
```

---

## 2) Delete Product (Soft Delete)

### Endpoint

```http
DELETE /products/:id
```

### Auth Requirement

This route is protected by access-token guard.

### Headers

```http
Authorization: Bearer <accessToken>
```

### Request Body

No body required.

### Success Response

- Status: 204 No Content
- No response body expected.

### Backend Behavior Notes

- Product is soft-deleted by setting markDeleted = true.
- Product row remains in DB.
- Inventory log is created with:
  - type: OUT
  - quantity: current product quantity
  - userId: extracted from JWT access token payload (id)
- Deleted products are excluded from normal list endpoint (GET /products).

### Error Cases

- 401 Unauthorized when token is missing or invalid
- 403 Forbidden when auth check fails
- 404 Not Found when product id does not exist

---

## Frontend API Service Example

```typescript
const API_BASE = '/products';

export interface UpdateProductRequest {
  name?: string;
  category?: string;
  purchasePrice?: number;
  salePrice?: number;
  quantity?: number;
  userId: string;
}

export class ProductApi {
  async updateProduct(
    productId: string,
    payload: UpdateProductRequest,
    mode: 'canonical' | 'legacy' = 'canonical',
  ): Promise<Product> {
    const path = mode === 'canonical'
      ? `${API_BASE}/${productId}`
      : `${API_BASE}/edit/${productId}`;

    const res = await fetch(path, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw await this.parseError(res);
    }

    return res.json();
  }

  async deleteProduct(productId: string, accessToken: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${productId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw await this.parseError(res);
    }
  }

  private async parseError(response: Response) {
    try {
      return await response.json();
    } catch {
      return { message: `Request failed (${response.status})` };
    }
  }
}
```

---

## Frontend Validation Recommendation

Before submit:
- Always include userId
- Send only fields that changed plus userId
- Ensure quantity is an integer >= 0
- Ensure purchasePrice and salePrice are numbers >= 0
- Remove unknown keys from payload

---

## Quick Test Checklist

- PATCH /products/:id updates editable fields successfully
- PATCH /products/edit/:id works for legacy frontend paths
- PATCH with missing userId returns 400
- PATCH with unknown field returns 400
- PATCH with negative quantity returns 400
- PATCH quantity increase/decrease creates expected inventory log direction
- DELETE without token fails with auth error
- DELETE with valid token returns 204
- Deleted product disappears from product list
