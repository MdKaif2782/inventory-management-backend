# Product Edit and Delete - Frontend Implementation Guide

## Overview

This guide documents frontend integration for:
- Editing a product
- Deleting a product (soft delete)

It is based on the current backend behavior in the product module.

---

## Base URL

Use:

```http
/products
```

If your frontend proxies backend routes under `/api`, use:

```http
/api/products
```

---

## Product Shape (Response)

Most product endpoints return this object shape:

```typescript
export interface Product {
  id: string;
  productId: string;     // PRD001, PRD002...
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

```http
PATCH /products/:id
```

### Auth Requirement

Currently, this route is not guarded in the backend.

### Headers

```http
Content-Type: application/json
```

### Request Body

All fields are optional except `userId` (required for inventory logging).

```typescript
export interface UpdateProductRequest {
  name?: string;
  category?: string;
  purchasePrice?: number;
  salePrice?: number;
  quantity?: number;
  userId: string; // Logged-in staff id
}
```

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

- Status: `200 OK`
- Body: updated `Product` object

### Backend Behavior Notes

- Quantity change creates inventory log:
  - quantity increased -> `IN`
  - quantity decreased -> `OUT`
- Changing other fields creates an `EDITED` inventory log.
- `userId` should be the current logged-in staff id from auth login response.

### Error Cases

- `404 Not Found` when product id does not exist.
- `400 Bad Request` for invalid request body (for example, unexpected extra fields).

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

- Status: `204 No Content`
- No response body should be expected on frontend.

### Backend Behavior Notes

- Product is soft-deleted by setting `markDeleted = true`.
- Product row remains in DB.
- Inventory log is created with:
  - `type: OUT`
  - `quantity: current product quantity`
  - `userId`: extracted from JWT access token payload (`id`)
- Deleted products are excluded from normal list endpoint (`GET /products`).

### Error Cases

- `401 Unauthorized` when token is missing/invalid.
- `403 Forbidden` when auth check fails.
- `404 Not Found` when product id does not exist.

---

## Frontend API Service Example

```typescript
const API_BASE = '/products';

export class ProductApi {
  async updateProduct(productId: string, payload: UpdateProductRequest): Promise<Product> {
    const res = await fetch(`${API_BASE}/${productId}`, {
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

    // 204: no body expected
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

## UI/UX Recommendations

1. Edit form:
   - Pre-fill form from current product data.
   - Convert numeric inputs to numbers before submit (`Number(value)`).
   - Always include `userId` in PATCH body.

2. Delete flow:
   - Show a confirmation modal before delete.
   - Use pessimistic UI update: wait for `204`, then remove from list.
   - Show clear success message: "Product deleted successfully".

3. Error handling:
   - 401/403: redirect to login or refresh token flow.
   - 404: show "Product no longer exists" and refresh list.
   - 400: show validation message from backend.

---

## Quick Test Checklist

- PATCH updates text fields successfully.
- PATCH quantity increase/decrease works.
- PATCH with missing `userId` is handled in frontend validation.
- DELETE without token fails with auth error.
- DELETE with valid token returns `204`.
- Deleted product disappears from product list.
