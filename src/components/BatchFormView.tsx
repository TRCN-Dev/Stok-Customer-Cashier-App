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
  UserPlus,
  UserCheck,
  Sparkles,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { TransactionInput, SaveBatchResult, appendCustomerToSpreadsheet } from '../services/sheetsApi';
import { addToOfflineQueue } from '../services/offlineQueue';
import {
  CustomerRecord,
  searchCustomer,
  findCustomerExact,
  getNextCustomerCode,
  addCustomerRecord,
  getAllCustomers,
} from '../data/customers';
import { formatIndonesianDate, formatRupiah } from '../utils/dateUtils';
import { QRISCard } from './QRISCard';

interface BatchFormViewProps {
  selectedDate: string;
  targetTabName: string;
  availableEmptySlots?: number;
  spreadsheetId?: string | null;
  accessToken?: string | null;
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
  // Member registration data
  memberCode?: string;
  memberAddress?: string;
  isRegisteredMember?: boolean;
  isRegisteringNew?: boolean;
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
  { name: 'DETERJEN TRI 2K', price: 2000 },
  { name: 'SOKLIN LIQUID 1K', price: 1000 },
  { name: 'DOWNY 1K', price: 1000 },
  { name: 'PLASTIK 2K', price: 2000 },
  { name: 'PLASTIK 3K', price: 3000 },
];

