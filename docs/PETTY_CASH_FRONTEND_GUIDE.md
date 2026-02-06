# Petty Cash System - Frontend Implementation Guide

## Overview

This guide covers how to integrate the Petty Cash (Accounting) API endpoints in your frontend application. The system manages multiple "pockets" with their own balances and transaction histories.

---

## API Base URL

```
/api/accounting
```

---

## TypeScript Interfaces

Copy these interfaces to your frontend project for type safety:

```typescript
// ==================== ENUMS & CONSTANTS ====================

export type TransactionType = 'income' | 'expense';
export type ModeOfPayment = 'cash' | 'bank_transfer';

export const EXPENSE_CATEGORIES = [
  { value: 'site_expense', label: 'Site Expense' },
  { value: 'food_refreshment', label: 'Food & Refreshment Expense' },
  { value: 'office_admin', label: 'Office & Admin Expense' },
  { value: 'local_transport', label: 'Local Transport Expense' },
  { value: 'communication', label: 'Communication Expense' },
  { value: 'printing_stationery', label: 'Printing & Stationery Expense' },
  { value: 'repair_maintenance', label: 'Repair & Maintenance Expense' },
  { value: 'utility', label: 'Utility Expense' },
  { value: 'courier_delivery', label: 'Courier & Delivery Expense' },
  { value: 'staff_welfare', label: 'Staff Welfare Expense' },
  { value: 'small_purchase', label: 'Small Purchase Expense' },
  { value: 'emergency', label: 'Emergency Expense' },
  { value: 'miscellaneous', label: 'Miscellaneous Expense' },
  { value: 'other', label: 'Other (Custom)' },
] as const;

// ==================== INTERFACES ====================

export interface Pocket {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PocketWithBalance extends Pocket {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface Transaction {
  id: string;
  pocketId: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  category: string;
  customCategory: string | null;
  modeOfPayment: ModeOfPayment | null;
  hasDetailAttached: boolean;
  date: string;
  createdAt: string;
  updatedAt?: string;
}

// ==================== REQUEST TYPES ====================

export interface CreatePocketRequest {
  name: string;
  description?: string;
}

export interface UpdatePocketRequest {
  name?: string;
  description?: string;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  description?: string;
  category?: string; // Required for expenses
  customCategory?: string; // Required when category is "other"
  modeOfPayment?: ModeOfPayment; // For income only
  hasDetailAttached?: boolean; // For expenses only
  date: string; // ISO date string
}

export interface UpdateTransactionRequest {
  amount?: number;
  description?: string;
  category?: string;
  customCategory?: string;
  modeOfPayment?: ModeOfPayment;
  hasDetailAttached?: boolean;
  date?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface SummaryFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface ExportFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: TransactionType;
}

// ==================== RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedTransactionsResponse {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
  };
}

export interface CategorySummary {
  category: string;
  label: string;
  amount: number;
  count: number;
}

export interface PocketSummary {
  pocketId: string;
  pocketName: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
  expensesByCategory: CategorySummary[];
  period: {
    from: string | null;
    to: string | null;
  };
}

export interface TransactionCreateResponse {
  success: boolean;
  data: Transaction;
  pocket: {
    balance: number;
  };
}

export interface TransactionDeleteResponse {
  success: boolean;
  message: string;
  pocket: {
    balance: number;
  };
}
```

---

## API Service Implementation

Here's a complete API service for React/Next.js (using fetch or axios):

