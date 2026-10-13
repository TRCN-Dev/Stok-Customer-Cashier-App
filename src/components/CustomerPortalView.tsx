import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  Package,
  Coins,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { SheetTransactionRow } from '../services/sheetsApi';
import { formatIndonesianDate, formatRupiah } from '../utils/dateUtils';
import { QRISCard } from './QRISCard';

interface CustomerPortalViewProps {
  todayTransactions: SheetTransactionRow[];
  selectedDate: string;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  todayTransactions,
  selectedDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'track' | 'prices' | 'qris' | 'machines'>('track');

  // Search transaction
  const matchedTransactions = todayTransactions.filter(
    (t) =>
      !t.isEmpty &&
      searchQuery.trim() !== '' &&
      (t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.phoneNumber.includes(searchQuery.trim()))
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Customer Hero Banner with Logo */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-md shrink-0 mx-auto overflow-hidden">
              <img src="/logo.jpg" alt="TRICOINS" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-1">
                Portal Pelanggan TRICOINS
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                Self-Service &amp; Cek Cucian
              </h2>
              <p className="text-xs text-blue-100">
                Lacak status laundry, lihat daftar harga, dan bayar praktis via QRIS
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center sm:text-right shrink-0">
            <span className="text-[10px] font-semibold text-blue-100 block">Jam Operasional:</span>
            <span className="text-xs font-bold block">07:00 - 21:00 WIB</span>
            <span className="text-[10px] text-emerald-300 font-bold">● Buka Setiap Hari</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-white rounded-2xl p-1 border border-slate-200 shadow-xs text-xs font-bold gap-1">
        <button
          onClick={() => setActiveTab('track')}
          className={`flex-1 py-2.5 rounded-xl transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'track'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Cek Status Cucian</span>
        </button>

        <button
          onClick={() => setActiveTab('prices')}
          className={`flex-1 py-2.5 rounded-xl transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'prices'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Daftar Harga</span>
        </button>

        <button
          onClick={() => setActiveTab('qris')}
          className={`flex-1 py-2.5 rounded-xl transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'qris'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QRIS Bayar</span>
        </button>

        <button
          onClick={() => setActiveTab('machines')}
          className={`flex-1 py-2.5 rounded-xl transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === 'machines'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Status Mesin</span>
        </button>
      </div>

      {/* TAB 1: TRACK LAUNDRY STATUS */}
      {activeTab === 'track' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="text-center max-w-md mx-auto space-y-1">
            <h3 className="font-extrabold text-slate-900 text-base">Cek Status Order Laundry Anda</h3>
            <p className="text-xs text-slate-500">
              Ketik nama atau nomor HP Anda yang didaftarkan saat mencuci hari ini ({formatIndonesianDate(selectedDate)}).
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Masukkan nama atau nomor HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-blue-200 focus:border-blue-600 text-sm font-semibold focus:outline-hidden shadow-xs"
            />
          </div>

          {/* Results */}
          {searchQuery.trim() !== '' && (
            <div className="max-w-md mx-auto space-y-2.5 pt-2">
              {matchedTransactions.length > 0 ? (
                matchedTransactions.map((t) => {
                  const isLunas = t.status.toUpperCase() === 'LUNAS';
                  return (
                    <div
                      key={t.rowNumber}
                      className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{t.customer}</div>
                          <div className="text-[11px] text-slate-500">{t.phoneNumber || 'Tanpa No HP'}</div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isLunas
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {isLunas ? '✅ Lunas / Selesai' : '⏳ Proses / Belum Bayar'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-blue-200/60 text-slate-700">
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">Paket:</span>
                          <span className="font-bold">{t.paket || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">Total Tagihan:</span>
                          <span className="font-bold text-blue-700">{formatRupiah(t.bayar || t.hargaCash + t.hargaQris)}</span>
                        </div>
                      </div>

                      {t.item && (
                        <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-blue-100">
                          Item Tambahan: <b>{t.item}</b> ({t.jumlah || '1'})
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  Tidak ditemukan order dengan kata kunci "<b>{searchQuery}</b>" pada hari ini. Pastikan nama sesuai saat kasir mencatat.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRICELIST */}
      {activeTab === 'prices' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Daftar Paket Laundry Koin</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/60 space-y-1 text-center">
                <div className="font-black text-slate-900 text-sm">CUCI + KERING</div>
                <div className="text-xl font-black text-blue-700">Rp 20.000</div>
                <div className="text-[11px] text-slate-500">1 Koin Washer + 1 Koin Dryer</div>
                <div className="text-[10px] text-blue-600 font-semibold pt-1">Estimasi Waktu: ~75 Menit</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1 text-center">
                <div className="font-black text-slate-900 text-sm">CUCI SAJA</div>
                <div className="text-xl font-black text-blue-700">Rp 10.000</div>
                <div className="text-[11px] text-slate-500">1 Koin Washer</div>
                <div className="text-[10px] text-slate-500 font-semibold pt-1">Estimasi Waktu: ~35 Menit</div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1 text-center">
                <div className="font-black text-slate-900 text-sm">KERING SAJA</div>
                <div className="text-xl font-black text-blue-700">Rp 15.000</div>
                <div className="text-[11px] text-slate-500">1 Koin Dryer</div>
                <div className="text-[10px] text-slate-500 font-semibold pt-1">Estimasi Waktu: ~45 Menit</div>
              </div>
            </div>
          </div>

          {/* Retail Items */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Deterjen &amp; Perlengkapan Tambahan
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="font-medium text-slate-800">Soklin Liquid 1K</span>
                <span className="font-bold text-blue-600">Rp 1.000</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="font-medium text-slate-800">Downy 1K</span>
                <span className="font-bold text-blue-600">Rp 1.000</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="font-medium text-slate-800">Deterjen Tri 2K</span>
                <span className="font-bold text-blue-600">Rp 2.000</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="font-medium text-slate-800">Plastik 2K</span>
                <span className="font-bold text-blue-600">Rp 2.000</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="font-medium text-slate-800">Plastik 3K</span>
                <span className="font-bold text-blue-600">Rp 3.000</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QRIS PHOTO */}
      {activeTab === 'qris' && (
        <div className="max-w-md mx-auto">
          <QRISCard />
        </div>
      )}

      {/* TAB 4: MACHINES STATUS */}
      {activeTab === 'machines' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-cyan-600" />
              <span>Status Ketersediaan Mesin</span>
            </h3>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              Live Monitor
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
              <div className="font-black text-emerald-900 text-xs">WASHER #1</div>
              <div className="text-[11px] font-bold text-emerald-700">Tersedia</div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-1">
              <div className="font-black text-blue-900 text-xs">WASHER #2</div>
              <div className="text-[11px] font-bold text-blue-700">Sedang Mencuci</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
              <div className="font-black text-emerald-900 text-xs">DRYER #1</div>
              <div className="text-[11px] font-bold text-emerald-700">Tersedia</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
              <div className="font-black text-emerald-900 text-xs">DRYER #2</div>
              <div className="text-[11px] font-bold text-emerald-700">Tersedia</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
