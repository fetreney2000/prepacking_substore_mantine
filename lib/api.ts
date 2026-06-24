import {
  Settings, Group, SKU, Order, OrderItem,
  ExportData, ExcelImportResult,
} from './types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
  return data as T;
}

export const api = {
  settings: {
    get: () => apiFetch<Settings>('/api/settings'),
    update: (body: Partial<Settings>) =>
      apiFetch<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },

  groups: {
    list: () => apiFetch<Group[]>('/api/groups'),
    create: (body: { name: string; notes?: string }) =>
      apiFetch<Group>('/api/groups', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: { name: string; notes?: string }) =>
      apiFetch<Group>(`/api/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/groups/${id}`, { method: 'DELETE' }),
  },

  skus: {
    list: (groupId?: number) => {
      const q = groupId ? `?groupId=${groupId}` : '';
      return apiFetch<SKU[]>(`/api/skus${q}`);
    },
    get: (id: number) => apiFetch<SKU>(`/api/skus/${id}`),
    create: (body: Partial<SKU>) =>
      apiFetch<SKU>('/api/skus', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<SKU>) =>
      apiFetch<SKU>(`/api/skus/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/skus/${id}`, { method: 'DELETE' }),
  },

  orders: {
    list: () => apiFetch<Order[]>('/api/orders'),
    get: (id: number) => apiFetch<Order>(`/api/orders/${id}`),
    create: (body: {
      tarikh: string; namaPembuat: string; tempohMinggu: number;
      notes: string; items: OrderItem[];
    }) =>
      apiFetch<{ success: boolean; id: number }>('/api/orders', {
        method: 'POST', body: JSON.stringify(body),
      }),
    update: (id: number, body: {
      tarikh: string; namaPembuat: string; tempohMinggu: number;
      notes: string; items: OrderItem[];
    }) =>
      apiFetch<Order>(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/orders/${id}`, { method: 'DELETE' }),
  },

  orderItems: {
    list: (orderId: number) =>
      apiFetch<OrderItem[]>(`/api/order-items?orderId=${orderId}`),
  },

  exportData: () => apiFetch<ExportData>('/api/export'),

  importData: (data: ExportData) =>
    apiFetch<{ success: boolean; counts: Record<string, number> }>('/api/import', {
      method: 'POST', body: JSON.stringify(data),
    }),

  importExcel: (filename: string, rows: Record<string, unknown>[]) =>
    apiFetch<ExcelImportResult>('/api/import-excel', {
      method: 'POST', body: JSON.stringify({ filename, rows }),
    }),
};
