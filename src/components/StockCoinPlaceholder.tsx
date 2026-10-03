import React from 'react';
import { Coins, CheckCircle, Scale, Package, ShieldAlert } from 'lucide-react';
import { DayBlockResult } from '../services/sheetsApi';

interface StockCoinPlaceholderProps {
  dayBlock: DayBlockResult | null;
  onGoToLiveTrx: () => void;
}

export const StockCoinPlaceholder: React.FC<StockCoinPlaceholderProps> = ({
  dayBlock,
  onGoToLiveTrx,
}) => {
  return (
    <div className="space-y-3">
      {/* Coin Balancing Preview */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Rekonsiliasi Koin Harian (Tahap 3)</h3>
            <p className="text-[11px] text-slate-500">
              Perbandingan koin terpakai dari transaksi hari ini vs hitungan fisik kasir (opname)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Washer dari Transaksi</div>
            <div className="text-lg font-black text-slate-800">
              {dayBlock?.headerRow?.totalWasher || 0} <span className="text-xs font-normal">koin</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Dryer dari Transaksi</div>
            <div className="text-lg font-black text-slate-800">
              {dayBlock?.headerRow?.totalDryer || 0} <span className="text-xs font-normal">koin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Management Preview */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2 text-xs">
        <div className="flex items-center space-x-2 text-slate-800 font-bold">
          <Package className="w-4 h-4 text-blue-600" />
          <span>Manajemen Stok TRCN STOK (Tahap 5)</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          Stok dihitung murni dari: <code>Stok Awal + Restock - Penjualan LUNAS</code> di seluruh file bulanan. Form restock dan koreksi akan diaktifkan pada Tahap 5.
        </p>
      </div>
    </div>
  );
};
