import React from 'react';
import { ShieldCheck, AlertCircle, Sparkles, Zap, Coins, BarChart3, Receipt, ArrowRight } from 'lucide-react';

interface GoogleSignInCardProps {
  onSignIn: () => void;
  isLoading: boolean;
  error: string | null;
}

export const GoogleSignInCard: React.FC<GoogleSignInCardProps> = ({
  onSignIn,
  isLoading,
  error,
}) => {
  return (
    <div className="max-w-lg mx-auto my-6 sm:my-10 p-6 sm:p-8 bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl text-center space-y-6 relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute -top-24 -left-24 w-56 h-56 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Bigger, Interactive Animated Logo with Double Ring & Shadow Glow */}
      <div className="relative inline-block mx-auto pt-2">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-1.5 flex items-center justify-center overflow-hidden mx-auto shadow-2xl ring-4 ring-blue-500/20 hover:scale-105 transition-all duration-300 transform cursor-pointer border border-slate-200 group">
          <img
            src="/logo.jpg"
            alt="TRCN App Logo"
            className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md border-2 border-white">
          v2.0
        </span>
      </div>

      {/* Welcoming Header with Emojis & App Name TRCN App */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>✨ Selamat Datang di TRCN App! 🧺🫧</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
          TRCN App
        </h1>

        <p className="text-sm font-semibold text-slate-700">
          Sistem Kasir &amp; Operasional Cerdas Laundry Koin Modern 🚀
        </p>

        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed pt-1">
          Kelola transaksi kilat ⚡, pantau omzet riil harian 📊, kontrol koin otomatis 🪙, dan cetak struk praktis 🧾 langsung tersinkron ke Google Sheets.
        </p>
      </div>

      {/* Feature Highlights Badges */}
      <div className="grid grid-cols-2 gap-2 text-left pt-1">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2">
          <span className="text-base">⚡</span>
          <div>
            <div className="text-xs font-bold text-slate-800">Transaksi Kilat</div>
            <div className="text-[10px] text-slate-500">Multi-customer lancar</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2">
          <span className="text-base">📊</span>
          <div>
            <div className="text-xs font-bold text-slate-800">Dashboard Owner</div>
            <div className="text-[10px] text-slate-500">Grafik omzet CASH &amp; QRIS</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2">
          <span className="text-base">🪙</span>
          <div>
            <div className="text-xs font-bold text-slate-800">Kontrol Koin</div>
            <div className="text-[10px] text-slate-500">Washer &amp; Dryer balancing</div>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2">
          <span className="text-base">🧾</span>
          <div>
            <div className="text-xs font-bold text-slate-800">Struk &amp; WhatsApp</div>
            <div className="text-[10px] text-slate-500">Kirim struk digital 1-klik</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start space-x-2 text-left animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Gagal Masuk:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Official Sign in with Google Button with Tactile Feedback */}
      <div className="pt-2">
        <button
          onClick={onSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-3 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm rounded-2xl border-2 border-slate-300 shadow-md hover:shadow-lg transition-all transform active:scale-95 active:brightness-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none group"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 group-hover:scale-110 transition-transform"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
          )}
          <span>{isLoading ? 'Menghubungkan Akun Google...' : 'Masuk dengan Google (Google Account)'}</span>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-[11px] text-slate-400 mt-3">
          Akses aman menggunakan OAuth resmi Google Workspace • Langsung tersambung ke Spreadsheet Anda
        </p>
      </div>
    </div>
  );
};
