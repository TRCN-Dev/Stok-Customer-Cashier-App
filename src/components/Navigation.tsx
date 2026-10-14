import React from 'react';
import {
  Layers,
  Activity,
  Coins,
  CalendarRange,
  Shield,
  BarChart3,
  UserCheck,
  Package,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { AppLayer } from '../config/roles';

export type MainTabType =
  | 'batch'
  | 'live-trx'
  | 'stok-coin'
  | 'bulan'
  | 'owner-dashboard'
  | 'customer-portal';

interface NavigationProps {
  activeTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  activeLayer: AppLayer;
  onChangeLayer: (layer: AppLayer) => void;
  isUserAdminAccount: boolean;
  isUserCashierAccount?: boolean;
  liveTrxCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  activeLayer,
  onChangeLayer,
  isUserAdminAccount,
  isUserCashierAccount = false,
  liveTrxCount,
}) => {
  const isCustomerOnly = !isUserAdminAccount && !isUserCashierAccount;
  const canAccessCashier = isUserAdminAccount || isUserCashierAccount;
  const canAccessOwner = isUserAdminAccount;

  // Tabs for Cashier Layer
  const cashierTabs: { id: MainTabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'batch',
      label: 'Batch Kasir',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'live-trx',
      label: 'Live Trx',
      icon: <Activity className="w-4 h-4" />,
      badge: liveTrxCount !== undefined && liveTrxCount > 0 ? liveTrxCount : undefined,
    },
    {
      id: 'stok-coin',
      label: 'Koin Opname & Stok',
      icon: <Coins className="w-4 h-4" />,
    },
  ];

  // Tabs for Owner Layer
  const ownerTabs: { id: MainTabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'owner-dashboard',
      label: 'Statistik & Database',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'stok-coin',
      label: 'Input Stok & Harga',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'live-trx',
      label: 'Audit Transaksi',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'bulan',
      label: 'Bulan Baru',
      icon: <CalendarRange className="w-4 h-4" />,
    },
  ];

  // Tabs for Customer Layer
  const customerTabs: { id: MainTabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'customer-portal',
      label: 'Portal Pelanggan',
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  const currentTabs =
    activeLayer === 'owner' && canAccessOwner
      ? ownerTabs
      : activeLayer === 'cashier' && canAccessCashier
      ? cashierTabs
      : customerTabs;

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs sticky top-[53px] z-30">
      {/* 1. Layer Selector Bar (Interactive tactile pill switch) */}
      <div className="bg-slate-100/90 border-b border-slate-200 py-1.5 px-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-500">
            <span>Pilih Layer Mode:</span>
            {isCustomerOnly && (
              <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                👤 Mode Pelanggan
              </span>
            )}
          </div>

          <div className="flex bg-slate-200/90 rounded-xl p-1 gap-1">
            {/* Owner Layer (Admin only) */}
            {canAccessOwner && (
              <button
                onClick={() => {
                  onChangeLayer('owner');
                  onChangeTab('owner-dashboard');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 cursor-pointer ${
                  activeLayer === 'owner'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Owner / Admin</span>
              </button>
            )}

            {/* Cashier Layer (Admin or Cashier only) */}
            {canAccessCashier && (
              <button
                onClick={() => {
                  onChangeLayer('cashier');
                  onChangeTab('batch');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 cursor-pointer ${
                  activeLayer === 'cashier'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Kasir</span>
              </button>
            )}

            {/* Customer Layer */}
            <button
              onClick={() => {
                onChangeLayer('customer');
                onChangeTab('customer-portal');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 cursor-pointer ${
                activeLayer === 'customer'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Pelanggan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Layer Sub-Navigation Tabs */}
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="flex justify-between sm:justify-start sm:space-x-3 overflow-x-auto">
          {currentTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all transform active:scale-95 cursor-pointer relative shrink-0 ${
                  isActive
                    ? activeLayer === 'owner'
                      ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                      : activeLayer === 'customer'
                      ? 'border-cyan-600 text-cyan-800 bg-cyan-50/50'
                      : 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {'badge' in tab && (tab as any).badge !== undefined && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {(tab as any).badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
