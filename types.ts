export interface StockItem {
  barcode: string;
  quantity: number;
  lastScannedAt: number; // timestamp
}

export enum AppMode {
  SCAN = 'SCAN',
  LIST = 'LIST',
}

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}