import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Coins,
  QrCode,
  Banknote,
  Split,
  Search,
  UserCheck,
  Plus,
  Minus,
  Sparkles,
} from 'lucide-react';
import { SheetTransactionRow, TransactionInput } from '../services/sheetsApi';
import { formatRupiah } from '../utils/dateUtils';
import {
  searchCustomer,
  findCustomerExact,
  CustomerRecord,
} from '../data/customers';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: SheetTransactionRow | null;
  targetTabName: string;
  onSaveEdit: (rowNumber: number, data: TransactionInput) => Promise<void>;
  isSaving: boolean;
}

interface ItemState {
  name: string;
  price: number;
  qty: number;
}

const DEFAULT_ITEMS = [
  { name: 'SOKLIN LIQUID 1K', price: 1000 },
  { name: 'DOWNY 1K', price: 1000 },
  { name: 'PLASTIK KECIL 1K', price: 1000 },
  { name: 'PLASTIK SEDANG 1K', price: 1000 },
  { name: 'PLASTIK BESAR 2K', price: 2000 },
  { name: 'PLASTIK JUMBO 3K', price: 3000 },
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  targetTabName,
  onSaveEdit,
  isSaving,
}) => {
  if (!isOpen || !transaction) return null;

  // Initialize fields from existing transaction
  const [customer, setCustomer] = useState(transaction.customer || '');
  const [phoneNumber, setPhoneNumber] = useState(transaction.phoneNumber || '');
  const [activeSearch, setActiveSearch] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CustomerRecord | null>(() => {
    return findCustomerExact(transaction.customer) || null;
  });

  // Parse existing pakets
  const parsePaketQty = (paketStr: string) => {
    const upper = (paketStr || '').toUpperCase();
    let cuciKering = 0;
    let cuciSaja = 0;
    let keringSaja = 0;

    const ckMatch = upper.match(/CUCI\s*\+\s*KERING(?:\s*X\s*(\d+))?/);
    if (ckMatch) {
      cuciKering = ckMatch[1] ? parseInt(ckMatch[1], 10) : 1;
    }

    const csMatch = upper.match(/CUCI\s*SAJA(?:\s*X\s*(\d+))?/);
    if (csMatch) {
      cuciSaja = csMatch[1] ? parseInt(csMatch[1], 10) : 1;
    }

    const ksMatch = upper.match(/KERING\s*SAJA(?:\s*X\s*(\d+))?/);
    if (ksMatch) {
      keringSaja = ksMatch[1] ? parseInt(ksMatch[1], 10) : 1;
    }

    // Default fallback if unknown paket
    if (cuciKering === 0 && cuciSaja === 0 && keringSaja === 0) {
      if (transaction.washerCoins > 0 && transaction.dryerCoins > 0) {
        cuciKering = Math.min(transaction.washerCoins, transaction.dryerCoins);
      } else if (transaction.washerCoins > 0) {
        cuciSaja = transaction.washerCoins;
      } else if (transaction.dryerCoins > 0) {
        keringSaja = transaction.dryerCoins;
      } else {
        cuciKering = 1;
      }
    }

    return { cuciKering, cuciSaja, keringSaja };
  };

  const initialPakets = parsePaketQty(transaction.paket);
  const [cuciKeringQty, setCuciKeringQty] = useState(initialPakets.cuciKering);
  const [cuciSajaQty, setCuciSajaQty] = useState(initialPakets.cuciSaja);
  const [keringSajaQty, setKeringSajaQty] = useState(initialPakets.keringSaja);

  // Coins
  const [washerCoins, setWasherCoins] = useState(transaction.washerCoins || 1);
  const [dryerCoins, setDryerCoins] = useState(transaction.dryerCoins || 1);

  // Retail Items
  const [items, setItems] = useState<ItemState[]>(() => {
    const existingItemStr = transaction.item || '';
    const existingJumlahStr = transaction.jumlah || '';
    const existingNames = existingItemStr.split('&').map((s) => s.trim().toUpperCase());
    const existingQtys = existingJumlahStr.split('.').map((s) => parseInt(s.trim(), 10) || 1);

    return DEFAULT_ITEMS.map((item) => {
      const idx = existingNames.findIndex((n) => n.includes(item.name) || item.name.includes(n));
      return {
        ...item,
        qty: idx >= 0 ? existingQtys[idx] || 1 : 0,
      };
    });
  });

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<'QRIS' | 'CASH' | 'SPLIT'>(
    (transaction.paymentMode as any) || (transaction.hargaCash > 0 && transaction.hargaQris > 0 ? 'SPLIT' : transaction.hargaCash > 0 ? 'CASH' : 'QRIS')
  );

  const [status, setStatus] = useState<'LUNAS' | 'TIDAK LUNAS'>(
    transaction.status.toUpperCase() === 'LUNAS' ? 'LUNAS' : 'TIDAK LUNAS'
  );

  const [cashReceived, setCashReceived] = useState<number>(() => {
    return transaction.hargaCash || 0;
  });

  const [splitCashInput, setSplitCashInput] = useState<number>(transaction.hargaCash || 0);
  const [splitQrisInput, setSplitQrisInput] = useState<number>(transaction.hargaQris || 0);
  const [note, setNote] = useState(transaction.note || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Autocomplete search matches
  const searchMatches = searchCustomer(customer);

  // Auto-sync coins when packages change
  const handlePaketChange = (type: 'ck' | 'cs' | 'ks', delta: number) => {
    let nextCK = cuciKeringQty;
    let nextCS = cuciSajaQty;
    let nextKS = keringSajaQty;

    if (type === 'ck') nextCK = Math.max(0, cuciKeringQty + delta);
    if (type === 'cs') nextCS = Math.max(0, cuciSajaQty + delta);
    if (type === 'ks') nextKS = Math.max(0, keringSajaQty + delta);

    setCuciKeringQty(nextCK);
    setCuciSajaQty(nextCS);
    setKeringSajaQty(nextKS);

    setWasherCoins(nextCK + nextCS);
    setDryerCoins(nextCK + nextKS);
  };

  const handleItemQtyChange = (name: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) => (it.name === name ? { ...it, qty: Math.max(0, it.qty + delta) } : it))
    );
  };

  // Close search dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.edit-cust-autocomplete-container')) {
        setActiveSearch(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveSearch(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute Total Bayar
  const totalPaketBayar =
    cuciKeringQty * 20000 + cuciSajaQty * 10000 + keringSajaQty * 10000;
  const totalItemsBayar = items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const totalBayar = totalPaketBayar + totalItemsBayar;

  // Split calculations
  useEffect(() => {
    if (paymentMode === 'SPLIT') {
      const remainingQris = Math.max(0, totalBayar - splitCashInput);
      setSplitQrisInput(remainingQris);
    }
  }, [totalBayar, splitCashInput, paymentMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Build Paket string
    const pakets: string[] = [];
    if (cuciKeringQty > 0) pakets.push(`CUCI + KERING x${cuciKeringQty}`);
    if (cuciSajaQty > 0) pakets.push(`CUCI SAJA x${cuciSajaQty}`);
    if (keringSajaQty > 0) pakets.push(`KERING SAJA x${keringSajaQty}`);
    const paketStr = pakets.join(', ') || 'CUCI + KERING';

    // Build Items string
    const activeItems = items.filter((it) => it.qty > 0);
    const itemStr = activeItems.map((it) => it.name).join(' & ');
    const jumlahStr = activeItems.map((it) => it.qty).join('.');

    // Final prices
    let finalCash = 0;
    let finalQris = 0;

    if (paymentMode === 'CASH') {
      finalCash = totalBayar;
      finalQris = 0;
    } else if (paymentMode === 'QRIS') {
      finalCash = 0;
      finalQris = totalBayar;
    } else {
      finalCash = splitCashInput;
      finalQris = Math.max(0, totalBayar - splitCashInput);
    }

    try {
      await onSaveEdit(transaction.rowNumber, {
        customer: customer.trim() || 'Pelanggan',
        phoneNumber: phoneNumber.trim(),
        paymentMode,
        item: itemStr,
        jumlah: jumlahStr,
        paket: paketStr,
        washerCoins,
        dryerCoins,
        hargaCash: finalCash,
        hargaQris: finalQris,
        status,
        note: note.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan transaksi.');
    }
  };

  const kembalian = Math.max(0, cashReceived - totalBayar);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5">
              <span>Edit Transaksi #{transaction.slotNumber}</span>
              <span className="text-[10px] bg-blue-500/30 text-blue-300 font-mono px-2 py-0.5 rounded-full">
                Baris {transaction.rowNumber}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Google Sheet Tab: {targetTabName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Customer & Phone (Identical to initial input) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="edit-cust-autocomplete-container relative">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nama Customer:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama customer..."
                  value={customer}
                  onChange={(e) => {
                    setCustomer(e.target.value);
                    setActiveSearch(true);
                  }}
                  onFocus={() => setActiveSearch(true)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  required
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Autocomplete Dropdown */}
              {activeSearch && searchMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                  <div className="p-1.5 px-2.5 text-[10px] font-bold text-slate-500 uppercase bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                    <span>Database Pelanggan ({searchMatches.length})</span>
                    <button
                      type="button"
                      onClick={() => setActiveSearch(false)}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {searchMatches.map((match) => (
                    <button
                      key={match.code}
                      type="button"
                      onClick={() => {
                        setCustomer(match.name);
                        setPhoneNumber(match.phone);
                        setSelectedMember(match);
                        setActiveSearch(false);
                      }}
                      className="w-full text-left p-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-0 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{match.name}</div>
                        <div className="text-[10px] text-slate-500">{match.address} • {match.phone}</div>
                      </div>
                      <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {match.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nomor HP / WhatsApp:
              </label>
              <input
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Member Banner if detected */}
          {customer.trim() && (() => {
            const exact = findCustomerExact(customer) || selectedMember;
            if (exact) {
              return (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Member Terdaftar:</span>{' '}
                      <span className="font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                        {exact.code}
                      </span>{' '}
                      <span className="text-slate-500">({exact.address})</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* 2. Paket Layanan (Interactive Counters) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Pilih Paket Laundry:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Cuci + Kering */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  cuciKeringQty > 0
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">CUCI + KERING</div>
                    <div className="text-[11px] font-semibold text-blue-600">Rp 20.000</div>
                    <div className="text-[10px] text-slate-400">1 Washer + 1 Dryer</div>
                  </div>
                  <span className="text-lg font-black text-blue-700 font-mono">x{cuciKeringQty}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePaketChange('ck', -1)}
                    className="flex-1 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaketChange('ck', 1)}
                    className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition active:scale-95 shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Cuci Saja */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  cuciSajaQty > 0
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">CUCI SAJA</div>
                    <div className="text-[11px] font-semibold text-blue-600">Rp 10.000</div>
                    <div className="text-[10px] text-slate-400">1 Washer</div>
                  </div>
                  <span className="text-lg font-black text-blue-700 font-mono">x{cuciSajaQty}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePaketChange('cs', -1)}
                    className="flex-1 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaketChange('cs', 1)}
                    className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition active:scale-95 shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Kering Saja */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  keringSajaQty > 0
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">KERING SAJA</div>
                    <div className="text-[11px] font-semibold text-blue-600">Rp 10.000</div>
                    <div className="text-[10px] text-slate-400">1 Dryer</div>
                  </div>
                  <span className="text-lg font-black text-blue-700 font-mono">x{keringSajaQty}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePaketChange('ks', -1)}
                    className="flex-1 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaketChange('ks', 1)}
                    className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition active:scale-95 shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Koin Ringkasan */}
          <div className="p-3 bg-slate-100/90 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-slate-700">Kebutuhan Koin Mesin:</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 font-mono font-bold text-xs border border-cyan-200">
                Washer: {washerCoins}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 font-mono font-bold text-xs border border-orange-200">
                Dryer: {dryerCoins}
              </span>
            </div>
          </div>

          {/* 4. Deterjen & Plastik (Items Retail) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Item Tambahan (Deterjen &amp; Plastik):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((item) => (
                <div
                  key={item.name}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                    item.qty > 0
                      ? 'border-indigo-400 bg-indigo-50/60'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="mb-1.5">
                    <div className="font-bold text-slate-800 text-[11px] leading-tight truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatRupiah(item.price)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleItemQtyChange(item.name, -1)}
                      className="w-6 h-6 rounded bg-white text-slate-700 border border-slate-300 font-bold text-xs hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-xs text-slate-900">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => handleItemQtyChange(item.name, 1)}
                      className="w-6 h-6 rounded bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition active:scale-95 shadow-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Metode Bayar & Status */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Total Perhitungan:
                </span>
                <span className="text-base font-black text-blue-700">
                  {formatRupiah(totalBayar)}
                </span>
              </div>

              {/* Status Lunas / Pending */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Status Pembayaran:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 font-bold text-xs bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LUNAS">✅ LUNAS</option>
                  <option value="TIDAK LUNAS">⏳ TIDAK LUNAS / PENDING</option>
                </select>
              </div>
            </div>

            {/* Payment Mode Selector Buttons */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Metode Pembayaran:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('QRIS')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    paymentMode === 'QRIS'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QRIS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('CASH')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    paymentMode === 'CASH'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>CASH</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('SPLIT')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    paymentMode === 'SPLIT'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>SPLIT</span>
                </button>
              </div>
            </div>

            {/* Cash Calculator & Quick Money Buttons */}
            {paymentMode === 'CASH' && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-xs">Uang Diterima:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashReceived(totalBayar)}
                      className="px-2 py-0.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(20000)}
                      className="px-2 py-0.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      20k
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(50000)}
                      className="px-2 py-0.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      50k
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(100000)}
                      className="px-2 py-0.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      100k
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono font-bold text-xs"
                      placeholder="Jumlah uang..."
                    />
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Kembalian:</span>
                    <span
                      className={`font-mono font-black text-xs ${
                        kembalian > 0 ? 'text-emerald-700' : 'text-slate-600'
                      }`}
                    >
                      {formatRupiah(kembalian)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Split Mode Inputs */}
            {paymentMode === 'SPLIT' && (
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-900 block mb-0.5">
                      Porsi Cash (Rp):
                    </label>
                    <input
                      type="number"
                      value={splitCashInput || ''}
                      onChange={(e) => setSplitCashInput(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-purple-900 block mb-0.5">
                      Porsi QRIS (Rp):
                    </label>
                    <input
                      type="number"
                      value={splitQrisInput || ''}
                      onChange={(e) => setSplitQrisInput(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 bg-white font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Catatan Transaksi:
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan tambahan (opsional)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-md transition-all transform active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
