export interface Settings {
  id: number;
  minWeeks: number;
  bufferWeeks: number;
  maxWeeks: number;
  defaultFilename: string;
  appTitle: string;
}

export interface Group {
  id: number;
  name: string;
  notes: string;
}

export interface SKU {
  id: number;
  kod: string;
  nama: string;
  saizPek: number;
  groupId: number | null;
  enabled: boolean;
  fullStockAlways: boolean;
  notes: string;
  stokSemasa: number;
  usageMonth1: number;
  usageMonth2: number;
  usageMonth3: number;
  useManualLevels: boolean;
  minManual: number;
  penimbalManual: number;
  maksManual: number;
}

export interface Order {
  id: number;
  tarikh: string;
  namaPembuat: string;
  tempohMinggu: number;
  notes: string;
  itemCount?: number;
  items?: OrderItem[];
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  skuId: number | null;
  kod: string;
  qtyOrdered: number;
  notes: string;
}

export interface StockLevels {
  awu: number;
  min: number;
  penimbal: number;
  maks: number;
}

export type StockStatus = 'ok' | 'low' | 'critical' | 'out' | 'disabled';

export interface ExcelImportResult {
  success: boolean;
  filename: string;
  updated: Array<{ kod: string; nama: string; oldQty: number; newQty: number }>;
  updatedCount: number;
  missingFromExcel: Array<{ kod: string; nama: string; stokSemasa: number }>;
  missingFromExcelCount: number;
  notFoundInAppCount: number;
}

export interface ExportData {
  settings: Settings[];
  groups: Group[];
  skus: SKU[];
  orders: Order[];
  orderItems: OrderItem[];
  exportedAt: string;
  version: number;
}
