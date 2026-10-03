import React from 'react';
import { Layers, Activity, Coins, CalendarRange } from 'lucide-react';

export type MainTabType = 'batch' | 'live-trx' | 'stok-coin' | 'bulan';

interface NavigationProps {
  activeTab: MainTabType;
  onChangeTab: (tab: MainTabType) => void;
  liveTrxCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  liveTrxCount,
}) => {
  const tabs: { id: MainTabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'batch',
      label: 'Batch',
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
      label: 'Stok & Coin',
      icon: <Coins className="w-4 h-4" />,
    },
    {
      id: 'bulan',
      label: 'Bulan',
      icon: <CalendarRange className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 shadow-xs sticky top-[53px] z-30">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="flex justify-between sm:justify-start sm:space-x-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer relative ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
