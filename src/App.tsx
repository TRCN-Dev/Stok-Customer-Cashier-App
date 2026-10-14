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
  DayBlockResult,
  SpreadsheetInfo,
  TransactionInput,
  SaveBatchResult,
} from './services/sheetsApi';
import { getTodayJakartaISO, getWeekInfoForDate } from './utils/dateUtils';
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
    async (token: string, sheetId: string, dateStr: string) => {
      setIsLoadingDayBlock(true);
      setDayBlockError(null);

      const weekInfo = getWeekInfoForDate(dateStr);
      try {
        const result = await readDayBlock(sheetId, weekInfo.tabName, dateStr, token);
        setDayBlock(result);
        if (result.error) {
          setDayBlockError(result.error);
        }
      } catch (err: any) {
        console.error('Error reading day block:', err);
        setDayBlockError(err.message || `Gagal membaca transaksi dari tab ${weekInfo.tabName}`);
        setDayBlock(null);
      } finally {
        setIsLoadingDayBlock(false);
      }
    },
    []
  );

  // Trigger load when token, sheetId, or selectedDate changes
  useEffect(() => {
    if (accessToken && spreadsheetId && selectedDate) {
      loadDayBlock(accessToken, spreadsheetId, selectedDate);
    }
  }, [accessToken, spreadsheetId, selectedDate, loadDayBlock]);

  // Live background synchronization every 15 seconds so changes made in Google Sheets appear in the app
  useEffect(() => {
    if (!accessToken || !spreadsheetId || !selectedDate) return;
    const interval = setInterval(() => {
      loadDayBlock(accessToken, spreadsheetId, selectedDate);
    }, 15000);
    return () => clearInterval(interval);
  }, [accessToken, spreadsheetId, selectedDate, loadDayBlock]);

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
          {/* Navigation Bar */}
          <Navigation
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            activeLayer={activeLayer}
            onChangeLayer={setActiveLayer}
            isUserAdminAccount={isUserAdminAccount}
            isUserCashierAccount={isUserCashierAccount}
            liveTrxCount={dayBlock?.filledRowCount}
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
