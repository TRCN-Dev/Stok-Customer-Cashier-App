import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Banknote,
  Split,
  Search,
  Phone,
  Coins,
  ArrowRight,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { TransactionInput, SaveBatchResult } from '../services/sheetsApi';
import { CustomerRecord, searchCustomer } from '../data/customers';
import { formatIndonesianDate, formatRupiah } from '../utils/dateUtils';

interface BatchFormViewProps {
  selectedDate: string;
  targetTabName: string;
  availableEmptySlots: number;
  onSaveBatch: (transactions: TransactionInput[]) => Promise<SaveBatchResult>;
  onSuccessRedirect: () => void;
  isSaving: boolean;
}

interface CustomerFormState {
  id: string;
  customer: string;
  phoneNumber: string;
  status: 'LUNAS' | 'TIDAK LUNAS';
  paymentMode: 'CASH' | 'QRIS' | 'SPLIT';
  // Pakets
  cuciKeringQty: number; // 20k
  cuciSajaQty: number; // 10k
  keringSajaQty: number; // 15k
  // Items
  items: { name: string; price: number; qty: number }[];
  // Coins
  washerCoins: number;
  dryerCoins: number;
  // Amounts
  hargaCash: number;
  hargaQris: number;
  cashReceived: number; // for change calculator
  note: string;
  isCustomSplit: boolean;
}

const DEFAULT_ITEMS = [
  { name: 'SOKLIN LIQUID 1K', price: 1000 },
  { name: 'DOWNY 1K', price: 1000 },
  { name: 'DETERJEN TRI 2K', price: 2000 },
  { name: 'PLASTIK 2K', price: 2000 },
  { name: 'PLASTIK 3K', price: 3000 },
];

