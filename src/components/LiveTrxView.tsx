import React, { useState } from 'react';
import {
  Activity,
  Coins,
  CheckCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertCircle,
  CreditCard,
  Banknote,
  Sparkles,
  Info,
  Phone,
  Layers,
  HelpCircle,
  Plus,
  Pencil,
} from 'lucide-react';
import { DayBlockResult, SheetTransactionRow, TransactionInput } from '../services/sheetsApi';
import { formatIndonesianDate, formatRupiah } from '../utils/dateUtils';
import { EditTransactionModal } from './EditTransactionModal';

interface LiveTrxViewProps {
  selectedDate: string;
  dayBlock: DayBlockResult | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenSheetSelector: () => void;
  onGoToBatch?: () => void;
  onUpdateTransaction?: (rowNumber: number, data: TransactionInput) => Promise<void>;
  isUpdating?: boolean;
  spreadsheetName: string | null;
}

export const LiveTrxView: React.FC<LiveTrxViewProps> = ({
  selectedDate,
  dayBlock,
  isLoading,
  error,
  onRefresh,
  onOpenSheetSelector,
  onGoToBatch,
  onUpdateTransaction,
  isUpdating = false,
  spreadsheetName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LUNAS' | 'TIDAK LUNAS'>('ALL');
  const [showRawInspector, setShowRawInspector] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<SheetTransactionRow | null>(null);

  // Filter filled transactions
  const filledRows = (dayBlock?.rows || []).filter((r) => !r.isEmpty);
  const filteredRows = filledRows.filter((row) => {
    const matchesSearch =
      !searchQuery ||
      row.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.phoneNumber.includes(searchQuery) ||
      row.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.paket.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.note.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'LUNAS' && row.status.toUpperCase() === 'LUNAS') ||
      (statusFilter === 'TIDAK LUNAS' && row.status.toUpperCase() !== 'LUNAS');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3">
      {/* If No Spreadsheet connected */}
      {!spreadsheetName && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
          <FileSpreadsheet className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="font-bold text-amber-900 text-sm">Belum Ada Spreadsheet Terhubung</h3>
          <p className="text-xs text-amber-800 max-w-sm mx-auto">
            Hubungkan file Google Sheet kasir bulanan Anda (misal: <code>KASIR TRCN OCTOBER 2026</code>) untuk mulai membaca transaksi.
          </p>
          <button
            onClick={onOpenSheetSelector}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition"
          >
            Pilih Google Sheet Sekarang
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 flex items-start space-x-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-900">Gagal Membaca Data dari Sheet</p>
            <p className="mt-0.5">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-2 text-xs font-semibold text-rose-700 underline hover:text-rose-900 cursor-pointer"
            >
              Coba Muat Ulang
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 py-6 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-medium text-slate-600">
            Membaca Day Block tanggal {formatIndonesianDate(selectedDate)} dari Google Sheets...
          </div>
        </div>
      )}

      {/* Loaded Content */}
      {!isLoading && dayBlock && (
        <>
          {/* Day Block Summary Cards (Sums from Day Header row) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Total Bayar */}
            <div className="col-span-2 bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-blue-200 text-xs font-medium mb-1">
                <span>TOTAL TRANSAKSI HARI INI</span>
                <span className="text-[11px] bg-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                  {dayBlock.filledRowCount}/20 Baris
                </span>
              </div>
              <div className="text-2xl font-black tracking-tight">
                {formatRupiah(dayBlock.headerRow?.totalTxBayar || 0)}
              </div>
              <div className="text-[11px] text-blue-200 mt-1 flex items-center gap-2">
                <span>Cash: {formatRupiah(dayBlock.headerRow?.totalCash || 0)}</span>
                <span>•</span>
                <span>QRIS: {formatRupiah(dayBlock.headerRow?.totalQris || 0)}</span>
              </div>
            </div>

            {/* Washer Coins */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 font-bold shrink-0">
                W
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-600 uppercase">Koin Washer</div>
                <div className="text-lg font-black text-slate-800">
                  {dayBlock.headerRow?.totalWasher || 0}{' '}
                  <span className="text-xs font-normal text-slate-500">koin</span>
                </div>
              </div>
            </div>

            {/* Dryer Coins */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                D
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-600 uppercase">Koin Dryer</div>
                <div className="text-lg font-black text-slate-800">
                  {dayBlock.headerRow?.totalDryer || 0}{' '}
                  <span className="text-xs font-normal text-slate-500">koin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari customer, paket, atau item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 hover:bg-white"
              />
            </div>

            {/* Status Tabs & Action */}
            <div className="flex items-center space-x-2">
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({filledRows.length})
                </button>
                <button
                  onClick={() => setStatusFilter('LUNAS')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === 'LUNAS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  Lunas
                </button>
                <button
                  onClick={() => setStatusFilter('TIDAK LUNAS')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === 'TIDAK LUNAS' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-amber-800'
                  }`}
                >
                  Pending
                </button>
              </div>

              {onGoToBatch && (
                <button
                  onClick={onGoToBatch}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Input</span> Transaksi
                </button>
              )}
            </div>
          </div>

          {/* Transaction Cards List */}
          {filteredRows.length > 0 ? (
            <div className="space-y-2">
              {filteredRows.map((trx) => {
                const isLunas = trx.status.toUpperCase() === 'LUNAS';

                return (
                  <div
                    key={trx.rowNumber}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all space-y-2"
                  >
                    {/* Top Row: Slot #, Customer, Status, Bayar */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                          {trx.slotNumber}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                            <span>{trx.customer || 'Tanpa Nama'}</span>
                            {trx.paymentMode && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  trx.paymentMode === 'QRIS'
                                    ? 'bg-blue-100 text-blue-700'
                                    : trx.paymentMode === 'CASH'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {trx.paymentMode}
                              </span>
                            )}
                          </div>
                          {trx.phoneNumber && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{trx.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Bayar & Status Badge */}
                      <div className="text-right">
                        <div className="font-extrabold text-sm text-slate-900">
                          {formatRupiah(trx.bayar || trx.hargaCash + trx.hargaQris)}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isLunas
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/50'
                              : 'bg-amber-100 text-amber-800 border border-amber-300/50'
                          }`}
                        >
                          {trx.status || 'BELUM LUNAS'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Paket, Item & Jumlah */}
                    <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-100">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-600 uppercase block">Paket:</span>
                        <span className="font-medium text-slate-800">{trx.paket || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-600 uppercase block">Item Tambahan:</span>
                        <span className="font-medium text-slate-800">
                          {trx.item ? `${trx.item} (${trx.jumlah || '1'})` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Coins & Split breakdown + Note */}
                    <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-1.5 border-t border-slate-100">
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 font-semibold border border-cyan-200/50">
                          Washer: <b>{trx.washerCoins}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-semibold border border-orange-200/50">
                          Dryer: <b>{trx.dryerCoins}</b>
                        </span>
                        {trx.hargaCash > 0 && trx.hargaQris > 0 && (
                          <span className="text-slate-600">
                            Cash {formatRupiah(trx.hargaCash)} + QRIS {formatRupiah(trx.hargaQris)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {trx.note && (
                          <div className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Note: {trx.note}
                          </div>
                        )}
                        {onUpdateTransaction && (
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(trx)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
              <Activity className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">
                {filledRows.length === 0
                  ? `Belum Ada Transaksi pada ${formatIndonesianDate(selectedDate)}`
                  : 'Tidak ada transaksi yang cocok dengan pencarian.'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {filledRows.length === 0
                  ? `Day Block untuk tanggal ini masih kosong (tersedia 20 baris input). Setiap transaksi yang diketik langsung di Google Sheet atau diinput via form aplikasi akan otomatis tersimpan di sini.`
                  : 'Ubah kata kunci pencarian atau filter status untuk melihat transaksi lainnya.'}
              </p>
              {filledRows.length === 0 && onGoToBatch && (
                <div className="pt-2">
                  <button
                    onClick={onGoToBatch}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Input Transaksi Sekarang</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Verification Drawer: Raw Sheet Row Inspector */}
          <div className="pt-2">
            <button
              onClick={() => setShowRawInspector(!showRawInspector)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Inspeksi Baris Sheet (Verifikasi Tahap 1: Read-Only & Formula)</span>
              </div>
              {showRawInspector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRawInspector && (
              <div className="mt-2 bg-slate-900 text-slate-200 rounded-xl p-3 text-xs font-mono overflow-x-auto space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5 text-[11px]">
                  <span>Target Tab: <b className="text-emerald-400">{dayBlock.tabName}</b></span>
                  <span>Header Baris Sheet: <b className="text-blue-400">Row {dayBlock.headerRow?.rowNumber}</b></span>
                  <span>Baris Kosong Pertama: <b className="text-amber-400">{dayBlock.firstEmptyRow ? `Row ${dayBlock.firstEmptyRow}` : 'Penuh'}</b></span>
                </div>

                <div className="text-[11px] text-slate-300 space-y-1">
                  <div className="text-slate-400 font-sans">
                    ✓ <b>Proteksi Formula:</b> Kolom L (BAYAR) dibaca langsung dari formula sheet <code>=IF(M="LUNAS", N(J)+N(K), 0)</code>.
                  </div>
                  <div className="text-slate-400 font-sans">
                    ✓ <b>Proteksi Kolom O:</b> Panel side <code>BALANCE COIN</code> di kolom O tidak dimodifikasi.
                  </div>
                </div>

                {/* Table representation */}
                <div className="overflow-x-auto max-h-64 mt-2">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300">
                        <th className="p-1 border border-slate-700">Row</th>
                        <th className="p-1 border border-slate-700">No</th>
                        <th className="p-1 border border-slate-700">B (Cust)</th>
                        <th className="p-1 border border-slate-700">D (Mode)</th>
                        <th className="p-1 border border-slate-700">G (Paket)</th>
                        <th className="p-1 border border-slate-700">H (W)</th>
                        <th className="p-1 border border-slate-700">I (D)</th>
                        <th className="p-1 border border-slate-700">L (Bayar)</th>
                        <th className="p-1 border border-slate-700">M (Status)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayBlock.rows.map((r) => (
                        <tr
                          key={r.rowNumber}
                          className={r.isEmpty ? 'text-slate-500' : 'text-slate-200 bg-slate-800/40'}
                        >
                          <td className="p-1 border border-slate-800 font-bold text-amber-400">{r.rowNumber}</td>
                          <td className="p-1 border border-slate-800">{r.slotNumber}</td>
                          <td className="p-1 border border-slate-800 truncate max-w-[100px]">{r.customer || '-'}</td>
                          <td className="p-1 border border-slate-800">{r.paymentMode || '-'}</td>
                          <td className="p-1 border border-slate-800 truncate max-w-[90px]">{r.paket || '-'}</td>
                          <td className="p-1 border border-slate-800">{r.washerCoins}</td>
                          <td className="p-1 border border-slate-800">{r.dryerCoins}</td>
                          <td className="p-1 border border-slate-800 text-emerald-400 font-bold">{r.bayar}</td>
                          <td className="p-1 border border-slate-800">{r.status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Edit Transaction Modal */}
          <EditTransactionModal
            isOpen={Boolean(editingTransaction)}
            onClose={() => setEditingTransaction(null)}
            transaction={editingTransaction}
            targetTabName={dayBlock.tabName}
            onSaveEdit={async (rowNum, data) => {
              if (onUpdateTransaction) {
                await onUpdateTransaction(rowNum, data);
              }
            }}
            isSaving={isUpdating}
          />
        </>
      )}
    </div>
  );
};
