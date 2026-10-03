import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Check,
  ExternalLink,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  Link as LinkIcon,
  PlusCircle,
  Calendar,
} from 'lucide-react';
import {
  searchDriveSpreadsheets,
  getSpreadsheetDetails,
  DriveFileInfo,
  SpreadsheetInfo,
} from '../services/sheetsApi';
import { createMonthlySpreadsheet } from '../services/templateGenerator';

interface SheetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  currentSpreadsheetId: string | null;
  onSelectSpreadsheet: (sheetInfo: SpreadsheetInfo) => void;
}

export const SheetSelectorModal: React.FC<SheetSelectorModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  currentSpreadsheetId,
  onSelectSpreadsheet,
}) => {
  const [inputUrlOrId, setInputUrlOrId] = useState('');
  const [driveFiles, setDriveFiles] = useState<DriveFileInfo[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Month & Year selection for generator (defaults to current date e.g. Oct 2026)
  const [genMonth, setGenMonth] = useState<number>(() => new Date().getMonth());
  const [genYear, setGenYear] = useState<number>(() => new Date().getFullYear());
  const [showGenPanel, setShowGenPanel] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveFiles();
    }
  }, [isOpen, accessToken]);

  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setIsLoadingDrive(true);
    setErrorMsg(null);
    try {
      const files = await searchDriveSpreadsheets(accessToken);
      setDriveFiles(files);
    } catch (err: any) {
      console.warn('Could not auto-list drive files:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleGenerateSheet = async () => {
    if (!accessToken) {
      setErrorMsg('Silakan login dengan akun Google terlebih dahulu.');
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const newSheet = await createMonthlySpreadsheet(genMonth, genYear, accessToken);
      onSelectSpreadsheet(newSheet);
      onClose();
    } catch (err: any) {
      console.error('Failed to create monthly spreadsheet:', err);
      setErrorMsg(err.message || 'Gagal membuat file template spreadsheet baru.');
    } finally {
      setIsGenerating(false);
    }
  };

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const handleConnect = async (targetId: string) => {
    const cleanId = extractSpreadsheetId(targetId);
    if (!cleanId) {
      setErrorMsg('Masukkan Link atau ID Google Sheet terlebih dahulu.');
      return;
    }
    if (!accessToken) {
      setErrorMsg('Silakan login dengan Google terlebih dahulu.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const details = await getSpreadsheetDetails(cleanId, accessToken);
      onSelectSpreadsheet(details);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghubungkan ke Google Sheet tersebut.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  const monthNames = [
    'Januari (JANUARY)', 'Februari (FEBRUARY)', 'Maret (MARCH)', 'April (APRIL)',
    'Mei (MAY)', 'Juni (JUNE)', 'Juli (JULY)', 'Agustus (AUGUST)',
    'September (SEPTEMBER)', 'Oktober (OCTOBER)', 'November (NOVEMBER)', 'Desember (DECEMBER)'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base">Pilih atau Buat Google Sheet Kasir</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Automated Spreadsheet Generator Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Buat File Kasir Baru Otomatis</h3>
                  <p className="text-[11px] text-slate-600">
                    Aplikasi akan membuat spreadsheet lengkap di Google Drive Anda (4 tab transaksi, rumus bayar, total koin, &amp; COIN).
                  </p>
                </div>
              </div>
            </div>

            {showGenPanel ? (
              <div className="space-y-3 pt-2 border-t border-blue-200/60">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Pilih Bulan:</label>
                    <select
                      value={genMonth}
                      onChange={(e) => setGenMonth(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                    >
                      {monthNames.map((name, idx) => (
                        <option key={idx} value={idx}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Tahun:</label>
                    <input
                      type="number"
                      value={genYear}
                      onChange={(e) => setGenYear(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setShowGenPanel(false)}
                    className="text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleGenerateSheet}
                    disabled={isGenerating}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Membuat Spreadsheet di Drive...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Buat &amp; Buka Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowGenPanel(true)}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Buat File Bulan Ini di Google Drive</span>
              </button>
            )}
          </div>

          {/* Manual Input (URL / ID) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Atau Masukkan Link / ID Google Sheet Salinan:</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/... atau ID"
                value={inputUrlOrId}
                onChange={(e) => setInputUrlOrId(e.target.value)}
                className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <button
                onClick={() => handleConnect(inputUrlOrId)}
                disabled={isVerifying || !inputUrlOrId.trim()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {isVerifying ? 'Cek...' : 'Hubungkan'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drive Discovered Files List */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>File di Google Drive Anda:</span>
              </span>
              <button
                onClick={loadDriveFiles}
                disabled={isLoadingDrive}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                {isLoadingDrive ? 'Mencari...' : 'Refresh'}
              </button>
            </div>

            {isLoadingDrive ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat daftar spreadsheet dari Drive...
              </div>
            ) : driveFiles.length > 0 ? (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {driveFiles.map((file) => {
                  const isCurrent = file.id === currentSpreadsheetId;
                  const isKasirFile = file.name.toUpperCase().includes('KASIR') || file.name.toUpperCase().includes('TRCN');

                  return (
                    <button
                      key={file.id}
                      onClick={() => handleConnect(file.id)}
                      disabled={isVerifying}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                          : isKasirFile
                          ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-100/50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate mr-2">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            isCurrent
                              ? 'bg-emerald-500 text-white'
                              : isKasirFile
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs sm:text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                            <span className="truncate">{file.name}</span>
                            {isKasirFile && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                                TRCN
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            ID: {file.id}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5" /> Aktif
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0">
                          Pilih
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Tidak ada file spreadsheet yang terdeteksi otomatis. Silakan tempelkan link atau ID Google Sheet di kolom atas.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