export const BatchFormView: React.FC<BatchFormViewProps> = ({
  selectedDate,
  targetTabName,
  availableEmptySlots,
  onSaveBatch,
  onSuccessRedirect,
  isSaving,
}) => {
  // Saved QRIS image in localStorage
  const [qrisImage, setQrisImage] = useState<string | null>(() => {
    return localStorage.getItem('trcn_qris_image') || null;
  });

  const [customerList, setCustomerList] = useState<CustomerFormState[]>([createEmptyCustomer()]);
  const [searchQueryMap, setSearchQueryMap] = useState<{ [id: string]: string }>({});
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function createEmptyCustomer(): CustomerFormState {
    return {
      id: Math.random().toString(36).substring(2, 9),
      customer: '',
      phoneNumber: '',
      status: 'LUNAS',
      paymentMode: 'QRIS',
      cuciKeringQty: 1, // Default 1 cuci + kering
      cuciSajaQty: 0,
      keringSajaQty: 0,
      items: DEFAULT_ITEMS.map((item) => ({ ...item, qty: 0 })),
      washerCoins: 1,
      dryerCoins: 1,
      hargaCash: 0,
      hargaQris: 20000,
      cashReceived: 0,
      note: '',
      isCustomSplit: false,
    };
  }

  // Handle QRIS Image upload
  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setQrisImage(base64);
        localStorage.setItem('trcn_qris_image', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update customer fields and recalculate totals & coins
  const updateCustomer = (id: string, updates: Partial<CustomerFormState>) => {
    setCustomerList((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const merged = { ...c, ...updates };

        // Auto-recalculate coins if pakets changed
        if (
          updates.cuciKeringQty !== undefined ||
          updates.cuciSajaQty !== undefined ||
          updates.keringSajaQty !== undefined
        ) {
          const autoWasher = (merged.cuciKeringQty || 0) + (merged.cuciSajaQty || 0);
          const autoDryer = (merged.cuciKeringQty || 0) + (merged.keringSajaQty || 0);
          merged.washerCoins = autoWasher;
          merged.dryerCoins = autoDryer;
        }

        // Calculate total amount
        const paketTotal =
          (merged.cuciKeringQty || 0) * 20000 +
          (merged.cuciSajaQty || 0) * 10000 +
          (merged.keringSajaQty || 0) * 15000;

        const itemTotal = (merged.items || []).reduce(
          (sum, item) => sum + item.qty * item.price,
          0
        );
        const grandTotal = paketTotal + itemTotal;

        // Payment mode split / single
        if (merged.paymentMode === 'QRIS') {
          merged.hargaQris = grandTotal;
          merged.hargaCash = 0;
        } else if (merged.paymentMode === 'CASH') {
          merged.hargaCash = grandTotal;
          merged.hargaQris = 0;
        } else if (merged.paymentMode === 'SPLIT' && !merged.isCustomSplit) {
          // Default split: Pakets via QRIS, Items via Cash
          merged.hargaQris = paketTotal;
          merged.hargaCash = itemTotal;
          if (!merged.note.includes('[Split Payment]')) {
            merged.note = merged.note ? `${merged.note} [Split Payment]` : '[Split Payment]';
          }
        }

        return merged;
      })
    );
  };

  const handleSelectCustomerRecord = (id: string, record: CustomerRecord) => {
    updateCustomer(id, {
      customer: record.name,
      phoneNumber: record.phone,
    });
    setActiveSearchId(null);
  };

  const addCustomerCard = () => {
    // User requested: "dont make it only limited to 20 baris make it more its oke"
    setCustomerList((prev) => [...prev, createEmptyCustomer()]);
  };

  const removeCustomerCard = (id: string) => {
    if (customerList.length <= 1) return;
    setCustomerList((prev) => prev.filter((c) => c.id !== id));
  };

  // Convert customer card to TransactionInput for Google Sheets
  const prepareTransactions = (): TransactionInput[] => {
    return customerList.map((c) => {
      // 1. Build Paket string
      const pakets: string[] = [];
      if (c.cuciKeringQty > 0) pakets.push(`CUCI + KERING x${c.cuciKeringQty}`);
      if (c.cuciSajaQty > 0) pakets.push(`CUCI SAJA x${c.cuciSajaQty}`);
      if (c.keringSajaQty > 0) pakets.push(`KERING SAJA x${c.keringSajaQty}`);
      const paketStr = pakets.join(', ') || 'CUCI + KERING';

      // 2. Build Item & Jumlah string
      const activeItems = (c.items || []).filter((it) => it.qty > 0);
      const itemStr = activeItems.map((it) => it.name).join(' & ');
      const jumlahStr = activeItems.map((it) => it.qty).join('.');

      return {
        customer: c.customer.trim() || 'Pelanggan',
        phoneNumber: c.phoneNumber.trim(),
        paymentMode: c.paymentMode,
        item: itemStr,
        jumlah: jumlahStr,
        paket: paketStr,
        washerCoins: c.washerCoins || 0,
        dryerCoins: c.dryerCoins || 0,
        hargaCash: c.hargaCash || 0,
        hargaQris: c.hargaQris || 0,
        status: c.status,
        note: c.note.trim(),
      };
    });
  };

  // Handle final submission
  const handleConfirmSave = async () => {
    setErrorMsg(null);
    setConfirmationOpen(false);

    try {
      const payload = prepareTransactions();
      await onSaveBatch(payload);
      onSuccessRedirect();
    } catch (err: any) {
      console.error('Error saving batch:', err);
      setErrorMsg(err.message || 'Gagal menyimpan transaksi ke Google Sheet.');
    }
  };

  // Calculations for batch overview
  const totalBatchBayar = customerList.reduce((sum, c) => sum + c.hargaCash + c.hargaQris, 0);
  const totalBatchWasher = customerList.reduce((sum, c) => sum + c.washerCoins, 0);
  const totalBatchDryer = customerList.reduce((sum, c) => sum + c.dryerCoins, 0);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner: Date & Slot info */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Spreadsheet:</span>
          <span className="font-bold text-slate-900 text-sm">{targetTabName}</span>
          <span className="text-slate-500 ml-1.5 font-medium">({formatIndonesianDate(selectedDate)})</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Kapasitas Transaksi:</span>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
            Bisa tambah tanpa batas (+ baris baru)
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Pemberitahuan:</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Customer Cards List */}
      <div className="space-y-4">
        {customerList.map((customer, index) => {
          const grandTotal = customer.hargaCash + customer.hargaQris;
          const searchMatches = activeSearchId === customer.id ? searchCustomer(customer.customer) : [];
          const change = customer.cashReceived > 0 ? customer.cashReceived - customer.hargaCash : 0;

          return (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
            >
              {/* Card Header */}
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-bold text-sm">Customer #{index + 1}</span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Status Toggle (LUNAS / TIDAK LUNAS) */}
                  <div className="flex bg-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => updateCustomer(customer.id, { status: 'LUNAS' })}
                      className={`px-2.5 py-1 rounded-md transition ${
                        customer.status === 'LUNAS'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      LUNAS
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCustomer(customer.id, { status: 'TIDAK LUNAS' })}
                      className={`px-2.5 py-1 rounded-md transition ${
                        customer.status === 'TIDAK LUNAS'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      PENDING
                    </button>
                  </div>

                  {customerList.length > 1 && (
                    <button
                      onClick={() => removeCustomerCard(customer.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                      title="Hapus Customer Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4 text-xs">
                {/* 1. Customer Name (with autocomplete) & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nama Customer:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik nama customer..."
                        value={customer.customer}
                        onChange={(e) => {
                          updateCustomer(customer.id, { customer: e.target.value });
                          setActiveSearchId(customer.id);
                        }}
                        onFocus={() => setActiveSearchId(customer.id)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Autocomplete Dropdown from 400+ customer database */}
                    {activeSearchId === customer.id && searchMatches.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                        <div className="p-1.5 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                          Saran Pelanggan Terdaftar ({searchMatches.length})
                        </div>
                        {searchMatches.map((match) => (
                          <button
                            key={match.code}
                            type="button"
                            onClick={() => handleSelectCustomerRecord(customer.id, match)}
                            className="w-full text-left p-2 hover:bg-blue-50 border-b border-slate-50 last:border-0 flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-slate-800 text-xs">
                                {match.name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {match.address} • {match.phone}
                              </div>
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
                      Nomor HP:
                    </label>
                    <input
                      type="tel"
                      placeholder="08xxxxxxxxxx"
                      value={customer.phoneNumber}
                      onChange={(e) => updateCustomer(customer.id, { phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* 2. Paket Laundry Section */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Pilihan Paket:
                    </span>
                    <span className="text-[11px] text-slate-500">Koin terisi otomatis</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Cuci + Kering */}
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">CUCI + KERING</div>
                        <div className="text-[11px] font-semibold text-blue-600">Rp 20.000</div>
                        <div className="text-[10px] text-slate-400">1 Washer + 1 Dryer</div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              cuciKeringQty: Math.max(0, customer.cuciKeringQty - 1),
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-sm">
                          {customer.cuciKeringQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              cuciKeringQty: customer.cuciKeringQty + 1,
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Cuci Saja */}
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">CUCI SAJA</div>
                        <div className="text-[11px] font-semibold text-blue-600">Rp 10.000</div>
                        <div className="text-[10px] text-slate-400">1 Washer</div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              cuciSajaQty: Math.max(0, customer.cuciSajaQty - 1),
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-sm">
                          {customer.cuciSajaQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              cuciSajaQty: customer.cuciSajaQty + 1,
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Kering Saja */}
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800 text-xs">KERING SAJA</div>
                        <div className="text-[11px] font-semibold text-blue-600">Rp 15.000</div>
                        <div className="text-[10px] text-slate-400">1 Dryer</div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              keringSajaQty: Math.max(0, customer.keringSajaQty - 1),
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold text-sm">
                          {customer.keringSajaQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              keringSajaQty: customer.keringSajaQty + 1,
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Item Tambahan (Deterjen, Pewangi, Plastik) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                    Item Tambahan (Stok):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {customer.items.map((it, itIdx) => (
                      <div
                        key={it.name}
                        className={`p-2 rounded-xl border transition ${
                          it.qty > 0
                            ? 'bg-blue-50/60 border-blue-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="font-semibold text-slate-800 text-[11px] truncate">
                          {it.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {formatRupiah(it.price)}
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...customer.items];
                              updated[itIdx].qty = Math.max(0, updated[itIdx].qty - 1);
                              updateCustomer(customer.id, { items: updated });
                            }}
                            className="w-6 h-6 rounded bg-white border border-slate-300 font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs">{it.qty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...customer.items];
                              updated[itIdx].qty = updated[itIdx].qty + 1;
                              updateCustomer(customer.id, { items: updated });
                            }}
                            className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Coins (Washer & Dryer editable) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                    Koin Diberikan ke Customer:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                          W
                        </span>
                        <span className="font-bold text-cyan-900 text-xs">Washer</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              washerCoins: Math.max(0, customer.washerCoins - 1),
                            })
                          }
                          className="w-6 h-6 rounded bg-white text-cyan-800 border border-cyan-300 font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={customer.washerCoins}
                          onChange={(e) =>
                            updateCustomer(customer.id, {
                              washerCoins: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          className="w-10 text-center font-bold text-sm bg-white rounded border border-cyan-300 py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              washerCoins: customer.washerCoins + 1,
                            })
                          }
                          className="w-6 h-6 rounded bg-cyan-600 text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-orange-600 text-white font-bold text-xs flex items-center justify-center">
                          D
                        </span>
                        <span className="font-bold text-orange-900 text-xs">Dryer</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              dryerCoins: Math.max(0, customer.dryerCoins - 1),
                            })
                          }
                          className="w-6 h-6 rounded bg-white text-orange-800 border border-orange-300 font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={customer.dryerCoins}
                          onChange={(e) =>
                            updateCustomer(customer.id, {
                              dryerCoins: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          className="w-10 text-center font-bold text-sm bg-white rounded border border-orange-300 py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateCustomer(customer.id, {
                              dryerCoins: customer.dryerCoins + 1,
                            })
                          }
                          className="w-6 h-6 rounded bg-orange-600 text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Payment Mode & Calculator (CASH / QRIS / SPLIT) */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Metode Pembayaran:
                    </span>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Bayar:</span>
                      <span className="text-base font-black text-slate-900">
                        {formatRupiah(grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => updateCustomer(customer.id, { paymentMode: 'QRIS', isCustomSplit: false })}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                        customer.paymentMode === 'QRIS'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QRIS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCustomer(customer.id, { paymentMode: 'CASH', isCustomSplit: false })}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                        customer.paymentMode === 'CASH'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>CASH</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCustomer(customer.id, { paymentMode: 'SPLIT' })}
                      className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                        customer.paymentMode === 'SPLIT'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Split className="w-4 h-4" />
                      <span>SPLIT</span>
                    </button>
                  </div>

                  {/* QRIS Display Panel */}
                  {customer.paymentMode === 'QRIS' && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-blue-600" />
                          <span>QRIS Pembayaran ({formatRupiah(grandTotal)})</span>
                        </span>
                        <label className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>{qrisImage ? 'Ganti QRIS' : 'Upload QRIS'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrisUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {qrisImage ? (
                        <div className="text-center py-2 bg-white rounded-xl border border-blue-200 p-2 max-w-[200px] mx-auto shadow-xs">
                          <img
                            src={qrisImage}
                            alt="QRIS Laundry TRCN"
                            className="w-full h-auto object-contain rounded-lg"
                          />
                          <p className="text-[10px] font-bold text-slate-600 mt-1">
                            SCAN UNTUK BAYAR {formatRupiah(grandTotal)}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded-xl border border-dashed border-blue-300 text-center space-y-1">
                          <ImageIcon className="w-6 h-6 text-blue-400 mx-auto" />
                          <p className="text-slate-600 font-medium">Belum ada foto QRIS tersimpan.</p>
                          <label className="inline-block px-3 py-1 bg-blue-600 text-white font-bold rounded-lg text-[11px] cursor-pointer hover:bg-blue-700 transition">
                            Upload Foto QRIS Toko
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleQrisUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CASH Calculator Panel */}
                  {customer.paymentMode === 'CASH' && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between font-bold text-emerald-950 text-xs">
                        <span>Kalkulator Uang Tunai &amp; Kembalian:</span>
                        <span>Total: {formatRupiah(customer.hargaCash)}</span>
                      </div>

                      {/* Quick Cash Buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCustomer(customer.id, { cashReceived: customer.hargaCash })}
                          className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          Uang Pas
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCustomer(customer.id, { cashReceived: 20000 })}
                          className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          20.000
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCustomer(customer.id, { cashReceived: 50000 })}
                          className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          50.000
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCustomer(customer.id, { cashReceived: 100000 })}
                          className="px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          100.000
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-emerald-900 block mb-0.5">
                            Uang Diterima (Rp):
                          </label>
                          <input
                            type="number"
                            value={customer.cashReceived || ''}
                            onChange={(e) =>
                              updateCustomer(customer.id, {
                                cashReceived: Math.max(0, parseInt(e.target.value) || 0),
                              })
                            }
                            placeholder="Contoh: 50000"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-emerald-900 block mb-0.5">
                            Kembalian:
                          </label>
                          <div
                            className={`px-2.5 py-1.5 rounded-lg font-black text-sm ${
                              change >= 0
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {change >= 0 ? formatRupiah(change) : 'Kurang ' + formatRupiah(Math.abs(change))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SPLIT Mode Panel */}
                  {customer.paymentMode === 'SPLIT' && (
                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-purple-950 font-bold text-xs">
                        <span>Pecah Pembayaran (Split):</span>
                        <span>Total: {formatRupiah(grandTotal)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-purple-900 block mb-0.5">
                            HARGA CASH (Rp):
                          </label>
                          <input
                            type="number"
                            value={customer.hargaCash}
                            onChange={(e) =>
                              updateCustomer(customer.id, {
                                hargaCash: Math.max(0, parseInt(e.target.value) || 0),
                                isCustomSplit: true,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 bg-white font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-purple-900 block mb-0.5">
                            HARGA QRIS (Rp):
                          </label>
                          <input
                            type="number"
                            value={customer.hargaQris}
                            onChange={(e) =>
                              updateCustomer(customer.id, {
                                hargaQris: Math.max(0, parseInt(e.target.value) || 0),
                                isCustomSplit: true,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-purple-300 bg-white font-bold text-slate-800"
                          />
                        </div>
                      </div>
                      {customer.hargaCash + customer.hargaQris !== grandTotal && (
                        <p className="text-[10px] font-bold text-rose-600">
                          ⚠️ Jumlah Cash + QRIS ({formatRupiah(customer.hargaCash + customer.hargaQris)}) tidak sama dengan Total ({formatRupiah(grandTotal)})
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. Notes & Presets */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">Catatan (Note):</span>
                    <div className="flex space-x-1">
                      {['[Salah Tambah Koin]', '[Titip Baju]', '[Split Payment]'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            if (!customer.note.includes(preset)) {
                              updateCustomer(customer.id, {
                                note: customer.note ? `${customer.note} ${preset}` : preset,
                              });
                            }
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-semibold transition"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Catatan tambahan (opsional)..."
                    value={customer.note}
                    onChange={(e) => updateCustomer(customer.id, { note: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar (Sticky at bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xs border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Add Another Customer Button */}
          <button
            type="button"
            onClick={addCustomerCard}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-xs sm:text-sm text-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span className="hidden xs:inline">Tambah</span> Customer
          </button>

          {/* Overview & Save Button */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-bold uppercase">
                Total {customerList.length} Transaksi:
              </div>
              <div className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                {formatRupiah(totalBatchBayar)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmationOpen(true)}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Semua ({customerList.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog (Mandatory for Workspace Integration & User Safety) */}
      {confirmationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base">Konfirmasi Simpan Transaksi</h3>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="leading-relaxed">
                Anda akan menyimpan <b>{customerList.length} transaksi</b> ke Google Sheet pada:
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div>Tab Target: <b className="text-blue-700">{targetTabName}</b></div>
                <div>Tanggal: <b>{formatIndonesianDate(selectedDate)}</b></div>
                <div>Total Bayar: <b className="text-emerald-700">{formatRupiah(totalBatchBayar)}</b></div>
                <div>Koin: <b>{totalBatchWasher} Washer</b>, <b>{totalBatchDryer} Dryer</b></div>
              </div>
              <p className="text-slate-500 font-medium">
                Data akan ditulis ke baris kosong pertama tanpa menimpa rumus BAYAR (Kolom L) atau panel samping (Kolom O).
              </p>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmationOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Ya, Simpan ke Google Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
