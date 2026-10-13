import React from 'react';
import { Calendar, AlertTriangle, CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react';
import {
  formatIndonesianDate,
  getTodayJakartaISO,
  getWeekInfoForDate,
  isJakartaToday,
} from '../utils/dateUtils';

interface DateBannerProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  targetTabName?: string;
  hasBlockError?: boolean;
}

export const DateBanner: React.FC<DateBannerProps> = ({
  selectedDate,
  onDateChange,
  targetTabName,
  hasBlockError,
}) => {
  const isToday = isJakartaToday(selectedDate);
  const todayISO = getTodayJakartaISO();
  const weekInfo = getWeekInfoForDate(selectedDate);
  const displayTab = targetTabName || weekInfo.tabName;

  return (
    <div className="space-y-2 mb-3">
      {/* Date Bar Card */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5 min-w-[200px]">
          <div className={`p-2 rounded-lg ${isToday ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-600 uppercase flex items-center gap-1">
              <span>Tanggal Transaksi</span>
              {isToday ? (
                <span className="inline-flex items-center text-emerald-600 font-bold">
                  <CheckCircle2 className="w-3 h-3 mr-0.5 inline" /> Hari Ini
                </span>
              ) : (
                <span className="inline-flex items-center text-amber-600 font-bold">
                  <AlertTriangle className="w-3 h-3 mr-0.5 inline" /> Buka Tanggal Lain
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-slate-800">
              {formatIndonesianDate(selectedDate)}
            </div>
          </div>
        </div>

        {/* Date Selector & Target Tab Tag */}
        <div className="flex items-center space-x-2">
          {/* Target Sheet Tab Tag */}
          <div className="hidden xs:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
            <span className="text-slate-600">Tab:</span>
            <span className="font-bold text-blue-700">{displayTab}</span>
          </div>

          {/* Quick Date Picker Input */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(e.target.value);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs sm:text-sm font-medium bg-slate-50 hover:bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />

          {/* Reset to Today button if different */}
          {!isToday && (
            <button
              onClick={() => onDateChange(todayISO)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors active:scale-95"
              title="Kembali ke Hari Ini"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Hari Ini</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Red Alert if chosen date is NOT today */}
      {!isToday && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-3 rounded-r-xl shadow-xs text-rose-900 animate-in fade-in duration-200">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-800 text-[13px]">
                PERINGATAN: Tanggal yang dipilih BUKAN HARI INI
              </p>
              <p className="mt-0.5 text-rose-700 leading-relaxed">
                Anda memilih tanggal <span className="font-semibold">{formatIndonesianDate(selectedDate)}</span>{' '}
                (Hari ini adalah {formatIndonesianDate(todayISO)}).
                Semua data akan dibaca dan diarahkan ke tab{' '}
                <span className="font-bold underline">{displayTab}</span> pada file bulan{' '}
                <span className="font-semibold">{weekInfo.monthName} {weekInfo.year}</span>.
              </p>
            </div>
            <button
              onClick={() => onDateChange(todayISO)}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none shrink-0"
            >
              Reset ke Hari Ini
            </button>
          </div>
        </div>
      )}

      {/* Warning if no block found in sheet */}
      {hasBlockError && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl text-amber-900 text-xs">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Blok Tanggal Belum Ditemukan:</span> Day Block untuk tanggal{' '}
              {formatIndonesianDate(selectedDate)} belum disiapkan di Google Sheet tab{' '}
              <span className="font-semibold">{displayTab}</span>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