```typescript
// services/accountingApi.ts

const API_BASE = '/api/accounting';

class AccountingApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        // Add auth header if needed
        // 'Authorization': `Bearer ${getToken()}`,
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw data;
    }
    
    return data;
  }

  // ==================== CATEGORIES ====================

  async getCategories() {
    return this.request<typeof EXPENSE_CATEGORIES>('/categories');
  }

  // ==================== POCKETS ====================

  async getAllPockets() {
    return this.request<PocketWithBalance[]>('/pockets');
  }

  async getPocket(id: string) {
    return this.request<PocketWithBalance>(`/pockets/${id}`);
  }

  async createPocket(data: CreatePocketRequest) {
    return this.request<Pocket>('/pockets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePocket(id: string, data: UpdatePocketRequest) {
    return this.request<Pocket>(`/pockets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePocket(id: string) {
    return this.request<void>(`/pockets/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== TRANSACTIONS ====================

  async getTransactions(pocketId: string, filters?: TransactionFilters) {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.page) params.set('page', filters.page.toString());
    if (filters?.limit) params.set('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `/pockets/${pocketId}/transactions${queryString ? `?${queryString}` : ''}`;
    
    return this.request<PaginatedTransactionsResponse>(url);
  }

  async getTransaction(id: string) {
    return this.request<Transaction>(`/transactions/${id}`);
  }

  async createTransaction(pocketId: string, data: CreateTransactionRequest) {
    return this.request<Transaction>(`/pockets/${pocketId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<TransactionCreateResponse>;
  }

  async updateTransaction(id: string, data: UpdateTransactionRequest) {
    return this.request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleDetailAttached(id: string) {
    return this.request<{ id: string; hasDetailAttached: boolean }>(
      `/transactions/${id}/toggle-attached`,
      { method: 'PATCH' }
    );
  }

  async deleteTransaction(id: string) {
    return this.request<TransactionDeleteResponse>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== SUMMARY & REPORTS ====================

  async getPocketSummary(pocketId: string, filters?: SummaryFilters) {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);

    const queryString = params.toString();
    const url = `/pockets/${pocketId}/summary${queryString ? `?${queryString}` : ''}`;
    
    return this.request<PocketSummary>(url);
  }

  async exportTransactions(pocketId: string, filters?: ExportFilters) {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.type) params.set('type', filters.type);

    const queryString = params.toString();
    const url = `${API_BASE}/pockets/${pocketId}/export${queryString ? `?${queryString}` : ''}`;
    
    // Download file
    const response = await fetch(url, {
      headers: {
        // Add auth header if needed
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    const blob = await response.blob();
    const filename = response.headers.get('Content-Disposition')
      ?.split('filename=')[1]
      ?.replace(/"/g, '') || 'transactions.csv';

    // Trigger download
    const urlBlob = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlBlob;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(urlBlob);
  }
}

export const accountingApi = new AccountingApiService();
```

---

## React Hooks (Optional)

Here are some React Query hooks for easy data fetching:

```typescript
// hooks/useAccounting.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '../services/accountingApi';

// ==================== POCKETS ====================

export function usePockets() {
  return useQuery({
    queryKey: ['pockets'],
    queryFn: () => accountingApi.getAllPockets(),
  });
}

export function usePocket(id: string) {
  return useQuery({
    queryKey: ['pocket', id],
    queryFn: () => accountingApi.getPocket(id),
    enabled: !!id,
  });
}

export function useCreatePocket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreatePocketRequest) => accountingApi.createPocket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pockets'] });
    },
  });
}

export function useUpdatePocket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePocketRequest }) =>
      accountingApi.updatePocket(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pockets'] });
      queryClient.invalidateQueries({ queryKey: ['pocket', id] });
    },
  });
}

export function useDeletePocket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => accountingApi.deletePocket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pockets'] });
    },
  });
}

// ==================== TRANSACTIONS ====================

export function useTransactions(pocketId: string, filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', pocketId, filters],
    queryFn: () => accountingApi.getTransactions(pocketId, filters),
    enabled: !!pocketId,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ pocketId, data }: { pocketId: string; data: CreateTransactionRequest }) =>
      accountingApi.createTransaction(pocketId, data),
    onSuccess: (_, { pocketId }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', pocketId] });
      queryClient.invalidateQueries({ queryKey: ['pockets'] });
      queryClient.invalidateQueries({ queryKey: ['pocket', pocketId] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionRequest }) =>
      accountingApi.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['pockets'] });
    },
  });
}

