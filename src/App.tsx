/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken,
} from './services/firebase';
import {
  getSpreadsheetDetails,
  readDayBlock,
  saveBatchTransactions,
  updateSingleTransaction,
  deleteSingleTransaction,
  DayBlockResult,
  SheetTransactionRow,
  SpreadsheetInfo,
  TransactionInput,
  SaveBatchResult,
} from './services/sheetsApi';
import { addDeletionAuditLog } from './services/deletionAudit';
import { getOfflineQueueCount, syncOfflineQueue } from './services/offlineQueue';
import { getTodayJakartaISO, getWeekInfoForDate, formatIndonesianDate } from './utils/dateUtils';
import { Header } from './components/Header';
import { Navigation, MainTabType } from './components/Navigation';
import { DateBanner } from './components/DateBanner';
import { LiveTrxView } from './components/LiveTrxView';
import { BatchFormView } from './components/BatchFormView';
import { StockCoinView } from './components/StockCoinView';
import { OwnerDashboardView } from './components/OwnerDashboardView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { MonthRolloverPlaceholder } from './components/MonthRolloverPlaceholder';
import { SheetSelectorModal } from './components/SheetSelectorModal';
import { GoogleSignInCard } from './components/GoogleSignInCard';
import { AppLayer, isUserAdmin, isUserCashier, getAppRoleForEmail } from './config/roles';

