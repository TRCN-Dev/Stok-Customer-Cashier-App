import React, { useState, useEffect } from 'react';
import {
  Coins,
  Scale,
  Package,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowUpDown,
  FileSpreadsheet,
  Shield,
  ShieldAlert,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  DayBlockResult,
  readCoinSheet,
  saveCoinOpname,
  CoinLedgerResult,
} from '../services/sheetsApi';
import { formatIndonesianDate, formatRupiah } from '../utils/dateUtils';
import { isUserAdmin, addAdminEmail, AppLayer } from '../config/roles';

interface StockCoinViewProps {
  selectedDate: string;
  dayBlock: DayBlockResult | null;
  spreadsheetId: string | null;
  accessToken: string | null;
  userEmail?: string | null;
  activeLayer?: AppLayer;
  onRefresh: () => void;
}

interface StockItem {
  name: string;
  price: number;
  initial: number;
  sold: number;
  remaining: number;
}

const INITIAL_STOCKS: StockItem[] = [
  { name: 'SOKLIN LIQUID 1K', price: 1000, initial: 180, sold: 12, remaining: 168 },
  { name: 'DOWNY 1K', price: 1000, initial: 150, sold: 8, remaining: 142 },
  { name: 'DETERJEN TRI 2K', price: 2000, initial: 50, sold: 3, remaining: 47 },
  { name: 'PLASTIK 2K', price: 2000, initial: 50, sold: 5, remaining: 45 },
  { name: 'PLASTIK 3K', price: 3000, initial: 50, sold: 2, remaining: 48 },
];