export function useToggleDetailAttached() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => accountingApi.toggleDetailAttached(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => accountingApi.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['pockets'] });
    },
  });
}

// ==================== SUMMARY ====================

export function usePocketSummary(pocketId: string, filters?: SummaryFilters) {
  return useQuery({
    queryKey: ['pocket-summary', pocketId, filters],
    queryFn: () => accountingApi.getPocketSummary(pocketId, filters),
    enabled: !!pocketId,
  });
}
```

---

## UI Components Structure

Here's a recommended component structure:

```
src/
├── components/
│   └── accounting/
│       ├── PocketList.tsx          # List all pockets with balances
│       ├── PocketCard.tsx          # Single pocket display card
│       ├── PocketForm.tsx          # Create/Edit pocket form
│       ├── TransactionList.tsx     # List transactions with filters
│       ├── TransactionRow.tsx      # Single transaction row
│       ├── TransactionForm.tsx     # Create/Edit transaction form
│       ├── AddFundForm.tsx         # Simplified form for adding funds (income)
│       ├── RecordExpenseForm.tsx   # Form for recording expenses
│       ├── CategorySelect.tsx      # Expense category dropdown
│       ├── PocketSummary.tsx       # Summary statistics & charts
│       └── ExportButton.tsx        # CSV export button
│
├── pages/
│   └── accounting/
│       ├── index.tsx               # Main accounting dashboard
│       └── [pocketId].tsx          # Individual pocket detail page
│
├── services/
│   └── accountingApi.ts            # API service (from above)
│
└── hooks/
    └── useAccounting.ts            # React Query hooks (from above)
```

---

## Sample Component Implementations

### PocketCard Component

```tsx
// components/accounting/PocketCard.tsx
import { PocketWithBalance } from '@/types/accounting';
import { formatCurrency } from '@/utils/format';

interface PocketCardProps {
  pocket: PocketWithBalance;
  onClick?: () => void;
}