export const BatchFormView: React.FC<BatchFormViewProps> = ({
  selectedDate,
  targetTabName,
  availableEmptySlots,
  spreadsheetId,
  accessToken,
  onSaveBatch,
  onSuccessRedirect,
  isSaving,
}) => {
  // Saved QRIS image in localStorage
  const [qrisImage, setQrisImage] = useState<string | null>(() => {
    return localStorage.getItem('trcn_qris_image') || null;
  });

  const DRAFT_STORAGE_KEY = 'trcn_batch_form_draft';

  function createEmptyCustomer(): CustomerFormState {
    return {
      id: Math.random().toString(36).substring(2, 9),
      customer: '',
      phoneNumber: '',
      memberCode: '',
      memberAddress: '',
      isRegisteredMember: false,
      isRegisteringNew: false,
      status: 'LUNAS',
      paymentMode: 'CASH',
      cuciKeringQty: 0, // Clean default: no auto-display counter of 1
      cuciSajaQty: 0,
      keringSajaQty: 0,
      items: DEFAULT_ITEMS.map((item) => ({ ...item, qty: 0 })),
      washerCoins: 0,
      dryerCoins: 0,
      hargaCash: 0,
      hargaQris: 0,
      cashReceived: 0,
      note: '',
      isCustomSplit: false,
    };
  }

  // Restore draft customer list on page reload so cashier selections are never lost
  const [customerList, setCustomerList] = useState<CustomerFormState[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse draft batch customer list:', e);
    }
    return [createEmptyCustomer()];
  });

  // Auto-save draft on user edits so page reload never loses selections
  useEffect(() => {
    try {
      const hasContent = customerList.some(
        (c) =>
          c.customer.trim() ||
          c.phoneNumber.trim() ||
          c.cuciKeringQty > 0 ||
          c.cuciSajaQty > 0 ||
          c.keringSajaQty > 0 ||
          (c.items || []).some((it) => it.qty > 0) ||
          c.hargaCash > 0 ||
          c.hargaQris > 0
      );
      if (hasContent) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(customerList));
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  }, [customerList]);

  const [searchQueryMap, setSearchQueryMap] = useState<{ [id: string]: string }>({});
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [offlineSuccessMsg, setOfflineSuccessMsg] = useState<string | null>(null);
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsDeviceOnline(true);
    const handleOffline = () => setIsDeviceOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // Close sticky autocomplete dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.customer-autocomplete-container')) {
        setActiveSearchId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSearchId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      memberCode: record.code,
      memberAddress: record.address,
      isRegisteredMember: true,
      isRegisteringNew: false,
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

  // Handle final submission with customer registration
  const handleConfirmSave = async () => {
    setErrorMsg(null);
    setConfirmationOpen(false);

    try {
      // Register any new customer if cashier opted to register them
      customerList.forEach((c) => {
        if (c.customer && c.customer.trim() && c.isRegisteringNew) {
          const exact = findCustomerExact(c.customer);
          const nextCode = c.memberCode || exact?.code || getNextCustomerCode();
          const newRecord: CustomerRecord = {
            code: nextCode,
            name: c.customer.trim().toUpperCase(),
            address: (c.memberAddress || 'UNAI').trim(),
            phone: (c.phoneNumber || '').trim(),
          };
          addCustomerRecord(newRecord);

          if (spreadsheetId && accessToken) {
            appendCustomerToSpreadsheet(spreadsheetId, accessToken, newRecord).catch((e) =>
              console.warn('Could not append customer to sheet:', e)
            );
          }
        }
      });

      const payload = prepareTransactions();
      if (!isDeviceOnline || !accessToken || !spreadsheetId) {
        addToOfflineQueue(selectedDate, targetTabName, payload);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setOfflineSuccessMsg(
          `✓ Mode Offline: ${payload.length} transaksi berhasil disimpan di perangkat! Akan otomatis disinkronkan ke Google Sheet saat koneksi online.`
        );
        setTimeout(() => {
          onSuccessRedirect();
        }, 1600);
        return;
      }

      await onSaveBatch(payload);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      onSuccessRedirect();
    } catch (err: any) {
      console.error('Error saving batch:', err);
      // Auto-fallback to offline queue on network/fetch errors
      if (
        !isDeviceOnline ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('Network') ||
        err?.message?.includes('offline')
      ) {
        const payload = prepareTransactions();
        addToOfflineQueue(selectedDate, targetTabName, payload);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setOfflineSuccessMsg(
          `✓ Disimpan ke Antrean Offline: Koneksi sedang tidak stabil. ${payload.length} transaksi telah diamankan di perangkat dan akan disinkronkan otomatis!`
        );
        setTimeout(() => {
          onSuccessRedirect();
        }, 1800);
        return;
      }
      setErrorMsg(err.message || 'Gagal menyimpan transaksi ke Google Sheet.');
    }
  };

  const handleResetForm = () => {
    if (confirm('Kosongkan semua isian formulir input ini dan mulai dari awal?')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setCustomerList([createEmptyCustomer()]);
    }
  };

  // Calculations for batch overview
  const totalBatchBayar = customerList.reduce((sum, c) => sum + c.hargaCash + c.hargaQris, 0);
  const totalBatchWasher = customerList.reduce((sum, c) => sum + c.washerCoins, 0);
  const totalBatchDryer = customerList.reduce((sum, c) => sum + c.dryerCoins, 0);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner: Date & Tab info */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Spreadsheet:</span>
          <span className="font-bold text-slate-900 text-sm">{targetTabName}</span>
          <span className="text-slate-500 ml-1.5 font-medium">({formatIndonesianDate(selectedDate)})</span>
        </div>
        <button
          type="button"
          onClick={handleResetForm}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer"
          title="Kosongkan formulir dan reset isian"
        >
          Reset Formulir
        </button>
      </div>

      {/* Offline Mode Alert */}
      {!isDeviceOnline && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Mode Offline Aktif:</span> Anda tetap dapat mencatat transaksi kasir seperti biasa. Data akan tersimpan di perangkat dan disinkronkan saat online kembali.
          </div>
        </div>
      )}

      {offlineSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-start space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{offlineSuccessMsg}</div>
        </div>
      )}

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
                  <div className="customer-autocomplete-container relative">
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
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                        <div className="p-1.5 px-2.5 text-[10px] font-bold text-slate-500 uppercase bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                          <span>Saran Pelanggan Terdaftar ({searchMatches.length})</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSearchId(null);
                            }}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            title="Tutup Saran"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {searchMatches.map((match) => (
                          <button
                            key={match.code}
                            type="button"
                            onClick={() => handleSelectCustomerRecord(customer.id, match)}
                            className="w-full text-left p-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-0 flex items-center justify-between cursor-pointer transition-colors"
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

                {/* Member Status / Ask If New Customer & Register Banner */}
                {customer.customer.trim().length > 0 && (() => {
                  const exactMatch = findCustomerExact(customer.customer);
                  const isExisting = Boolean(exactMatch || customer.isRegisteredMember);
                  const memberCode = customer.memberCode || exactMatch?.code;
                  const memberAddress = customer.memberAddress || exactMatch?.address;

                  if (isExisting) {
                    return (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold">Pelanggan Terdaftar:</span>{' '}
                            <span className="font-mono font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                              {memberCode}
                            </span>{' '}
                            <span className="text-slate-600 text-[11px]">
                              • {customer.customer} ({memberAddress || 'UNAI'})
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full shrink-0">
                          Member TRCN
                        </span>
                      </div>
                    );
                  }

                  // If not existing in customer list, ask if this is a new customer and offer registration
                  return (
                    <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 text-xs space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <UserPlus className="w-4 h-4 text-amber-700 shrink-0" />
                          <div>
                            <span className="font-bold text-amber-900 text-xs block leading-tight">
                              Pelanggan Baru (Belum Terdaftar di Member TRCN)
                            </span>
                            <span className="text-[11px] text-amber-800">
                              Apakah Anda ingin mendaftarkan &amp; simpan pelanggan ini ke Database?
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateCustomer(customer.id, {
                                isRegisteringNew: true,
                                memberCode: customer.memberCode || getNextCustomerCode(),
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all transform active:scale-95 shadow-xs cursor-pointer flex items-center gap-1 select-none ${
                              customer.isRegisteringNew
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            <span>✓ Ya, Daftarkan Baru</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updateCustomer(customer.id, {
                                isRegisteringNew: false,
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all transform active:scale-95 shadow-xs cursor-pointer flex items-center gap-1 select-none ${
                              !customer.isRegisteringNew
                                ? 'bg-slate-700 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            <span>Hanya Tamu (Guest)</span>
                          </button>
                        </div>
                      </div>

                      {customer.isRegisteringNew && (
                        <div className="pt-2 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="font-bold text-amber-900 block mb-1 text-[11px]">
                              Kode Member Baru (Otomatis):
                            </label>
                            <input
                              type="text"
                              disabled
                              value={customer.memberCode || getNextCustomerCode()}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-amber-100 border border-amber-300 font-mono font-bold text-amber-950 text-xs"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-amber-900 block mb-1 text-[11px]">
                              Alamat / Wilayah / Kos:
                            </label>
                            <input
                              type="text"
                              placeholder="Misal: UNAI, BU MINAH, KAMPUNG JOMPOK"
                              value={customer.memberAddress || ''}
                              onChange={(e) => updateCustomer(customer.id, { memberAddress: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
                          it.name.includes('DETERJEN')
                            ? it.qty > 0
                              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300/40'
                              : 'bg-amber-50/40 border-amber-300/80'
                            : it.qty > 0
                            ? 'bg-blue-50/60 border-blue-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="font-semibold text-slate-800 text-[11px] truncate flex items-center justify-between">
                          <span>{it.name}</span>
                          {it.name.includes('DETERJEN') && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                              Deterjen
                            </span>
                          )}
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

                {/* 4. Coins: Auto-calculated based on transaction, only add extra on issue/kendala */}
                {(() => {
                  const baseWasher = (customer.cuciKeringQty || 0) + (customer.cuciSajaQty || 0);
                  const baseDryer = (customer.cuciKeringQty || 0) + (customer.keringSajaQty || 0);
                  const extraWasher = Math.max(0, customer.washerCoins - baseWasher);
                  const extraDryer = Math.max(0, customer.dryerCoins - baseDryer);
                  const hasExtra = extraWasher > 0 || extraDryer > 0;

                  return (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                            Koin Berdasarkan Transaksi:
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Dasar: {baseWasher} Washer, {baseDryer} Dryer
                          </span>
                        </div>
                        {hasExtra && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                            ⚠️ +{extraWasher + extraDryer} Koin Tambahan (Kendala Mesin)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Washer Counter */}
                        <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-7 h-7 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">
                              W
                            </span>
                            <div>
                              <span className="font-bold text-cyan-900 text-xs block">Washer</span>
                              <span className="text-[9px] text-cyan-700">
                                {baseWasher} paket {extraWasher > 0 ? `+ ${extraWasher} kendala` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {customer.washerCoins > baseWasher && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateCustomer(customer.id, {
                                    washerCoins: Math.max(baseWasher, customer.washerCoins - 1),
                                  })
                                }
                                className="w-6 h-6 rounded bg-white text-cyan-800 border border-cyan-300 font-bold text-xs hover:bg-cyan-100 transition active:scale-95"
                                title="Kurangi koin tambahan"
                              >
                                -
                              </button>
                            )}
                            <span className="w-8 text-center font-black text-sm bg-white rounded-md border border-cyan-300 py-0.5 text-cyan-950">
                              {customer.washerCoins}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newW = customer.washerCoins + 1;
                                const noteTag = '[Koin Tambahan Kendala Mesin]';
                                const newNote = customer.note.includes(noteTag)
                                  ? customer.note
                                  : customer.note ? `${customer.note} ${noteTag}` : noteTag;
                                updateCustomer(customer.id, {
                                  washerCoins: newW,
                                  note: newNote,
                                });
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] transition active:scale-95"
                              title="Tambah koin Washer karena issue/kendala mesin"
                            >
                              + Tambahan
                            </button>
                          </div>
                        </div>

                        {/* Dryer Counter */}
                        <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-7 h-7 rounded-lg bg-orange-600 text-white font-bold text-xs flex items-center justify-center">
                              D
                            </span>
                            <div>
                              <span className="font-bold text-orange-900 text-xs block">Dryer</span>
                              <span className="text-[9px] text-orange-700">
                                {baseDryer} paket {extraDryer > 0 ? `+ ${extraDryer} kendala` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {customer.dryerCoins > baseDryer && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateCustomer(customer.id, {
                                    dryerCoins: Math.max(baseDryer, customer.dryerCoins - 1),
                                  })
                                }
                                className="w-6 h-6 rounded bg-white text-orange-800 border border-orange-300 font-bold text-xs hover:bg-orange-100 transition active:scale-95"
                                title="Kurangi koin tambahan"
                              >
                                -
                              </button>
                            )}
                            <span className="w-8 text-center font-black text-sm bg-white rounded-md border border-orange-300 py-0.5 text-orange-950">
                              {customer.dryerCoins}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newD = customer.dryerCoins + 1;
                                const noteTag = '[Koin Tambahan Kendala Mesin]';
                                const newNote = customer.note.includes(noteTag)
                                  ? customer.note
                                  : customer.note ? `${customer.note} ${noteTag}` : noteTag;
                                updateCustomer(customer.id, {
                                  dryerCoins: newD,
                                  note: newNote,
                                });
                              }}
                              className="px-2 py-0.5 rounded bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] transition active:scale-95"
                              title="Tambah koin Dryer karena issue/kendala mesin"
                            >
                              + Tambahan
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                    <QRISCard amount={grandTotal} customerName={customer.customer} />
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
            className="flex items-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-xs sm:text-sm text-slate-700 transition-all transform active:scale-95 active:brightness-95 hover:shadow-xs cursor-pointer select-none disabled:opacity-50"
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
              className="flex items-center space-x-1.5 px-4 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all transform active:scale-95 active:brightness-95 hover:shadow-lg cursor-pointer select-none"
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
