import React, { useState, useEffect, useCallback } from 'react';
import { StockItem, AppMode, ToastMessage } from './types';
import BarcodeScanner from './components/BarcodeScanner';
import StockList from './components/StockList';
import { exportToExcel } from './services/excelService';
import { Scan, List, Download, Plus, Minus } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.SCAN);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualQuantity, setManualQuantity] = useState(1);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('stock_items');
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems));
      } catch (e) {
        console.error("Failed to parse saved items", e);
      }
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('stock_items', JSON.stringify(items));
  }, [items]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim(), manualQuantity);
      setManualBarcode("");
      setManualQuantity(1);
    }
  };

  const handleScan = useCallback((barcode: string, qty: number = 1) => {
    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.barcode === barcode);

      if (existingItemIndex >= 0) {
        // Increment existing
        const newItems = [...prevItems];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + qty,
          lastScannedAt: Date.now()
        };
        addToast(`${barcode}: +${qty} Eklendi (Top: ${newItems[existingItemIndex].quantity})`, 'success');
        return newItems;
      } else {
        // Add new
        addToast(`${barcode}: Listeye Eklendi`, 'success');
        return [{
          barcode,
          quantity: qty,
          lastScannedAt: Date.now()
        }, ...prevItems];
      }
    });
  }, []);

  const handleIncrement = (barcode: string) => {
    setItems(prev => {
      const newItems = prev.map(item =>
        item.barcode === barcode ? { ...item, quantity: item.quantity + 1, lastScannedAt: Date.now() } : item
      );
      return newItems;
    });
  };

  const handleDecrement = (barcode: string) => {
    setItems(prev => {
      const newItems = prev.map(item => {
        if (item.barcode !== barcode) return item;
        // Ensure quantity doesn't go below 1 through decrementing, 
        // deletion should be a separate explicit action.
        return { ...item, quantity: Math.max(1, item.quantity - 1), lastScannedAt: Date.now() };
      });
      return newItems;
    });
  };

  const handleDelete = (barcode: string) => {
    if (window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      setItems(prev => prev.filter(item => item.barcode !== barcode));
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Tüm listeyi silmek istediğinize emin misiniz?')) {
      setItems([]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Top Bar */}
      <header className="bg-blue-600 text-white p-4 shadow-md z-10">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight">Barkod Stok Takip</h1>
          <div className="text-xs bg-blue-700 px-2 py-1 rounded">
            v1.0
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden p-4 max-w-4xl mx-auto w-full relative">
        {mode === AppMode.SCAN && (
          <div className="flex flex-col h-full gap-4 animate-fadeIn">
            <div className="flex-none h-[40vh] min-h-[300px]">
              <BarcodeScanner onScan={handleScan} addToast={addToast} />
            </div>

            {/* Manual Entry */}
            {/* Manual Entry */}
            <form onSubmit={handleManualSubmit} className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Manuel barkod giriniz..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base font-mono"
              />

              <div className="flex gap-2 h-12">
                {/* Quantity Control */}
                <div className="flex-1 flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setManualQuantity(Math.max(1, manualQuantity - 1))}
                    className="h-full px-3 text-gray-500 hover:bg-gray-200 active:bg-gray-300 transition-colors flex items-center justify-center border-r border-gray-200 w-12"
                  >
                    <Minus size={20} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 w-full h-full text-center bg-transparent border-none focus:ring-0 font-bold text-gray-800 text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setManualQuantity(manualQuantity + 1)}
                    className="h-full px-3 text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-center border-l border-gray-200 w-12"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!manualBarcode}
                  className="px-6 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95 flex items-center justify-center min-w-[100px]"
                >
                  EKLE
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 px-1 uppercase tracking-wider">Son Okunanlar</h3>
              <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-inner border border-gray-200 p-2">
                {items.length === 0 ? (
                  <p className="text-center text-gray-400 mt-10 text-sm">Henüz okuma yapılmadı.</p>
                ) : (
                  items.slice(0, 10).map((item) => (
                    <div key={item.barcode} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0 gap-2">
                      <span className="font-mono text-sm font-medium text-gray-700 truncate flex-1 min-w-0">{item.barcode}</span>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                        {item.quantity} Adet
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {mode === AppMode.LIST && (
          <div className="h-full animate-fadeIn">
            <StockList
              items={items}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onDelete={handleDelete}
              onExport={() => exportToExcel(items)}
              onClearAll={handleClearAll}
            />
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-xs pointer-events-none px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm text-center
              transition-all duration-300 animate-slideIn
              ${toast.type === 'success' ? 'border-l-4 border-green-500' : ''}
              ${toast.type === 'error' ? 'border-l-4 border-red-500' : ''}
            `}
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex justify-around items-center h-16 max-w-4xl mx-auto">
          <button
            onClick={() => setMode(AppMode.SCAN)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${mode === AppMode.SCAN ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Scan size={24} className={mode === AppMode.SCAN ? 'fill-blue-100' : ''} />
            <span className="text-xs font-medium mt-1">Tara</span>
          </button>

          <div className="w-px h-8 bg-gray-200"></div>

          <button
            onClick={() => setMode(AppMode.LIST)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${mode === AppMode.LIST ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <List size={24} className={mode === AppMode.LIST ? 'fill-blue-100' : ''} />
            <span className="text-xs font-medium mt-1">Liste</span>
          </button>
        </div>
      </nav>

      <style>{`
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

export default App;