export function PocketCard({ pocket, onClick }: PocketCardProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
    >
      <h3 className="text-lg font-semibold">{pocket.name}</h3>
      {pocket.description && (
        <p className="text-sm text-gray-500 mt-1">{pocket.description}</p>
      )}
      
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Income</p>
          <p className="text-green-600 font-medium">
            +{formatCurrency(pocket.totalIncome)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Expenses</p>
          <p className="text-red-600 font-medium">
            -{formatCurrency(pocket.totalExpenses)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Balance</p>
          <p className={`font-bold ${pocket.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(pocket.balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

### TransactionForm Component

```tsx
// components/accounting/TransactionForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CreateTransactionRequest, TransactionType, EXPENSE_CATEGORIES } from '@/types/accounting';

interface TransactionFormProps {
  pocketId: string;
  onSubmit: (data: CreateTransactionRequest) => Promise<void>;
  onCancel: () => void;
}

export function TransactionForm({ pocketId, onSubmit, onCancel }: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CreateTransactionRequest>({
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      hasDetailAttached: false,
    },
  });

  const transactionType = watch('type');
  const category = watch('category');

  const onFormSubmit = async (data: CreateTransactionRequest) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Type Selection */}
      <div className="flex gap-4">
        <label className="flex items-center">
          <input
            type="radio"
            value="income"
            {...register('type')}
            className="mr-2"
          />
          Add Fund (Income)
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="expense"
            {...register('type')}
            className="mr-2"
          />
          Record Expense
        </label>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium">Amount *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          {...register('amount', { required: true, min: 0.01 })}
          className="mt-1 block w-full border rounded-md px-3 py-2"
        />
        {errors.amount && <p className="text-red-500 text-sm">Amount is required</p>}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium">Date *</label>
        <input
          type="date"
          {...register('date', { required: true })}
          className="mt-1 block w-full border rounded-md px-3 py-2"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          {...register('description')}
          rows={2}
          className="mt-1 block w-full border rounded-md px-3 py-2"
        />
      </div>

      {/* Income-specific: Mode of Payment */}
      {transactionType === 'income' && (
        <div>
          <label className="block text-sm font-medium">Mode of Payment</label>
          <select
            {...register('modeOfPayment')}
            className="mt-1 block w-full border rounded-md px-3 py-2"
          >
            <option value="">-- Select --</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
      )}

      {/* Expense-specific: Category */}
      {transactionType === 'expense' && (
        <>
          <div>
            <label className="block text-sm font-medium">Category *</label>
            <select
              {...register('category', { required: transactionType === 'expense' })}
              className="mt-1 block w-full border rounded-md px-3 py-2"
            >
              <option value="">-- Select Category --</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Category (when "other" is selected) */}
          {category === 'other' && (
            <div>
              <label className="block text-sm font-medium">Custom Category *</label>
              <input
                type="text"
                {...register('customCategory', { required: category === 'other' })}
                className="mt-1 block w-full border rounded-md px-3 py-2"
                placeholder="Enter custom category name"
              />
            </div>
          )}

          {/* Has Detail Attached */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('hasDetailAttached')}
                className="mr-2"
              />
              Has supporting document attached
            </label>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Transaction'}
        </button>
      </div>
    </form>
  );
}
```

---

## Error Handling

Handle API errors consistently:

```typescript
// utils/errorHandler.ts

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const apiError = error as ApiError;
    
    switch (apiError.error.code) {
      case 'POCKET_NOT_FOUND':
        return 'The requested pocket was not found.';
      case 'TRANSACTION_NOT_FOUND':
        return 'The requested transaction was not found.';
      case 'VALIDATION_ERROR':
        return apiError.error.message || 'Please check your input and try again.';
      case 'INSUFFICIENT_BALANCE':
        return 'Insufficient balance in the pocket.';
      case 'INVALID_CATEGORY':
        return 'Please select a valid expense category.';
      case 'DUPLICATE_POCKET_NAME':
        return 'A pocket with this name already exists.';
      default:
        return apiError.error.message || 'An unexpected error occurred.';
    }
  }
  
  return 'An unexpected error occurred.';
}
```

---

## Utility Functions

```typescript
// utils/format.ts

export function formatCurrency(amount: number, currency = 'BDT'): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getCategoryLabel(category: string, customCategory?: string | null): string {
  if (category === 'fund') return 'Fund Addition';
  if (category === 'other' && customCategory) return customCategory;
  
  const found = EXPENSE_CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category;
}
```

---

## State Management with Zustand (Alternative)

If you prefer Zustand over React Query:

```typescript
// stores/accountingStore.ts
import { create } from 'zustand';
import { accountingApi } from '../services/accountingApi';

interface AccountingState {
  pockets: PocketWithBalance[];
  selectedPocket: PocketWithBalance | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchPockets: () => Promise<void>;
  selectPocket: (id: string) => Promise<void>;
  fetchTransactions: (pocketId: string, filters?: TransactionFilters) => Promise<void>;
  createTransaction: (pocketId: string, data: CreateTransactionRequest) => Promise<void>;
}

