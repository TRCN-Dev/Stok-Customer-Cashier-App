import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

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
    <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-slate-200 shadow-md text-center space-y-5">
      {/* Brand Icon */}
      <div className="w-20 h-20 rounded-3xl bg-white p-1 flex items-center justify-center overflow-hidden mx-auto shadow-md ring-4 ring-blue-100">
        <img
          src="/logo.jpg"
          alt="TRICOINS Logo"
          className="w-full h-full object-cover rounded-2xl"
        />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">TRICOINS Laundry Kasir</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Aplikasi kasir laundry koin berbasis Google Sheets. Masuk dengan akun Google Anda untuk mengakses data transaksi.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2 text-left">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Official Sign in with Google Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onSignIn}
          disabled={isLoading}
          className="flex items-center justify-center space-x-3 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-5 h-5"
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
          <span>{isLoading ? 'Menghubungkan...' : 'Sign in with Google'}</span>
        </button>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-600">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Koneksi aman langsung ke Google Sheets & Drive Anda</span>
      </div>
    </div>
  );
};