export default function App() {
  // CRITICAL RULE: Set date to device's today (Asia/Jakarta) BEFORE any network call
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayJakartaISO());

  // Active Tab & Layer
  const [activeLayer, setActiveLayer] = useState<AppLayer>('cashier');
  const [activeTab, setActiveTab] = useState<MainTabType>('live-trx');

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Calculate roles
  const appRole = getAppRoleForEmail(user?.email);
  const isUserAdminAccount = isUserAdmin(user?.email);
  const isUserCashierAccount = isUserCashier(user?.email);

  // Automatically enforce user layer based on role when user logs in or switches
  useEffect(() => {
    if (user?.email) {
      const role = getAppRoleForEmail(user.email);
      if (role === 'customer') {
        setActiveLayer('customer');
        setActiveTab('customer-portal');
      } else if (role === 'cashier') {
        if (activeLayer === 'owner') {
          setActiveLayer('cashier');
          setActiveTab('batch');
        }
      }
    }
  }, [user?.email]);

  // Spreadsheet Selection State
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('trcn_spreadsheet_id') || null;
  });
  const [spreadsheetName, setSpreadsheetName] = useState<string | null>(() => {
    return localStorage.getItem('trcn_spreadsheet_name') || null;
  });
  const [isSheetSelectorOpen, setIsSheetSelectorOpen] = useState<boolean>(false);

  // Day Block Data State (Stage 1 Read-Only & Live Trx)
  const [dayBlock, setDayBlock] = useState<DayBlockResult | null>(null);
  const [isLoadingDayBlock, setIsLoadingDayBlock] = useState<boolean>(false);
  const [dayBlockError, setDayBlockError] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);
  const [isUpdatingTrx, setIsUpdatingTrx] = useState<boolean>(false);

  // Token Expiration and Offline State
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [offlineCount, setOfflineCount] = useState<number>(() => getOfflineQueueCount());
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  // Initialize Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsAuthChecking(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthChecking(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setCachedAccessToken(result.accessToken);
      }
    } catch (err: any) {
      const isCancelled =
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('INTERNAL ASSERTION FAILED');

      if (!isCancelled) {
        console.error('Sign-in error:', err);
        setAuthError(err.message || 'Gagal login dengan akun Google. Silakan coba lagi.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setDayBlock(null);
  };

  // Fetch Day Block from Sheet for current date
  const loadDayBlock = useCallback(
    async (token: string, sheetId: string, dateStr: string, isBackground = false) => {
      if (!isBackground) {
        setIsLoadingDayBlock(true);
      }
      setDayBlockError(null);

      const weekInfo = getWeekInfoForDate(dateStr);
      try {
        const result = await readDayBlock(sheetId, weekInfo.tabName, dateStr, token);
        setDayBlock(result);
        setIsTokenExpired(false);
        if (result.error) {
          setDayBlockError(result.error);
        }
      } catch (err: any) {
        console.error('Error reading day block:', err);
        const isAuth401 =
          err?.message?.includes('invalid authentication credentials') ||
          err?.message?.includes('OAuth 2 access token') ||
          err?.message?.includes('401');

        if (isAuth401) {
          setIsTokenExpired(true);
          setDayBlockError(
            'Sesi Google Sheets kedaluwarsa (1 jam). Silakan klik "Perbarui Akses (1-Klik)" di atas untuk melanjutkan.'
          );
          // CRITICAL: Do NOT nullify dayBlock if we already have loaded data, user won't get blank screen!
        } else {
          setDayBlockError(err.message || `Gagal membaca transaksi dari tab ${weekInfo.tabName}`);
          setDayBlock((prev) => prev); // keep previous
        }
      } finally {
        if (!isBackground) {
          setIsLoadingDayBlock(false);
        }
      }
    },
    []
  );

  // Trigger initial load when token, sheetId, or selectedDate changes
  useEffect(() => {
    if (accessToken && spreadsheetId && selectedDate) {
      loadDayBlock(accessToken, spreadsheetId, selectedDate);
    }
  }, [accessToken, spreadsheetId, selectedDate, loadDayBlock]);

  // Calm background sync ONLY on live-trx or owner-dashboard, never interrupting edits or batch form (Issue #9)
  useEffect(() => {
    if (!accessToken || !spreadsheetId || !selectedDate || isTokenExpired) return;
    if (activeTab !== 'live-trx' && activeTab !== 'owner-dashboard') return;

    const interval = setInterval(() => {
      // Do not sync if tab is hidden, or user is editing/saving
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isSavingBatch || isUpdatingTrx) return;
      loadDayBlock(accessToken, spreadsheetId, selectedDate, true);
    }, 45000);

    return () => clearInterval(interval);
  }, [accessToken, spreadsheetId, selectedDate, activeTab, isSavingBatch, isUpdatingTrx, isTokenExpired, loadDayBlock]);

  // Offline Queue listener & Auto-Sync (Issue #10)
  useEffect(() => {
    const handleQueueUpdate = () => setOfflineCount(getOfflineQueueCount());
    window.addEventListener('trcn_offline_queue_updated', handleQueueUpdate);
    return () => window.removeEventListener('trcn_offline_queue_updated', handleQueueUpdate);
  }, []);

  const handleSyncOffline = async () => {
    if (!accessToken || !spreadsheetId || isSyncingOffline) return;
    setIsSyncingOffline(true);
    try {
      const res = await syncOfflineQueue(spreadsheetId, accessToken);
      setOfflineCount(getOfflineQueueCount());
      if (res.syncedCount > 0) {
        await loadDayBlock(accessToken, spreadsheetId, selectedDate);
      }
    } finally {
      setIsSyncingOffline(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      if (accessToken && spreadsheetId && getOfflineQueueCount() > 0) {
        handleSyncOffline();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [accessToken, spreadsheetId]);

  // Handle Spreadsheet Selection
  const handleSelectSpreadsheet = (sheetInfo: SpreadsheetInfo) => {
    setSpreadsheetId(sheetInfo.id);
    setSpreadsheetName(sheetInfo.name);
    localStorage.setItem('trcn_spreadsheet_id', sheetInfo.id);
    localStorage.setItem('trcn_spreadsheet_name', sheetInfo.name);

    if (accessToken) {
      loadDayBlock(accessToken, sheetInfo.id, selectedDate);
    }
  };

  // Handle Batch Transactions Save
  const handleSaveBatch = async (transactions: TransactionInput[]): Promise<SaveBatchResult> => {
    if (!accessToken || !spreadsheetId) {
      throw new Error('Spreadsheet belum terhubung atau sesi login berakhir.');
    }
    setIsSavingBatch(true);
    try {
      const currentWeek = getWeekInfoForDate(selectedDate);
      const result = await saveBatchTransactions(
        spreadsheetId,
        currentWeek.tabName,
        selectedDate,
        transactions,
        accessToken
      );
      // Immediately refresh the day block to reflect the new rows
      await loadDayBlock(accessToken, spreadsheetId, selectedDate);
      return result;
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Handle Single Transaction Edit
  const handleUpdateTransaction = async (rowNumber: number, data: TransactionInput) => {
    if (!accessToken || !spreadsheetId || !dayBlock) return;
    setIsUpdatingTrx(true);
    try {
      await updateSingleTransaction(spreadsheetId, dayBlock.tabName, rowNumber, data, accessToken);
      await loadDayBlock(accessToken, spreadsheetId, selectedDate);
    } finally {
      setIsUpdatingTrx(false);
    }
  };

  // Handle Single Transaction Deletion (Issue #3)
  const handleDeleteTransaction = async (
    rowNumber: number,
    targetTrx: SheetTransactionRow,
    reason: string
  ) => {
    if (!accessToken || !spreadsheetId || !dayBlock) {
      throw new Error('Spreadsheet belum terhubung atau sesi login berakhir.');
    }
    setIsUpdatingTrx(true);
    try {
      await deleteSingleTransaction(spreadsheetId, dayBlock.tabName, rowNumber, accessToken);

      // Audit notification for deletion
      addDeletionAuditLog({
        deletedByEmail: user?.email || 'kasir@trcn.com',
        deletedByName: user?.displayName || user?.email?.split('@')[0] || 'Kasir',
        deletedByRole: isUserAdminAccount ? 'admin' : 'cashier',
        targetDate: selectedDate,
        tabName: dayBlock.tabName,
        rowNumber,
        slotNumber: targetTrx.slotNumber,
        customer: targetTrx.customer,
        phoneNumber: targetTrx.phoneNumber,
        paket: targetTrx.paket,
        item: targetTrx.item,
        totalBayar: targetTrx.bayar || targetTrx.hargaCash + targetTrx.hargaQris,
        paymentMode: targetTrx.paymentMode,
        reason,
      });

      await loadDayBlock(accessToken, spreadsheetId, selectedDate);
    } finally {
      setIsUpdatingTrx(false);
    }
  };

  // Handle Moving Transaction to Another Date (Issue #7)
  const handleMoveTransaction = async (
    sourceRowNumber: number,
    sourceTrx: SheetTransactionRow,
    targetDateStr: string,
    updatedData: TransactionInput,
    reason: string
  ) => {
    if (!accessToken || !spreadsheetId || !dayBlock) {
      throw new Error('Spreadsheet belum terhubung atau sesi login berakhir.');
    }
    setIsUpdatingTrx(true);
    try {
      const targetWeek = getWeekInfoForDate(targetDateStr);

      // 1. Write transaction into target date tab
      await saveBatchTransactions(
        spreadsheetId,
        targetWeek.tabName,
        targetDateStr,
        [updatedData],
        accessToken
      );

      // 2. Clear from current source date row
      await deleteSingleTransaction(spreadsheetId, dayBlock.tabName, sourceRowNumber, accessToken);

      // 3. Record move notification to owner & admin
      addDeletionAuditLog({
        deletedByEmail: user?.email || 'kasir@trcn.com',
        deletedByName: user?.displayName || user?.email?.split('@')[0] || 'Kasir',
        deletedByRole: isUserAdminAccount ? 'admin' : 'cashier',
        targetDate: selectedDate,
        tabName: dayBlock.tabName,
        rowNumber: sourceRowNumber,
        slotNumber: sourceTrx.slotNumber,
        customer: sourceTrx.customer,
        phoneNumber: sourceTrx.phoneNumber,
        paket: sourceTrx.paket,
        item: sourceTrx.item,
        totalBayar: sourceTrx.bayar || sourceTrx.hargaCash + sourceTrx.hargaQris,
        paymentMode: sourceTrx.paymentMode,
        reason: `Dipindahkan ke tanggal ${formatIndonesianDate(targetDateStr)}. Alasan: ${reason}`,
      });

      await loadDayBlock(accessToken, spreadsheetId, selectedDate);
    } finally {
      setIsUpdatingTrx(false);
    }
  };

  const weekInfo = getWeekInfoForDate(selectedDate);

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans antialiased">
      {/* Dark Navy Header */}
      <Header
        user={user}
        spreadsheetName={spreadsheetName}
        isSyncing={isLoadingDayBlock}
        activeTab={activeTab}
        onSync={() => {
          if (accessToken && spreadsheetId) {
            loadDayBlock(accessToken, spreadsheetId, selectedDate);
          } else if (!spreadsheetId) {
            setIsSheetSelectorOpen(true);
          }
        }}
        onOpenSheetSelector={() => setIsSheetSelectorOpen(true)}
        onLogout={handleLogout}
      />

      {/* Loading state during session restoration to prevent blank screen */}
      {isAuthChecking && (
        <main className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-600">Memulihkan sesi TRICOINS...</p>
        </main>
      )}

      {/* If Not Signed In, show Google Sign In Card */}
      {!isAuthChecking && !user && (
        <main className="flex-1 flex items-center justify-center p-4">
          <GoogleSignInCard
            onSignIn={handleGoogleSignIn}
            isLoading={isLoggingIn}
            error={authError}
          />
        </main>
      )}

      {/* Main App Content when Authenticated */}
      {user && (
        <>
          {/* Token Expired Recovery Banner (Issue #2) */}
          {isTokenExpired && (
            <div className="bg-amber-500 text-slate-950 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs sm:text-sm font-semibold shadow-md">
              <div className="flex items-center space-x-2">
                <span className="text-base">⚠️</span>
                <span>
                  <b>Sesi Google Sheets berakhir (1 jam).</b> Data Anda tetap aman. Klik untuk perbarui akses tanpa logout.
                </span>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await googleSignIn();
                    if (res?.accessToken) {
                      setAccessToken(res.accessToken);
                      setCachedAccessToken(res.accessToken);
                      setIsTokenExpired(false);
                      setDayBlockError(null);
                      loadDayBlock(res.accessToken, spreadsheetId || '', selectedDate);
                    }
                  } catch (e: any) {
                    console.error('Failed to refresh token:', e);
                  }
                }}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition shadow-xs cursor-pointer shrink-0 mt-1 sm:mt-0"
              >
                Perbarui Akses Google (1-Klik)
              </button>
            </div>
          )}

          {/* Offline Pending Queue Banner (Issue #10) */}
          {offlineCount > 0 && (
            <div className="bg-sky-600 text-white px-4 py-2.5 flex flex-wrap items-center justify-between text-xs sm:text-sm font-semibold shadow-md">
              <div className="flex items-center space-x-2">
                <span className="text-base">📶</span>
                <span>
                  Ada <b>{offlineCount}</b> transaksi offline yang belum tersinkron ke Google Sheet.
                </span>
              </div>
              <button
                onClick={handleSyncOffline}
                disabled={isSyncingOffline || !accessToken}
                className="px-3 py-1 bg-white text-sky-800 rounded-lg text-xs font-bold hover:bg-sky-50 transition shadow-xs cursor-pointer shrink-0 mt-1 sm:mt-0 disabled:bg-slate-200"
              >
                {isSyncingOffline ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
              </button>
            </div>
          )}

          {/* Navigation Bar */}
          <Navigation
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            activeLayer={activeLayer}
            onChangeLayer={setActiveLayer}
            isUserAdminAccount={isUserAdminAccount}
            isUserCashierAccount={isUserCashierAccount}
            liveTrxCount={dayBlock?.paidRowCount !== undefined ? dayBlock.paidRowCount : dayBlock?.filledRowCount}
          />

          <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4">
            {/* If user is strictly customer, render Customer Portal only */}
            {appRole === 'customer' ? (
              <CustomerPortalView
                todayTransactions={dayBlock?.rows || []}
                selectedDate={selectedDate}
              />
            ) : (
              <>
                {/* Global Date Banner with Red Alert on non-today */}
                <DateBanner
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  targetTabName={weekInfo.tabName}
                  hasBlockError={Boolean(dayBlock && !dayBlock.found)}
                />

                {/* Tab Views */}
                {activeTab === 'owner-dashboard' && isUserAdminAccount && (
                  <OwnerDashboardView
                    selectedDate={selectedDate}
                    dayBlock={dayBlock}
                    spreadsheetId={spreadsheetId}
                    spreadsheetName={spreadsheetName}
                    accessToken={accessToken}
                    userEmail={user?.email}
                  />
                )}

            {activeTab === 'customer-portal' && (
              <CustomerPortalView
                todayTransactions={dayBlock?.rows || []}
                selectedDate={selectedDate}
              />
            )}

            {activeTab === 'live-trx' && (
              <LiveTrxView
                selectedDate={selectedDate}
                dayBlock={dayBlock}
                isLoading={isLoadingDayBlock}
                error={dayBlockError}
                onRefresh={() => {
                  if (accessToken && spreadsheetId) {
                    loadDayBlock(accessToken, spreadsheetId, selectedDate);
                  }
                }}
                onOpenSheetSelector={() => setIsSheetSelectorOpen(true)}
                onGoToBatch={() => setActiveTab('batch')}
                onUpdateTransaction={handleUpdateTransaction}
                onMoveTransaction={handleMoveTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                isUpdating={isUpdatingTrx}
                spreadsheetName={spreadsheetName}
              />
            )}

            {activeTab === 'batch' && (
              <BatchFormView
                selectedDate={selectedDate}
                targetTabName={dayBlock?.tabName || weekInfo.tabName}
                spreadsheetId={spreadsheetId}
                accessToken={accessToken}
                onSaveBatch={handleSaveBatch}
                onSuccessRedirect={() => setActiveTab('live-trx')}
                isSaving={isSavingBatch}
              />
            )}

            {activeTab === 'stok-coin' && (
              <StockCoinView
                selectedDate={selectedDate}
                dayBlock={dayBlock}
                spreadsheetId={spreadsheetId}
                accessToken={accessToken}
                userEmail={user?.email}
                activeLayer={activeLayer}
                onRefresh={() => {
                  if (accessToken && spreadsheetId) {
                    loadDayBlock(accessToken, spreadsheetId, selectedDate);
                  }
                }}
              />
            )}

            {activeTab === 'bulan' && (
              <MonthRolloverPlaceholder
                currentMonthName={weekInfo.monthName}
                accessToken={accessToken}
                onSelectSpreadsheet={handleSelectSpreadsheet}
              />
            )}
          </>
        )}
      </main>
    </>
  )}

      {/* Sheet Selector Modal */}
      <SheetSelectorModal
        isOpen={isSheetSelectorOpen}
        onClose={() => setIsSheetSelectorOpen(false)}
        accessToken={accessToken}
        currentSpreadsheetId={spreadsheetId}
        onSelectSpreadsheet={handleSelectSpreadsheet}
      />
    </div>
  );
}