export const useAccountingStore = create<AccountingState>((set, get) => ({
  pockets: [],
  selectedPocket: null,
  transactions: [],
  isLoading: false,
  error: null,

  fetchPockets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await accountingApi.getAllPockets();
      set({ pockets: response.data || [], isLoading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  selectPocket: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await accountingApi.getPocket(id);
      set({ selectedPocket: response.data || null, isLoading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  fetchTransactions: async (pocketId: string, filters?: TransactionFilters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await accountingApi.getTransactions(pocketId, filters);
      set({ transactions: response.data?.transactions || [], isLoading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
    }
  },

  createTransaction: async (pocketId: string, data: CreateTransactionRequest) => {
    set({ isLoading: true, error: null });
    try {
      await accountingApi.createTransaction(pocketId, data);
      // Refresh data
      await get().fetchPockets();
      await get().fetchTransactions(pocketId);
      set({ isLoading: false });
    } catch (error) {
      set({ error: getErrorMessage(error), isLoading: false });
      throw error;
    }
  },
}));
```

---

## Testing Endpoints with cURL

```bash
# Get all pockets
curl -X GET http://localhost:3000/api/accounting/pockets

# Create a pocket
curl -X POST http://localhost:3000/api/accounting/pockets \
  -H "Content-Type: application/json" \
  -d '{"name": "Main Pocket", "description": "Default petty cash"}'

# Add fund (income)
curl -X POST http://localhost:3000/api/accounting/pockets/{pocketId}/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "amount": 10000,
    "description": "Monthly replenishment",
    "modeOfPayment": "bank_transfer",
    "date": "2026-02-06T09:00:00Z"
  }'

# Record expense
curl -X POST http://localhost:3000/api/accounting/pockets/{pocketId}/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount": 500,
    "description": "Office supplies",
    "category": "office_admin",
    "hasDetailAttached": true,
    "date": "2026-02-06T10:00:00Z"
  }'

# Get transactions with filters
curl -X GET "http://localhost:3000/api/accounting/pockets/{pocketId}/transactions?type=expense&page=1&limit=20"

# Get pocket summary
curl -X GET "http://localhost:3000/api/accounting/pockets/{pocketId}/summary?dateFrom=2026-01-01&dateTo=2026-02-28"

# Export as CSV
curl -X GET "http://localhost:3000/api/accounting/pockets/{pocketId}/export" -O
```

---

## Migration from localStorage

If you're migrating from a localStorage-based implementation:

```typescript
// utils/migration.ts

interface LocalStorageData {
  accounting_data: {
    pockets: Array<{
      id: string;
      name: string;
      description?: string;
    }>;
    transactions: Array<{
      id: string;
      pocketId?: string;
      type: 'income' | 'expense';
      amount: number;
      // ... other fields
    }>;
  };
}

export async function migrateFromLocalStorage() {
  const stored = localStorage.getItem('accounting_data');
  if (!stored) return;

  const data: LocalStorageData = JSON.parse(stored);
  
  // 1. Create pockets
  for (const pocket of data.accounting_data.pockets) {
    try {
      await accountingApi.createPocket({
        name: pocket.name,
        description: pocket.description,
      });
    } catch (error) {
      console.error(`Failed to migrate pocket: ${pocket.name}`, error);
    }
  }

  // 2. Get newly created pockets to map IDs
  const pocketsResponse = await accountingApi.getAllPockets();
  const pocketMap = new Map(
    pocketsResponse.data?.map((p) => [p.name, p.id]) || []
  );

  // 3. Create transactions
  for (const tx of data.accounting_data.transactions) {
    const pocketId = tx.pocketId 
      ? pocketMap.get(tx.pocketId) || pocketMap.values().next().value
      : pocketMap.values().next().value;

    if (!pocketId) continue;

    try {
      await accountingApi.createTransaction(pocketId, {
        type: tx.type,
        amount: tx.amount,
        date: tx.date || new Date().toISOString(),
        // ... map other fields
      });
    } catch (error) {
      console.error(`Failed to migrate transaction`, error);
    }
  }

  // 4. Clear localStorage after successful migration
  // localStorage.removeItem('accounting_data');
}
```

---

## Summary

The Petty Cash system provides:

1. **Multiple Pockets** - Create and manage separate cash funds
2. **Transactions** - Record income (fund additions) and expenses
3. **Categories** - Predefined expense categories with custom option
4. **Balances** - Automatic balance calculation
5. **Summaries** - Detailed reports with category breakdowns
6. **Export** - CSV export for reporting

Use the provided TypeScript interfaces, API service, and hooks to quickly integrate with your frontend application.
