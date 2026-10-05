import {
  Settings, Group, SKU, Order, OrderItem, OrderWithItems,
  ExportData, ExcelImportResult,
} from './types';

/** 
 * Client-side ceiling on every request. The server caps handlers at 30s
 * (`maxDuration`), so 35s only ever fires when the connection itself hangs —
 * turning an endless spinner into an error the pages can report (review #29).
 */
function defaultSignal(): AbortSignal | undefined {
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(35_000) : undefined;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    // Default Content-Type, but a caller-supplied header must win — the
    // spread order used to let `options` clobber the merged headers entirely.
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    signal: options?.signal ?? defaultSignal(),
  });
  // Session expired / not signed in: bounce to the login page (except there).
  if (
    res.status === 401 &&
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/login')
  ) {
    window.location.assign('/login');
    throw new Error('Sesi tamat. Sila log masuk semula.');
  }
  // A non-JSON body (an HTML 404/500 page, an empty response) used to throw
  // "Unexpected token <" instead of reporting the actual status.
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  if (data === null) throw new Error(`Respons tidak sah dari ${url}`);
  return data as T;
}

export const api = {
  auth: {
    login: (password: string) =>
      apiFetch<{ success: boolean }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    logout: () =>
      apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  },

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

  report: {
    /** Orders (optionally limited to a date range) with items embedded. */
    orders: (from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const query = params.toString();
      return apiFetch<OrderWithItems[]>(
        `/api/report/orders${query ? `?${query}` : ''}`
      );
    },
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
