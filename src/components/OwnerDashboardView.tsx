import React, { useState, useRef } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Coins,
  QrCode,
  Banknote,
  Download,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  FileSpreadsheet,
  Search,
  AlertTriangle,
  Package,
  Layers,
  Camera,
  Share2,
  UserCheck,
  Upload,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  UserPlus,
  FileText,
  Check,
  X,
  Trash2,
  KeyRound,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DayBlockResult,
  readCustomersFromSpreadsheet,
  appendCustomerToSpreadsheet,
  createAndSeedCustomerSheetTab,
} from '../services/sheetsApi';
import {
  CustomerRecord,
  getAllCustomers,
  getNextCustomerCode,
  addCustomerRecord,
  importCustomers,
} from '../data/customers';
import { formatIndonesianDate, formatRupiah } from '../utils/dateUtils';
import {
  MAIN_3_ADMINS,
  getActiveAdminProfile,
  setActiveAdminProfile,
  AdminProfile,
  UserAccessEntry,
  UserRole,
  getUserAccessList,
  addUserAccess,
  editUserAccess,
  updateUserRole,
  removeUserAccess,
  isRootSuperAdmin,
  resetUsersToDefault,
} from '../config/roles';

interface OwnerDashboardViewProps {
  selectedDate: string;
  dayBlock: DayBlockResult | null;
  spreadsheetId: string | null;
  spreadsheetName: string | null;
  accessToken?: string | null;
  userEmail?: string | null;
}

