import React from 'react';
import { Layers, Plus, Clock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface BatchPlaceholderProps {
  onGoToLiveTrx: () => void;
  selectedDate: string;
  tabName: string;
}

export const BatchPlaceholder: React.FC<BatchPlaceholderProps> = ({
  onGoToLiveTrx,
  selectedDate,
  tabName,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Form Transaksi Kasir (Batch)</h2>
          <p className="text-xs text-slate-500">
            Target Penyimpanan: <span className="font-semibold text-blue-700">{tabName}</span> (Tahap 2)
          </p>
        </div>
      </div>

      <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-900 space-y-2">
        <p className="font-bold flex items-center gap-1.5 text-blue-950">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Status Rencana Pengerjaan Bertahap:</span>
        </p>
        <p className="text-blue-800 leading-relaxed">
          Saat ini kita berada di <b>Tahap 1 (Read-Only)</b> untuk menguji koneksi Google Sheet dan pembacaan Day Block riil dari sheet Anda di tab <b>Live Trx</b>.
        </p>
        <div className="pt-2 border-t border-blue-200/60 space-y-1 text-slate-700">
          <div className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tahap 0: Analisis struktur sheet & perizinan Google Workspace (Selesai)</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span>Tahap 1 (Aktif): Read-Only Live Trx, deteksi tanggal Jakarta & peringatan</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-0.5" />
            <span>Tahap 2: Simpan transaksi single payment & split ke baris kosong pertama</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-0.5" />
            <span>Tahap 3: Split payment, auto-suggest koin, rekonsiliasi opname koin</span>
          </div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={onGoToLiveTrx}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          <span>Uji Live Trx Sekarang</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
