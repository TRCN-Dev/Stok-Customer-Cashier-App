import React, { useState } from 'react';
import {
  CalendarRange,
  Sparkles,
  FolderPlus,
  Package,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import { createMonthlySpreadsheet, createStockSpreadsheet } from '../services/templateGenerator';
import { SpreadsheetInfo } from '../services/sheetsApi';

interface MonthRolloverProps {
  currentMonthName: string;
  accessToken: string | null;
  onSelectSpreadsheet: (sheetInfo: SpreadsheetInfo) => void;
}

export const MonthRolloverPlaceholder: React.FC<MonthRolloverProps> = ({
  currentMonthName,
  accessToken,
  onSelectSpreadsheet,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [isCreatingKasir, setIsCreatingKasir] = useState<boolean>(false);
  const [isCreatingStock, setIsCreatingStock] = useState<boolean>(false);
  const [createdKasir, setCreatedKasir] = useState<SpreadsheetInfo | null>(null);
  const [createdStock, setCreatedStock] = useState<SpreadsheetInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const monthNames = [
    'Januari (JANUARY)', 'Februari (FEBRUARY)', 'Maret (MARCH)', 'April (APRIL)',
    'Mei (MAY)', 'Juni (JUNE)', 'Juli (JULY)', 'Agustus (AUGUST)',
    'September (SEPTEMBER)', 'Oktober (OCTOBER)', 'November (NOVEMBER)', 'Desember (DECEMBER)'
  ];

  const handleCreateKasir = async () => {
    if (!accessToken) {
      setErrorMsg('Silakan login terlebih dahulu untuk membuat file di Google Drive.');
      return;
    }
    setIsCreatingKasir(true);
    setErrorMsg(null);
    try {
      const result = await createMonthlySpreadsheet(selectedMonth, selectedYear, accessToken);
      setCreatedKasir(result);
      onSelectSpreadsheet(result);
    } catch (err: any) {
      console.error('Error creating monthly sheet:', err);
      setErrorMsg(err.message || 'Gagal membuat file spreadsheet kasir.');
    } finally {
      setIsCreatingKasir(false);
    }
  };

  const handleCreateStock = async () => {
    if (!accessToken) {
      setErrorMsg('Silakan login terlebih dahulu untuk membuat file di Google Drive.');
      return;
    }
    setIsCreatingStock(true);
    setErrorMsg(null);
    try {
      const result = await createStockSpreadsheet(accessToken);
      setCreatedStock(result);
    } catch (err: any) {
      console.error('Error creating stock sheet:', err);
      setErrorMsg(err.message || 'Gagal membuat file spreadsheet stok.');
    } finally {
      setIsCreatingStock(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Kasir Monthly Spreadsheet Generator */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Buat File Spreadsheet Kasir Bulanan</h2>
            <p className="text-xs text-slate-500">
              Menghasilkan template otomatis berformat <code>KASIR TRCN &lt;MONTH&gt; &lt;YEAR&gt;</code> di Google Drive Anda.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {createdKasir && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Berhasil dibuat &amp; dihubungkan:{' '}
                <b>{createdKasir.name}</b>
              </span>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${createdKasir.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline font-semibold"
            >
              <span>Buka di Google Sheets</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Bulan:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-slate-50 focus:bg-white"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tahun:</label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleCreateKasir}
            disabled={isCreatingKasir}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
          >
            {isCreatingKasir ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Membuat File Kasir di Google Drive...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Buat Spreadsheet Kasir Baru</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stock Spreadsheet Generator */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Buat File Master Stok (TRCN STOK)</h2>
            <p className="text-xs text-slate-500">
              Membuat spreadsheet database stok terpisah dengan tab <code>ITEMS</code> (master produk) &amp; <code>RESTOCK</code>.
            </p>
          </div>
        </div>

        {createdStock && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                File Stok Berhasil Dibuat: <b>{createdStock.name}</b>
              </span>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${createdStock.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline font-semibold"
            >
              <span>Buka di Google Sheets</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            onClick={handleCreateStock}
            disabled={isCreatingStock}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
          >
            {isCreatingStock ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Membuat TRCN STOK...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Buat File TRCN STOK Baru</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