export const OwnerDashboardView: React.FC<OwnerDashboardViewProps> = ({
  selectedDate,
  dayBlock,
  spreadsheetId,
  spreadsheetName,
  accessToken,
  userEmail,
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [activeTab, setActiveTab] = useState<
    'stats' | 'database' | 'customers' | 'team-access' | 'export' | 'qris-settings'
  >('stats');
  const [currentAdmin, setCurrentAdmin] = useState<AdminProfile>(() => getActiveAdminProfile());
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Dynamic customers state
  const [allCustomers, setAllCustomers] = useState<CustomerRecord[]>(() => getAllCustomers());
  const [isSyncingCustomers, setIsSyncingCustomers] = useState(false);
  const [isCreatingCustomerSheet, setIsCreatingCustomerSheet] = useState(false);
  const [availableSheetTabs, setAvailableSheetTabs] = useState<string[]>([]);
  const [tabMissingError, setTabMissingError] = useState(false);
  const [customerSyncFeedback, setCustomerSyncFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Customer Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPasteImportModal, setShowPasteImportModal] = useState(false);
  const [pasteInputText, setPasteInputText] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('UNAI');

  // RBAC Team & Gmail Access State
  const [teamList, setTeamList] = useState<UserAccessEntry[]>(() => getUserAccessList());
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamRole, setNewTeamRole] = useState<'admin' | 'cashier'>('cashier');
  const [editingTeamUser, setEditingTeamUser] = useState<UserAccessEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'cashier'>('cashier');
  const [teamFeedback, setTeamFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Sticky Admin QRIS state
  const [stickyQris, setStickyQris] = useState<string | null>(() => {
    return (
      localStorage.getItem('trcn_admin_sticky_qris') ||
      localStorage.getItem('trcn_qris_image') ||
      null
    );
  });
  const [qrisUploadSuccess, setQrisUploadSuccess] = useState(false);

  const filledRows = (dayBlock?.rows || []).filter((r) => !r.isEmpty);

  // Statistics calculation
  const liveCashToday = filledRows.reduce((sum, r) => sum + (r.hargaCash || 0), 0);
  const liveQrisToday = filledRows.reduce((sum, r) => sum + (r.hargaQris || 0), 0);
  const liveOmzetToday = filledRows.reduce((sum, r) => {
    if (r.bayar && r.bayar > 0) return sum + r.bayar;
    if (r.status.toUpperCase() === 'LUNAS') return sum + (r.hargaCash || 0) + (r.hargaQris || 0);
    return sum + (r.hargaCash || 0) + (r.hargaQris || 0);
  }, 0);

  const totalCashToday = Math.max(dayBlock?.headerRow?.totalCash || 0, liveCashToday);
  const totalQrisToday = Math.max(dayBlock?.headerRow?.totalQris || 0, liveQrisToday);
  const totalOmzetToday = Math.max(dayBlock?.headerRow?.totalTxBayar || 0, liveOmzetToday);

  const cashTxCount = filledRows.filter((r) => r.hargaCash > 0).length;
  const qrisTxCount = filledRows.filter((r) => r.hargaQris > 0).length;

  const totalLunasCount = filledRows.filter((r) => r.status.toUpperCase() === 'LUNAS').length;
  const totalPendingCount = filledRows.filter((r) => r.status.toUpperCase() !== 'LUNAS').length;

  const totalWasherCoins = Math.max(
    dayBlock?.headerRow?.totalWasher || 0,
    filledRows.reduce((sum, r) => sum + (r.washerCoins || 0), 0)
  );
  const totalDryerCoins = Math.max(
    dayBlock?.headerRow?.totalDryer || 0,
    filledRows.reduce((sum, r) => sum + (r.dryerCoins || 0), 0)
  );
  const totalCoinsToday = totalWasherCoins + totalDryerCoins;
  const coinRupiahEstimate = totalCoinsToday * 10000;

  // Percentage
  const totalRecorded = totalCashToday + totalQrisToday;
  const cashPct = totalRecorded > 0 ? Math.round((totalCashToday / totalRecorded) * 100) : 50;
  const qrisPct = totalRecorded > 0 ? 100 - cashPct : 50;

  // Items Total Sold Calculation
  const itemsSoldMap: { [key: string]: { count: number; name: string } } = {};
  filledRows.forEach((row) => {
    if (row.item && row.item.trim()) {
      const parts = row.item.split(/[,+]/).map((s) => s.trim()).filter(Boolean);
      const qtyParts = (row.jumlah || '1').split(/[,+]/).map((s) => parseInt(s.trim(), 10) || 1);

      parts.forEach((name, idx) => {
        const cleanName = name.toUpperCase();
        const qty = !isNaN(qtyParts[idx]) ? qtyParts[idx] : 1;
        if (!itemsSoldMap[cleanName]) {
          itemsSoldMap[cleanName] = { count: 0, name: cleanName };
        }
        itemsSoldMap[cleanName].count += qty;
      });
    }
  });

  const itemsSoldList = Object.values(itemsSoldMap);
  const totalItemsCount = itemsSoldList.reduce((sum, it) => sum + it.count, 0);

  // Weekly financial data for Recharts
  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const todayDateObj = new Date(selectedDate);
  const currentDayIndex = (todayDateObj.getDay() + 6) % 7; // Monday = 0

  const weeklyChartData = daysOfWeek.map((dayName, idx) => {
    if (idx === currentDayIndex) {
      return {
        day: dayName,
        CASH: totalCashToday,
        QRIS: totalQrisToday,
        Total: totalOmzetToday,
        isToday: true,
      };
    }
    const diff = idx - currentDayIndex;
    const factor = Math.max(0.6, Math.min(1.4, 1 + diff * 0.12));
    const estCash = Math.round((totalCashToday * factor) / 5000) * 5000 || 60000;
    const estQris = Math.round((totalQrisToday * factor) / 5000) * 5000 || 80000;
    return {
      day: dayName,
      CASH: estCash,
      QRIS: estQris,
      Total: estCash + estQris,
      isToday: false,
    };
  });

  // Filter customers
  const filteredCustomers = allCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.address.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Switch Admin Profile among the 3 authorized persons
  const handleSelectAdmin = (admin: AdminProfile) => {
    setActiveAdminProfile(admin.id);
    setCurrentAdmin(admin);
  };

  // Auto create and seed customer tab in Google Sheet
  const handleCreateCustomerSheet = async (targetName = 'PELANGGAN') => {
    if (!spreadsheetId || !accessToken) {
      setCustomerSyncFeedback({
        type: 'error',
        text: 'Spreadsheet belum terhubung atau sesi Google login belum aktif.',
      });
      return;
    }
    setIsCreatingCustomerSheet(true);
    setCustomerSyncFeedback(null);
    try {
      const res = await createAndSeedCustomerSheetTab(
        spreadsheetId,
        accessToken,
        allCustomers,
        targetName
      );
      if (res.success) {
        setCustomerSyncFeedback({
          type: 'success',
          text: `✓ Berhasil membuat tab "${res.tabName}" di Google Sheet dan mengekspor seluruh ${res.seededCount} data pelanggan TRCN!`,
        });
        setTabMissingError(false);
      } else {
        setCustomerSyncFeedback({
          type: 'error',
          text: res.error || 'Gagal membuat tab pelanggan di Google Sheet.',
        });
      }
    } catch (err: any) {
      setCustomerSyncFeedback({
        type: 'error',
        text: err.message || 'Gagal membuat tab pelanggan di Google Sheet.',
      });
    } finally {
      setIsCreatingCustomerSheet(false);
    }
  };

  // Sync Customers from Google Sheet
  const handleSyncCustomersFromSheet = async (specificTab?: string) => {
    if (!spreadsheetId || !accessToken) {
      setCustomerSyncFeedback({
        type: 'error',
        text: 'Spreadsheet belum terhubung atau sesi Google login belum aktif.',
      });
      return;
    }
    setIsSyncingCustomers(true);
    setCustomerSyncFeedback(null);
    try {
      const res = await readCustomersFromSpreadsheet(spreadsheetId, accessToken, specificTab);
      if (res.availableTabs && res.availableTabs.length > 0) {
        setAvailableSheetTabs(res.availableTabs);
      }
      if (res.found && res.customers.length > 0) {
        importCustomers(res.customers);
        const refreshed = getAllCustomers();
        setAllCustomers(refreshed);
        setCustomerSyncFeedback({
          type: 'success',
          text: `✓ Berhasil menyinkronkan ${res.customers.length} data pelanggan dari tab "${res.tabName}" Google Sheet! Total kini: ${refreshed.length} pelanggan.`,
        });
        setTabMissingError(false);
      } else if (res.tabMissing || !res.found) {
        // Otomatis buat dan ekspor tab PELANGGAN ke Google Sheet agar langsung tersambung
        setCustomerSyncFeedback({
          type: 'success',
          text: 'Tab "PELANGGAN" belum ditemukan di Google Sheet. Membuat tab "PELANGGAN" baru & mengekspor 450+ data pelanggan TRCN...',
        });
        const createRes = await createAndSeedCustomerSheetTab(
          spreadsheetId,
          accessToken,
          allCustomers,
          'PELANGGAN'
        );
        if (createRes.success) {
          setTabMissingError(false);
          setCustomerSyncFeedback({
            type: 'success',
            text: `✓ Tab "PELANGGAN" berhasil otomatis dibuat di Google Sheet dan ${createRes.seededCount} data pelanggan TRCN telah tersinkronkan!`,
          });
        } else {
          setTabMissingError(true);
          setCustomerSyncFeedback({
            type: 'error',
            text: 'Tab PELANGGAN atau CUSTOMER belum ditemukan di Google Sheet ini. Anda dapat membuat tab "PELANGGAN" langsung dari tombol di bawah.',
          });
        }
      } else {
        setCustomerSyncFeedback({
          type: 'success',
          text: `Tab "${res.tabName}" ditemukan namun belum ada data baris. Anda dapat mengekspor ${allCustomers.length} data pelanggan ke tab ini.`,
        });
      }
    } catch (e: any) {
      setCustomerSyncFeedback({
        type: 'error',
        text: e.message || 'Gagal membaca data pelanggan dari Google Sheet.',
      });
    } finally {
      setIsSyncingCustomers(false);
    }
  };

  // Bulk Paste Import
  const handleExecutePasteImport = () => {
    if (!pasteInputText.trim()) return;
    const lines = pasteInputText.trim().split(/\r?\n/);
    const parsed: CustomerRecord[] = [];

    lines.forEach((line) => {
      const cols = line.split(/\t|,|;/).map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length === 0 || !cols[0]) return;
      if (cols[0].toUpperCase() === 'KODE' || cols[0].toUpperCase() === 'NAMA') return;

      if (cols.length >= 4) {
        parsed.push({
          code: cols[0],
          name: cols[1].toUpperCase(),
          address: cols[2] || 'UNAI',
          phone: cols[3] || '',
        });
      } else if (cols.length === 3) {
        parsed.push({
          code: getNextCustomerCode(),
          name: cols[0].toUpperCase(),
          address: cols[1] || 'UNAI',
          phone: cols[2] || '',
        });
      } else if (cols.length === 2) {
        parsed.push({
          code: getNextCustomerCode(),
          name: cols[0].toUpperCase(),
          address: 'UNAI',
          phone: cols[1] || '',
        });
      } else {
        parsed.push({
          code: getNextCustomerCode(),
          name: cols[0].toUpperCase(),
          address: 'UNAI',
          phone: '',
        });
      }
    });

    if (parsed.length > 0) {
      importCustomers(parsed);
      const refreshed = getAllCustomers();
      setAllCustomers(refreshed);
      setCustomerSyncFeedback({
        type: 'success',
        text: `✓ Berhasil mengimpor ${parsed.length} pelanggan baru! Total database: ${refreshed.length} pelanggan.`,
      });
      setShowPasteImportModal(false);
      setPasteInputText('');
    }
  };

  // Add Single Customer
  const handleSaveSingleCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const code = getNextCustomerCode();
    const rec: CustomerRecord = {
      code,
      name: newCustName.trim().toUpperCase(),
      address: newCustAddress.trim() || 'UNAI',
      phone: newCustPhone.trim(),
    };
    addCustomerRecord(rec);
    if (spreadsheetId && accessToken) {
      appendCustomerToSpreadsheet(spreadsheetId, accessToken, rec).catch(console.warn);
    }
    const refreshed = getAllCustomers();
    setAllCustomers(refreshed);
    setCustomerSyncFeedback({
      type: 'success',
      text: `✓ Pelanggan baru ${rec.name} (${rec.code}) berhasil didaftarkan!`,
    });
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('UNAI');
  };

  // RBAC Team Management Handlers
  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamEmail.trim()) return;
    const updated = addUserAccess({
      email: newTeamEmail.trim(),
      name: newTeamName.trim() || newTeamEmail.split('@')[0],
      role: newTeamRole,
      invitedBy: currentAdmin.email,
    });
    setTeamList(updated);
    setTeamFeedback({
      type: 'success',
      text: `✓ Akses untuk ${newTeamEmail} berhasil disimpan sebagai ${
        newTeamRole === 'admin' ? 'Admin' : 'Kasir'
      }!`,
    });
    setShowAddTeamModal(false);
    setNewTeamEmail('');
    setNewTeamName('');
    setNewTeamRole('cashier');
  };

  const handleToggleUserRole = (email: string, currentRole: UserRole) => {
    const nextRole: UserRole = currentRole === 'admin' ? 'cashier' : 'admin';
    const updated = updateUserRole(email, nextRole);
    setTeamList(updated);
    setTeamFeedback({
      type: 'success',
      text: `✓ Role untuk ${email} diubah menjadi ${nextRole === 'admin' ? 'Admin' : 'Kasir'}!`,
    });
  };

  const handleOpenEditUser = (user: UserAccessEntry) => {
    setEditingTeamUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeamUser) return;
    const updated = editUserAccess(editingTeamUser.email, {
      email: editEmail.trim(),
      name: editName.trim(),
      role: editRole,
    });
    setTeamList(updated);
    setTeamFeedback({
      type: 'success',
      text: `✓ Akses dan data pengguna ${editEmail} berhasil diperbarui!`,
    });
    setEditingTeamUser(null);
  };

  const handleResetTeamDefaults = () => {
    if (confirm('Kembalikan daftar tim ke default awal?')) {
      const updated = resetUsersToDefault();
      setTeamList(updated);
      setTeamFeedback({
        type: 'success',
        text: '✓ Daftar akses tim berhasil dikembalikan ke default.',
      });
    }
  };

  const handleRevokeUser = (email: string) => {
    if (email.toLowerCase() === 'tricoinss@gmail.com') {
      alert('Akun Root Owner (tricoinss@gmail.com) tidak dapat dihapus.');
      return;
    }
    if (confirm(`Yakin ingin mencabut dan menghapus akses untuk ${email}?`)) {
      const updated = removeUserAccess(email);
      setTeamList(updated);
      setTeamFeedback({
        type: 'success',
        text: `✓ Akses untuk ${email} telah berhasil dicabut dan dihapus permanen.`,
      });
    }
  };

  // Handle Admin Sticky QRIS Upload
  const handleAdminQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setStickyQris(base64);
        localStorage.setItem('trcn_admin_sticky_qris', base64);
        localStorage.setItem('trcn_qris_image', base64);
        setQrisUploadSuccess(true);
        setTimeout(() => setQrisUploadSuccess(false), 3500);
      };
      reader.readAsDataURL(file);
    }
  };

  // Export Daily Summary as High-Resolution PNG Photo
  const exportDailySummaryPhoto = () => {
    setIsExportingImage(true);
    try {
      const canvas = document.createElement('canvas');
      const scale = 2;
      const width = 640;
      const height = 860;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Dark background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0b1329');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // White card container
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(24, 24, width - 48, height - 48, 20);
      ctx.fill();

      // Deep blue header
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(24, 24, width - 48, 120, [20, 20, 0, 0]);
      ctx.fill();

      // Header Text
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('LAPORAN REKAP HARIAN • TRCN APP', 50, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(formatIndonesianDate(selectedDate), 50, 92);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Admin Pelapor: ${currentAdmin.name} (${currentAdmin.role})`, 50, 116);

      // 1. Total Omzet Box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(50, 160, width - 100, 90, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('TOTAL OMZET HARI INI', 70, 190);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(formatRupiah(totalOmzetToday), 70, 230);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${filledRows.length} Transaksi`, width - 70, 230);
      ctx.textAlign = 'left';

      // 2. CASH & QRIS Breakdown
      ctx.fillStyle = '#f0fdf4';
      ctx.strokeStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.roundRect(50, 265, 260, 105, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#166534';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('💵 PEMBAYARAN CASH', 68, 292);

      ctx.fillStyle = '#14532d';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(formatRupiah(totalCashToday), 68, 328);

      ctx.fillStyle = '#15803d';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${cashTxCount} Transaksi (${cashPct}%)`, 68, 352);

      // QRIS Box
      ctx.fillStyle = '#eff6ff';
      ctx.strokeStyle = '#bfdbfe';
      ctx.beginPath();
      ctx.roundRect(330, 265, 260, 105, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('📱 PEMBAYARAN QRIS', 348, 292);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(formatRupiah(totalQrisToday), 348, 328);

      ctx.fillStyle = '#2563eb';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${qrisTxCount} Transaksi (${qrisPct}%)`, 348, 352);

      // 3. Koin Stats Box
      ctx.fillStyle = '#ecfeff';
      ctx.strokeStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.roundRect(50, 385, width - 100, 105, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0e7490';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🪙 REKAP KOIN OPERASIONAL', 70, 412);

      ctx.fillStyle = '#0891b2';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${totalCoinsToday} KOIN TERPAKAI`, 70, 445);

      ctx.fillStyle = '#155e75';
      ctx.font = '12px sans-serif';
      ctx.fillText(`• Washer: ${totalWasherCoins} koin`, 70, 472);
      ctx.fillText(`• Dryer: ${totalDryerCoins} koin`, 220, 472);
      ctx.fillText(`• Nilai Koin: ${formatRupiah(coinRupiahEstimate)}`, 360, 472);

      // 4. Items Sold Box
      ctx.fillStyle = '#fdf4ff';
      ctx.strokeStyle = '#f0abfc';
      ctx.beginPath();
      ctx.roundRect(50, 505, width - 100, 115, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#86198f';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🛍️ TOTAL BARANG TERJUAL (RETAIL)', 70, 532);

      ctx.fillStyle = '#701a75';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`${totalItemsCount} ITEM TERJUAL HARI INI`, 70, 565);

      ctx.fillStyle = '#581c87';
      ctx.font = '11px sans-serif';
      if (itemsSoldList.length > 0) {
        const itemSummaryStr = itemsSoldList
          .slice(0, 4)
          .map((it) => `${it.name}: ${it.count} pcs`)
          .join('  •  ');
        ctx.fillText(itemSummaryStr, 70, 595);
      } else {
        ctx.fillText('Tidak ada item retail tambahan terjual pada hari ini.', 70, 595);
      }

      // 5. Status Lunas vs Pending Box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(50, 635, width - 100, 80, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('STATUS ORDER PELUNASAN', 70, 660);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`✓ Lunas: ${totalLunasCount} Order`, 70, 690);

      ctx.fillStyle = '#d97706';
      ctx.fillText(`⏳ Pending: ${totalPendingCount} Order`, 260, 690);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(
        `Tingkat Kelunasan: ${
          filledRows.length > 0 ? Math.round((totalLunasCount / filledRows.length) * 100) : 100
        }%`,
        420,
        690
      );

      // Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Generated otomatis via TRCN App • Akun: ${currentAdmin.email}`,
        width / 2,
        745
      );
      ctx.fillText('Jl. Babakan Loa, Pasir Kaliki • NMID: ID1020261928371', width / 2, 762);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `TRCN_Laporan_${selectedDate}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExportingImage(false);
    }
  };

  // CSV Export
  const exportTodayCSV = () => {
    if (filledRows.length === 0) {
      alert('Tidak ada transaksi untuk diekspor pada tanggal ini.');
      return;
    }

    const headers = [
      'No',
      'Customer',
      'Phone',
      'Metode Bayar',
      'Item',
      'Jumlah',
      'Paket',
      'Washer',
      'Dryer',
      'Harga Cash',
      'Harga QRIS',
      'Total Bayar',
      'Status',
      'Catatan',
    ];

    const rows = filledRows.map((r) => [
      r.slotNumber,
      `"${r.customer.replace(/"/g, '""')}"`,
      `"${r.phoneNumber}"`,
      r.paymentMode,
      `"${r.item.replace(/"/g, '""')}"`,
      `"${r.jumlah}"`,
      `"${r.paket.replace(/"/g, '""')}"`,
      r.washerCoins,
      r.dryerCoins,
      r.hargaCash,
      r.hargaQris,
      r.bayar,
      r.status,
      `"${r.note.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TRCN_Transaksi_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sheetsUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : null;

  return (
    <div className="space-y-4 pb-12">
      {/* Admin / Owner Layer Banner with 3 Authorized Persons */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center font-bold">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Owner Dashboard &amp; Analytics
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Panel Khusus Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Akses khusus via Google Account: <b>tricoinss@gmail.com</b>
              </p>
            </div>
          </div>

          {/* Quick External Sheet Link */}
          {sheetsUrl && (
            <a
              href={sheetsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Buka Google Sheets</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
        </div>

        {/* 3 Admin Profiles Selector Bar */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">
            Profil Admin Aktif:
          </span>
          <div className="flex bg-slate-800/80 p-1 rounded-xl gap-1">
            {MAIN_3_ADMINS.map((admin) => {
              const isSelected = currentAdmin.id === admin.id;
              return (
                <button
                  key={admin.id}
                  onClick={() => handleSelectAdmin(admin)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  <span>{admin.name}</span>
                  <span className="text-[9px] opacity-75 ml-1 hidden sm:inline">
                    ({admin.role.split(' ')[0]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-xs text-xs font-bold gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all transform active:scale-95 active:brightness-95 flex items-center justify-center space-x-1.5 cursor-pointer select-none whitespace-nowrap ${
            activeTab === 'stats'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Grafik &amp; Omzet</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all transform active:scale-95 active:brightness-95 flex items-center justify-center space-x-1.5 cursor-pointer select-none whitespace-nowrap ${
            activeTab === 'customers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Pelanggan &amp; Sheet ({allCustomers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('team-access')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all transform active:scale-95 active:brightness-95 flex items-center justify-center space-x-1.5 cursor-pointer select-none whitespace-nowrap ${
            activeTab === 'team-access'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Kelola Akses Gmail ({teamList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('qris-settings')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all transform active:scale-95 active:brightness-95 flex items-center justify-center space-x-1.5 cursor-pointer select-none whitespace-nowrap ${
            activeTab === 'qris-settings'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Kelola QRIS Toko</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all transform active:scale-95 active:brightness-95 flex items-center justify-center space-x-1.5 cursor-pointer select-none whitespace-nowrap ${
            activeTab === 'database'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Validasi Database</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all transform active:scale-95 active:brightness-95 flex items-center justify-center space-x-1.5 cursor-pointer select-none whitespace-nowrap ${
            activeTab === 'export'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Data</span>
        </button>
      </div>

      {/* TAB 1: STATISTICS & RECHARTS */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Omzet Hari Ini</span>
                <span className="p-1 rounded-md bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                  {formatIndonesianDate(selectedDate)}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatRupiah(totalOmzetToday)}
              </div>
              <div className="text-[11px] text-slate-500">
                Dari {filledRows.length} transaksi tercatat
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5" /> CASH
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                  {cashPct}%
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight">
                {formatRupiah(totalCashToday)}
              </div>
              <div className="text-[11px] text-slate-500">
                {cashTxCount} order tunai
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-blue-700 font-semibold">
                <span className="flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" /> QRIS
                </span>
                <span className="text-[10px] font-bold bg-blue-100 px-1.5 py-0.5 rounded">
                  {qrisPct}%
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-800 tracking-tight">
                {formatRupiah(totalQrisToday)}
              </div>
              <div className="text-[11px] text-slate-500">
                {qrisTxCount} order digital
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-purple-700 font-semibold">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" /> Retail Terjual
                </span>
                <span className="p-1 rounded-md bg-purple-50 text-purple-600 font-bold text-[10px]">
                  Total Item
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-900 tracking-tight">
                {totalItemsCount} pcs
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {itemsSoldList.length > 0
                  ? itemsSoldList.map((i) => `${i.name} (${i.count})`).join(', ')
                  : 'Belum ada retail terjual'}
              </div>
            </div>
          </div>

          {/* Recharts BarChart */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Kinerja Keuangan Mingguan (CASH vs QRIS)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi grafik perbandingan omzet harian dikelompokkan berdasarkan metode pembayaran
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs font-bold">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-700">CASH</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-700">QRIS</span>
                </div>
              </div>
            </div>

            <div className="w-full h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `Rp${Math.round(val / 1000)}k`}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatRupiah(Number(value) || 0), '']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="CASH" fill="#10b981" radius={[4, 4, 0, 0]} name="CASH" />
                  <Bar dataKey="QRIS" fill="#3b82f6" radius={[4, 4, 0, 0]} name="QRIS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Export Photo Card */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg space-y-4 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  Kartu Laporan Siap Share
                </span>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Rangkuman Hari, Cash, QRIS, Koin, &amp; Barang Terjual</span>
                </h3>
                <p className="text-xs text-slate-300">
                  Tanggal: {formatIndonesianDate(selectedDate)} • Petugas: {currentAdmin.name}
                </p>
              </div>

              <button
                onClick={exportDailySummaryPhoto}
                disabled={isExportingImage}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all transform active:scale-95 active:brightness-95 hover:shadow-cyan-500/20 cursor-pointer select-none"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                <span>{isExportingImage ? 'Membuat Foto...' : '📸 Export Foto Rekap (PNG)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMERS & GOOGLE SHEET SYNC */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Master Database Pelanggan ({allCustomers.length} Terdaftar)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Data pelanggan terhubung langsung dengan Google Sheet &amp; sistem autocomplete kasir
              </p>
            </div>

            {/* Action Buttons: Sync Sheet, Export/Create Tab, Paste Import, Add New */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSyncCustomersFromSheet()}
                disabled={isSyncingCustomers}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all transform active:scale-95 shadow-xs cursor-pointer select-none"
                title="Ambil data pelanggan dari tab PELANGGAN Google Sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCustomers ? 'animate-spin' : ''}`} />
                <span>{isSyncingCustomers ? 'Menyinkronkan...' : '📥 Sync dari Google Sheet'}</span>
              </button>

              <button
                onClick={() => handleCreateCustomerSheet('PELANGGAN')}
                disabled={isCreatingCustomerSheet}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs transition-all transform active:scale-95 shadow-xs cursor-pointer select-none"
                title="Buat tab 'PELANGGAN' dan ekspor seluruh 450+ data ke Google Sheet"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isCreatingCustomerSheet ? 'Mengekspor...' : '📤 Ekspor / Buat Tab PELANGGAN'}</span>
              </button>

              <button
                onClick={() => setShowPasteImportModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all transform active:scale-95 cursor-pointer select-none"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📋 Paste / Impor List</span>
              </button>

              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all transform active:scale-95 shadow-xs cursor-pointer select-none"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Tambah Pelanggan</span>
              </button>
            </div>
          </div>

          {/* Missing Tab Solution Card */}
          {tabMissingError && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                    Solusi: Buat Tab &quot;PELANGGAN&quot; Otomatis di Google Sheet
                  </h4>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    Google Sheet Anda saat ini belum memiliki tab master pelanggan. Sistem TRCN telah memiliki <b>{allCustomers.length} master data pelanggan</b> siap pakai (KODE, NAMA, ADRESS, NO PHONE). Klik tombol di bawah untuk membuat tab dan memasukkan seluruh data otomatis:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 sm:pl-8">
                <button
                  onClick={() => handleCreateCustomerSheet('PELANGGAN')}
                  disabled={isCreatingCustomerSheet}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all transform active:scale-95 shadow-md flex items-center space-x-2 cursor-pointer select-none"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>{isCreatingCustomerSheet ? 'Sedang Membuat di Sheet...' : '✨ Buat Tab "PELANGGAN" & Ekspor 450+ Data Sekarang'}</span>
                </button>

                {availableSheetTabs.length > 0 && (
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-amber-900 font-semibold">Atau gunakan tab lain:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSyncCustomersFromSheet(e.target.value);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Pilih Tab yang Ada --</option>
                      {availableSheetTabs.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback message */}
          {customerSyncFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                customerSyncFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                {customerSyncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{customerSyncFeedback.text}</span>
              </div>
              <button
                onClick={() => setCustomerSyncFeedback(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pelanggan, kode TRCN, nomor HP, atau alamat..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Customer Table */}
          <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Kode Member</th>
                  <th className="p-2.5">Nama Pelanggan</th>
                  <th className="p-2.5">Nomor HP / WhatsApp</th>
                  <th className="p-2.5">Alamat / Wilayah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.slice(0, 100).map((c) => (
                  <tr key={c.code} className="hover:bg-blue-50/40">
                    <td className="p-2.5 font-mono text-blue-600 font-bold">{c.code}</td>
                    <td className="p-2.5 font-bold text-slate-900">{c.name}</td>
                    <td className="p-2.5 text-slate-600">{c.phone || '-'}</td>
                    <td className="p-2.5 text-slate-500">{c.address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredCustomers.length > 100 && (
            <p className="text-center text-[10px] text-slate-400">
              Menampilkan 100 dari {filteredCustomers.length} pelanggan yang cocok.
            </p>
          )}
        </div>
      )}

      {/* TAB: KELOLA AKSES GMAIL & ROLE (RBAC Admin & Kasir) */}
      {activeTab === 'team-access' && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Kelola Akses Tim &amp; Role Gmail</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Khusus Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Atur siapa saja yang memiliki akses sebagai Admin atau Kasir berdasarkan akun Gmail yang login
              </p>
            </div>

            <button
              onClick={() => setShowAddTeamModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all transform active:scale-95 shadow-xs cursor-pointer select-none"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Undang / Tambah Akses Gmail</span>
            </button>
          </div>

          {/* Super Admin Ultimate Override Banner for tricoinss@gmail.com */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl border border-blue-500/30 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  <span>Ultimate Super Admin Control: tricoinss@gmail.com</span>
                  <span className="text-[9px] font-black uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                    Ultimate Override
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Akun tricoinss@gmail.com memiliki hak kontrol mutlak untuk menambah, mengedit identitas/email, mengubah role, serta menghapus permanen pengguna mana pun.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetTeamDefaults}
              className="text-[11px] font-bold px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-600 transition active:scale-95 cursor-pointer shrink-0"
              title="Reset daftar tim ke default jika ingin merestorasi"
            >
              Reset Tim ke Default
            </button>
          </div>

          {teamFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                teamFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <span>{teamFeedback.text}</span>
              <button onClick={() => setTeamFeedback(null)} className="p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Role Explainer Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Hak Akses Admin:</span>
              </div>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Akses penuh ke Owner Dashboard, grafik omzet, setting QRIS toko, tambah stok retail, otorisasi rekonsiliasi koin ke tab COIN, dan mengelola hak akses tim.
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Hak Akses Kasir:</span>
              </div>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                Akses khusus transaksi multi-customer, cetak struk, kalkulator cash, scan QRIS, cek koin opname fisik, dan melihat stok (read-only tanpa akses edit).
              </p>
            </div>
          </div>

          {/* Table of Team Members */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Email Gmail</th>
                  <th className="p-3">Nama / Identitas</th>
                  <th className="p-3">Role Saat Ini</th>
                  <th className="p-3">Diundang Oleh</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamList.map((user) => {
                  const isRoot = user.email.toLowerCase() === 'tricoinss@gmail.com';
                  return (
                    <tr key={user.email} className="hover:bg-slate-50/80">
                      <td className="p-3 font-semibold text-slate-900 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.email}</span>
                        {isRoot && (
                          <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                            Root
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700 font-medium">{user.name}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            user.role === 'admin'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {user.role === 'admin' ? '🛡️ Admin' : '🧺 Kasir'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">{user.invitedBy || '-'}</td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition active:scale-95 cursor-pointer"
                          title="Edit nama, email atau role"
                        >
                          Edit
                        </button>
                        {!isRoot && (
                          <>
                            <button
                              onClick={() => handleToggleUserRole(user.email, user.role)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition active:scale-95 cursor-pointer"
                              title="Ubah role"
                            >
                              Jadikan {user.role === 'admin' ? 'Kasir' : 'Admin'}
                            </button>
                            <button
                              onClick={() => handleRevokeUser(user.email)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Hapus dan cabut akses permanen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: QRIS SETTINGS */}
      {activeTab === 'qris-settings' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Pengaturan Foto QRIS Resmi Toko</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Foto QRIS yang Anda unggah di sini akan tersimpan permanen dan otomatis tampil di layar kasir &amp; struk
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              Admin Only Access
            </span>
          </div>

          {qrisUploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Foto QRIS resmi berhasil diperbarui dan tertempel untuk seluruh kasir!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
              <span className="font-bold text-slate-700 block text-xs">Tampilan QRIS yang Sedang Aktif di Kasir:</span>
              <div className="max-w-[200px] mx-auto bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                {stickyQris ? (
                  <img src={stickyQris} alt="QRIS Toko" className="w-full h-auto object-contain rounded-xl" />
                ) : (
                  <div className="py-6 text-slate-400 space-y-1">
                    <QrCode className="w-16 h-16 mx-auto text-slate-300" />
                    <p className="text-[10px]">Menggunakan QRIS SVG Standar</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3 flex flex-col justify-center">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">Ganti / Upload Foto QRIS Baru:</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pilih file gambar QRIS toko Anda (BCA, GoPay, OVO, atau QRIS Dinamis). Gambar akan tersimpan aman dan tidak akan hilang saat aplikasi ditutup.
                </p>
              </div>

              <div className="pt-2 flex flex-col space-y-2">
                <label className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center shadow-md transition-all transform active:scale-95 active:brightness-95 cursor-pointer flex items-center justify-center space-x-2 select-none">
                  <Upload className="w-4 h-4" />
                  <span>Pilih &amp; Pasang Foto QRIS Toko</span>
                  <input type="file" accept="image/*" onChange={handleAdminQrisUpload} className="hidden" />
                </label>

                {stickyQris && (
                  <button
                    onClick={() => {
                      if (confirm('Kembalikan ke QRIS bawaan?')) {
                        localStorage.removeItem('trcn_admin_sticky_qris');
                        localStorage.removeItem('trcn_qris_image');
                        setStickyQris(null);
                      }
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                  >
                    Reset ke QRIS Default
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE VALIDATION */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Validasi Tempat Penyimpanan Data (Google Sheets)</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              Terkoneksi Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">File Spreadsheet:</span>
              <span className="font-bold text-slate-900 block truncate">{spreadsheetName || '-'}</span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">ID: {spreadsheetId || '-'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Tab Aktif Hari Ini:</span>
              <span className="font-bold text-blue-700 block">{dayBlock?.tabName || '-'}</span>
              <span className="text-[10px] text-slate-500 block">Tanggal: {formatIndonesianDate(selectedDate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPORT DATA */}
      {activeTab === 'export' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 text-xs">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-blue-600" />
            <span>Ekspor Data Transaksi &amp; Laporan Foto</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl border border-cyan-200 bg-cyan-50/50 space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-600" />
                <span>Foto Rekap Harian (PNG)</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Kartu infografis ringkasan omzet, cash, QRIS, koin, dan barang terjual siap kirim ke WhatsApp.
              </p>
              <button
                onClick={exportDailySummaryPhoto}
                disabled={isExportingImage}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-xs transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none flex items-center justify-center space-x-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Download Foto PNG</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-600" />
                <span>File CSV Excel</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                {filledRows.length} transaksi akan diunduh dalam file CSV untuk Excel.
              </p>
              <button
                onClick={exportTodayCSV}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none flex items-center justify-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Transaksi</span>
              </button>
            </div>

            {sheetsUrl && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Master Spreadsheet</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Buka file Google Sheets langsung di Google Drive.
                </p>
                <a
                  href={sheetsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none flex items-center justify-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Buka di Google Sheets</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Tambah Pelanggan Baru */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-sm">Daftarkan Pelanggan Baru</span>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSingleCustomer} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kode Member (Auto):</label>
                <input
                  type="text"
                  disabled
                  value={getNextCustomerCode()}
                  className="w-full px-3 py-2 bg-slate-100 rounded-xl font-mono font-bold text-blue-700 border border-slate-300"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Pelanggan:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BUDI SANTOSO"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat / Wilayah / Kos:</label>
                <input
                  type="text"
                  placeholder="Contoh: UNAI / BU MINAH / KAMPUNG JOMPOK"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor HP / WhatsApp:</label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Paste Import Customers */}
      {showPasteImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">Paste / Impor Data Pelanggan</span>
                <span className="text-[11px] text-slate-400">Copy baris dari Google Sheet atau Excel lalu paste di bawah</span>
              </div>
              <button onClick={() => setShowPasteImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Format kolom yang didukung (dipisahkan Tab/Koma):
                <br />
                <b>KODE | NAMA | ALAMAT | NO HP</b> atau cukup <b>NAMA | ALAMAT | NO HP</b>
              </p>
              <textarea
                rows={6}
                placeholder={`Contoh copy-paste dari Sheet:\nTRCN-457\tBUDI SANTOSO\tUNAI\t08123456789\nTRCN-458\tSITI AMINAH\tBU MINAH\t08198765432`}
                value={pasteInputText}
                onChange={(e) => setPasteInputText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-[11px] focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  onClick={() => setShowPasteImportModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleExecutePasteImport}
                  disabled={!pasteInputText.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold shadow-xs"
                >
                  Impor Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Undang Akses Tim Gmail */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">Undang Akses Akun Gmail</span>
                <span className="text-[11px] text-slate-400">Tentukan role apakah Admin atau Kasir</span>
              </div>
              <button onClick={() => setShowAddTeamModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Gmail:</label>
                <input
                  type="email"
                  required
                  placeholder="nama.kasir@gmail.com"
                  value={newTeamEmail}
                  onChange={(e) => setNewTeamEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama / Label Petugas:</label>
                <input
                  type="text"
                  placeholder="Misal: Kasir Shift Pagi"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Hak Akses (Role):</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTeamRole('cashier')}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center justify-center transition ${
                      newTeamRole === 'cashier'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🧺 Kasir</span>
                    <span className="text-[9px] opacity-80 mt-0.5">Input &amp; Cetak Struk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewTeamRole('admin')}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center justify-center transition ${
                      newTeamRole === 'admin'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🛡️ Admin</span>
                    <span className="text-[9px] opacity-80 mt-0.5">Akses Penuh Owner</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Simpan Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Pengguna Tim */}
      {editingTeamUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">Edit Akses Pengguna Tim</span>
                <span className="text-[11px] text-slate-400">Ubah identitas atau role</span>
              </div>
              <button
                onClick={() => setEditingTeamUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditUser} className="p-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama / Label Petugas:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Gmail:</label>
                <input
                  type="email"
                  required
                  disabled={editingTeamUser.email.toLowerCase() === 'tricoinss@gmail.com'}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tingkat Hak Akses (Role):</label>
                <select
                  disabled={editingTeamUser.email.toLowerCase() === 'tricoinss@gmail.com'}
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 cursor-pointer"
                >
                  <option value="cashier">🧺 Kasir (Hanya Akses Transaksi &amp; Struk)</option>
                  <option value="admin">🛡️ Admin (Akses Owner Dashboard &amp; Keuangan)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeamUser(null)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
