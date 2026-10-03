import React from 'react';
import { RefreshCw, LogOut, FileSpreadsheet, ShieldCheck, User as UserIcon, Shield } from 'lucide-react';
import { User } from 'firebase/auth';
import { isUserAdmin } from '../config/roles';

interface HeaderProps {
  user: User | null;
  spreadsheetName: string | null;
  isSyncing: boolean;
  onSync: () => void;
  onOpenSheetSelector: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  spreadsheetName,
  isSyncing,
  onSync,
  onOpenSheetSelector,
  onLogout,
}) => {
  const isAdmin = isUserAdmin(user?.email);

  return (
    <header className="bg-[#0b1329] text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-white p-0.5 flex items-center justify-center overflow-hidden shadow-sm ring-2 ring-blue-400/40 shrink-0">
            <img
              src="/logo.jpg"
              alt="TRICOINS Logo"
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                // fallback if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold leading-tight flex items-center gap-1.5">
              <span>TRICOINS Live Kasir</span>
              {isAdmin ? (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" /> Admin
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Kasir
                </span>
              )}
            </h1>
            <button
              onClick={onOpenSheetSelector}
              className="flex items-center text-[11px] text-slate-400 hover:text-blue-300 transition-colors truncate max-w-[190px] sm:max-w-xs text-left"
              title="Ganti Spreadsheet"
            >
              <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-400 shrink-0" />
              <span className="truncate underline decoration-dotted">
                {spreadsheetName || 'Hubungkan Spreadsheet'}
              </span>
            </button>
          </div>
        </div>

        {/* Action Buttons: Sync & Profile */}
        <div className="flex items-center space-x-2">
          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isSyncing
                ? 'bg-blue-900/60 text-blue-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow active:scale-95'
            }`}
            title="Sinkronisasi Data dari Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Sinkron...' : 'Sync'}</span>
          </button>

          {/* User Profile / Logout */}
          {user && (
            <div className="flex items-center space-x-1.5 pl-1.5 border-l border-slate-700">
              <div
                className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold overflow-hidden ring-1 ring-slate-600"
                title={user.email || 'Pengguna'}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Keluar (Sign Out)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
