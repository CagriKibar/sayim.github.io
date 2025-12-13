
import React from 'react';
import { StockItem } from '../types';
import { Trash2, FileSpreadsheet, RotateCcw, Plus, Minus } from 'lucide-react';

interface StockListProps {
    items: StockItem[];
    onIncrement: (barcode: string) => void;
    onDecrement: (barcode: string) => void;
    onDelete: (barcode: string) => void;
    onExport: () => void;
    onClearAll: () => void;
}

const StockList: React.FC<StockListProps> = ({
    items,
    onIncrement,
    onDecrement,
    onDelete,
    onExport,
    onClearAll
}) => {
    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header Actions */}
            <div className="flex gap-2 p-4 bg-white shadow-sm z-10">
                <button
                    onClick={onExport}
                    disabled={items.length === 0}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
                >
                    <FileSpreadsheet size={20} />
                    Excel'e Aktar
                </button>
                <button
                    onClick={onClearAll}
                    disabled={items.length === 0}
                    className="bg-red-100 text-red-600 p-3 rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
                >
                    <RotateCcw size={20} />
                </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 content-start">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <p className="text-lg">Liste boş</p>
                        <p className="text-sm">Henüz ürün okutmadınız</p>
                    </div>
                ) : (
                    <div className="space-y-3 pb-20">
                        {items.map((item) => (
                            <div key={item.barcode} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-lg font-bold text-gray-800 tracking-wide break-all">{item.barcode}</span>
                                    </div>
                                    <button
                                        onClick={() => onDelete(item.barcode)}
                                        className="text-gray-300 hover:text-red-500 p-2 -mr-2 -mt-2 active:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1">
                                    <button
                                        onClick={() => onDecrement(item.barcode)}
                                        className="w-12 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-md text-gray-600 shadow-sm active:bg-gray-100 active:scale-95 transition-all"
                                    >
                                        <Minus size={20} />
                                    </button>

                                    <span className="font-bold text-xl text-blue-600 w-full text-center">
                                        {item.quantity}
                                    </span>

                                    <button
                                        onClick={() => onIncrement(item.barcode)}
                                        className="w-12 h-10 flex items-center justify-center bg-blue-600 border border-blue-600 rounded-md text-white shadow-sm active:bg-blue-700 active:scale-95 transition-all"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockList;