export const StockCoinView: React.FC<StockCoinViewProps> = ({
  selectedDate,
  dayBlock,
  spreadsheetId,
  accessToken,
  userEmail,
  activeLayer = 'cashier',
  onRefresh,
}) => {
  const isOwnerMode = Boolean(isUserAdmin(userEmail) && activeLayer === 'owner');

  const [coinLedger, setCoinLedger] = useState<CoinLedgerResult | null>(null);
  const [isLoadingCoin, setIsLoadingCoin] = useState(false);

  // Live Opname Inputs
  const [physicalWasher, setPhysicalWasher] = useState('');
  const [physicalDryer, setPhysicalDryer] = useState('');
  const [opnameNote, setOpnameNote] = useState('');
  const [isSavingOpname, setIsSavingOpname] = useState(false);
  const [opnameSuccess, setOpnameSuccess] = useState(false);
  const [opnameError, setOpnameError] = useState<string | null>(null);

  // Stock Management (Admin Features)
  const [stocks, setStocks] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('trcn_local_stocks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_STOCKS;
  });

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItemForRestock, setSelectedItemForRestock] = useState<string>(INITIAL_STOCKS[0].name);
  const [restockQty, setRestockQty] = useState('');
  const [restockNote, setRestockNote] = useState('');

  // Add New Item State
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemInitial, setNewItemInitial] = useState('');

  // Load COIN ledger
  const fetchCoinLedger = async () => {
    if (!spreadsheetId || !accessToken) return;
    setIsLoadingCoin(true);
    try {
      const result = await readCoinSheet(spreadsheetId, selectedDate, accessToken);
      setCoinLedger(result);
    } catch (e) {
      console.warn('Error reading coin ledger:', e);
    } finally {
      setIsLoadingCoin(false);
    }
  };

  useEffect(() => {
    fetchCoinLedger();
  }, [spreadsheetId, accessToken, selectedDate]);

  // Transaction coins for selected date (from Day Block in sheet)
  const trxWasher = dayBlock?.headerRow?.totalWasher || 0;
  const trxDryer = dayBlock?.headerRow?.totalDryer || 0;

  // Live input values (or fallback to ledger values)
  const inputW = physicalWasher !== '' ? parseInt(physicalWasher, 10) || 0 : (coinLedger?.ledgerWasher || 0);
  const inputD = physicalDryer !== '' ? parseInt(physicalDryer, 10) || 0 : (coinLedger?.ledgerDryer || 0);

  // Live Balancing Differences
  const washerDiff = inputW - trxWasher;
  const dryerDiff = inputD - trxDryer;

  // Save Opname to sheet
  const handleSaveOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetId || !accessToken) return;
    const w = parseInt(physicalWasher, 10) || 0;
    const d = parseInt(physicalDryer, 10) || 0;

    setIsSavingOpname(true);
    setOpnameError(null);
    setOpnameSuccess(false);
    try {
      await saveCoinOpname(
        spreadsheetId,
        selectedDate,
        w,
        d,
        opnameNote || 'Opname Kasir Fisik',
        accessToken
      );
      setOpnameSuccess(true);
      fetchCoinLedger();
      setTimeout(() => setOpnameSuccess(false), 3500);
    } catch (err: any) {
      setOpnameError(err.message || 'Gagal menyimpan opname koin ke Google Sheet.');
    } finally {
      setIsSavingOpname(false);
    }
  };

  // Handle Admin Restock Submission
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(restockQty, 10);
    if (!qty || isNaN(qty)) return;

    setStocks((prev) => {
      const updated = prev.map((item) => {
        if (item.name === selectedItemForRestock) {
          const newInit = item.initial + qty;
          const newRem = item.remaining + qty;
          return { ...item, initial: newInit, remaining: newRem };
        }
        return item;
      });
      localStorage.setItem('trcn_local_stocks', JSON.stringify(updated));
      return updated;
    });

    setShowRestockModal(false);
    setRestockQty('');
    setRestockNote('');
  };

  // Handle Add New Item Submission
  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const price = parseInt(newItemPrice, 10) || 1000;
    const init = parseInt(newItemInitial, 10) || 50;

    const newItem: StockItem = {
      name: newItemName.trim().toUpperCase(),
      price,
      initial: init,
      sold: 0,
      remaining: init,
    };

    setStocks((prev) => {
      const updated = [...prev, newItem];
      localStorage.setItem('trcn_local_stocks', JSON.stringify(updated));
      return updated;
    });

    setShowAddItemModal(false);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemInitial('');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Brand Header Banner with Logo */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-blue-100 shadow-xs shrink-0 overflow-hidden">
            <img src="/logo.jpg" alt="TRICOINS" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              TRICOINS Coin Balancing &amp; Stok
            </h2>
            <p className="text-[11px] text-slate-500">
              Rekonsiliasi koin harian &amp; kontrol inventaris barang
            </p>
          </div>
        </div>

        <div>
          {isOwnerMode ? (
            <span className="inline-flex items-center text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Shield className="w-3 h-3 mr-1" /> Admin / Owner
            </span>
          ) : (
            <span className="inline-flex items-center text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Kasir Mode
            </span>
          )}
        </div>
      </div>

      {/* 1. Live Coin Balancing Card (Reset Harian) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span>Coin Balancing (Rekonsiliasi Koin)</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  Reset Per Hari
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Membandingkan hitungan fisik opname vs transaksi tercatat pada {formatIndonesianDate(selectedDate)}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              fetchCoinLedger();
              onRefresh();
            }}
            className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
          >
            {isLoadingCoin ? 'Cek...' : 'Refresh'}
          </button>
        </div>

        {/* Live Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Washer Balancing */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center">
                  W
                </span>
                <span>Koin Washer</span>
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  washerDiff === 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : washerDiff > 0
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                {washerDiff === 0
                  ? '✅ Seimbang (Match)'
                  : washerDiff > 0
                  ? `⚠️ Lebih (+${washerDiff} koin)`
                  : `⚠️ Kurang (${washerDiff} koin)`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold block">Tercatat di Transaksi:</span>
                <span className="text-lg font-black text-slate-900">{trxWasher}</span> <span className="text-slate-500 text-[11px]">koin</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold block">Hitungan Fisik Kasir:</span>
                <span className="text-lg font-black text-cyan-700">{inputW}</span> <span className="text-slate-500 text-[11px]">koin</span>
              </div>
            </div>
          </div>

          {/* Dryer Balancing */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center">
                  D
                </span>
                <span>Koin Dryer</span>
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  dryerDiff === 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : dryerDiff > 0
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                {dryerDiff === 0
                  ? '✅ Seimbang (Match)'
                  : dryerDiff > 0
                  ? `⚠️ Lebih (+${dryerDiff} koin)`
                  : `⚠️ Kurang (${dryerDiff} koin)`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold block">Tercatat di Transaksi:</span>
                <span className="text-lg font-black text-slate-900">{trxDryer}</span> <span className="text-slate-500 text-[11px]">koin</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold block">Hitungan Fisik Kasir:</span>
                <span className="text-lg font-black text-orange-700">{inputD}</span> <span className="text-slate-500 text-[11px]">koin</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Coin Opname Entry Form */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-sm text-slate-900">Form Opname Koin Fisik (Simpan ke Tab COIN)</h4>
          </div>
          <span className="text-[11px] text-slate-500">Otomatis mencocokkan</span>
        </div>

        {opnameSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Opname koin berhasil disimpan &amp; direkonsiliasi ke Google Sheet tab COIN!</span>
          </div>
        )}
        {opnameError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{opnameError}</span>
          </div>
        )}

        <form onSubmit={handleSaveOpname} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Hitungan Fisik Washer (Koin):
              </label>
              <input
                type="number"
                placeholder="Contoh: 15"
                value={physicalWasher}
                onChange={(e) => setPhysicalWasher(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cyan-300 bg-cyan-50/50 font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Hitungan Fisik Dryer (Koin):
              </label>
              <input
                type="number"
                placeholder="Contoh: 12"
                value={physicalDryer}
                onChange={(e) => setPhysicalDryer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-orange-300 bg-orange-50/50 font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Catatan / Keterangan Opname:
              </label>
              <input
                type="text"
                placeholder="Misal: Opname Tutup Shift Sore"
                value={opnameNote}
                onChange={(e) => setOpnameNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {!isOwnerMode ? (
              <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Otorisasi Rekonsiliasi Resmi Tab COIN Khusus Admin (Revan &amp; Jakson)</span>
              </span>
            ) : <div />}

            {isOwnerMode ? (
              <button
                type="submit"
                disabled={isSavingOpname}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none"
              >
                {isSavingOpname ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan ke Tab COIN...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Otorisasi &amp; Simpan Rekonsiliasi (Admin)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-200 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed select-none"
                title="Hanya Admin yang berwenang menyimpan rekonsiliasi ke Google Sheet"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Simpan Terkunci (Khusus Admin)</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 3. Live Inventory Stock Table & Admin Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        {/* Low Stock Warning Banner for Cashier and Owner */}
        {stocks.filter((item) => item.remaining <= 10).length > 0 && (
          <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 text-xs flex items-start space-x-2.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-black text-xs sm:text-sm block text-amber-950">
                ⚠️ PERINGATAN KASIR: STOK MENIPIS!
              </span>
              <p className="mt-0.5 leading-relaxed text-[11px]">
                Terdapat <b>{stocks.filter((item) => item.remaining <= 10).length} produk</b> dengan sisa stok di bawah 10 pcs:{' '}
                <span className="font-bold text-rose-700">
                  {stocks
                    .filter((item) => item.remaining <= 10)
                    .map((i) => `${i.name} (sisa ${i.remaining})`)
                    .join(', ')}
                </span>
                . Kasir hanya dapat melihat stok; harap hubungi <b>Revan &amp; Jakson (Owner)</b> untuk restock.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-sm text-slate-900">Live Inventory Stock &amp; Harga</h4>
          </div>

          {/* Admin Stock Action Buttons */}
          <div className="flex items-center space-x-1.5">
            {isOwnerMode ? (
              <>
                <button
                  onClick={() => setShowRestockModal(true)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all transform active:scale-95 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Restock</span>
                </button>
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all transform active:scale-95 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Item Baru</span>
                </button>
              </>
            ) : (
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold border border-slate-200">
                <Lock className="w-3 h-3 text-slate-400" /> Input stok (khusus Owner)
              </span>
            )}
          </div>
        </div>

        {/* Stock Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                <th className="p-2.5">Nama Item</th>
                <th className="p-2.5">Harga Jual</th>
                <th className="p-2.5 text-center">Stok Awal</th>
                <th className="p-2.5 text-center">Terjual (Lunas)</th>
                <th className="p-2.5 text-center">Sisa Stok</th>
                {isOwnerMode && <th className="p-2.5 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stocks.map((item) => {
                const isLow = item.remaining <= 10;
                return (
                  <tr key={item.name} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold text-slate-800">{item.name}</td>
                    <td className="p-2.5 font-bold text-blue-600">{formatRupiah(item.price)}</td>
                    <td className="p-2.5 text-center text-slate-600">{item.initial}</td>
                    <td className="p-2.5 text-center text-slate-600 font-semibold">{item.sold}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isLow
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.remaining} {isLow ? '⚠️ Menipis' : 'pcs'}
                      </span>
                    </td>
                    {isOwnerMode && (
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedItemForRestock(item.name);
                            setShowRestockModal(true);
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition"
                        >
                          + Tambah
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal (Admin Only) */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Input Tambah Stok (Restock)</span>
            </h3>

            <form onSubmit={handleRestockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Pilih Item:</label>
                <select
                  value={selectedItemForRestock}
                  onChange={(e) => setSelectedItemForRestock(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold bg-slate-50"
                >
                  {stocks.map((s) => (
                    <option key={s.name} value={s.name}>{s.name} (Sisa: {s.remaining})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Jumlah Masuk (Qty):</label>
                <input
                  type="number"
                  placeholder="Contoh: 50"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Keterangan / Supplier:</label>
                <input
                  type="text"
                  placeholder="Opsional (misal: Beli dari Grosir)"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Simpan Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Item Modal (Admin Only) */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Tambah Master Item Baru</span>
            </h3>

            <form onSubmit={handleAddNewItem} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Nama Barang:</label>
                <input
                  type="text"
                  placeholder="Contoh: PARFUM EXTRA 5K"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Harga Jual (Rp):</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Stok Awal (pcs):</label>
                <input
                  type="number"
                  placeholder="50"
                  value={newItemInitial}
                  onChange={(e) => setNewItemInitial(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Tambah Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
