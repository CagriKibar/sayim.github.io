
import * as XLSX from 'xlsx';
import { StockItem } from '../types';

export const exportToExcel = (items: StockItem[]) => {
  const ws = XLSX.utils.json_to_sheet(items.map(item => ({
    Barkod: item.barcode,
    Miktar: item.quantity,
    'Son Okuma': new Date(item.lastScannedAt).toLocaleString('tr-TR')
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stok Listesi");

  // Generate file name with date
  const date = new Date().toISOString().split('T')[0];
  const fileName = `stok_listesi_${date}.xlsx`;

  XLSX.writeFile(wb, fileName);
};
