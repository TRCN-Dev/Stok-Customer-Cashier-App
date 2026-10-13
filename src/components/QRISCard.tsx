import React, { useState, useEffect } from 'react';
import { QrCode, Download, Upload, ZoomIn, Check, RotateCcw, Lock, ShieldCheck } from 'lucide-react';
import { formatRupiah } from '../utils/dateUtils';

interface QRISCardProps {
  amount?: number;
  customerName?: string;
  isCompact?: boolean;
  isAdmin?: boolean;
}

export const QRISCard: React.FC<QRISCardProps> = ({
  amount,
  customerName,
  isCompact = false,
  isAdmin = false,
}) => {
  const [qrisImage, setQrisImage] = useState<string | null>(() => {
    return (
      localStorage.getItem('trcn_admin_sticky_qris') ||
      localStorage.getItem('trcn_qris_image') ||
      null
    );
  });
  const [isZoomed, setIsZoomed] = useState(false);

  // Sync state if storage updates in another component or tab
  useEffect(() => {
    const handleStorageChange = () => {
      const saved =
        localStorage.getItem('trcn_admin_sticky_qris') ||
        localStorage.getItem('trcn_qris_image');
      setQrisImage(saved || null);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setQrisImage(base64);
        // Persist permanently as the sticky Admin QRIS for production & live use
        localStorage.setItem('trcn_admin_sticky_qris', base64);
        localStorage.setItem('trcn_qris_image', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetQRIS = () => {
    if (!isAdmin) return;
    if (confirm('Hapus foto QRIS toko dan kembali ke QRIS default?')) {
      localStorage.removeItem('trcn_admin_sticky_qris');
      localStorage.removeItem('trcn_qris_image');
      setQrisImage(null);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-b from-blue-50 to-white rounded-2xl border border-blue-200 p-3.5 shadow-sm space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                QRIS TRICOINS LAUNDRY
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                NMID: ID1020261928371 • GPN / BCA
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px]">
            {/* Only Admin can upload or edit the Sticky QRIS photo */}
            {isAdmin ? (
              <>
                <label className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-blue-700 font-bold hover:bg-blue-50 cursor-pointer transition-all transform active:scale-95 active:brightness-95 shadow-xs flex items-center gap-1 select-none">
                  <Upload className="w-3 h-3" />
                  <span>{qrisImage ? 'Ganti QRIS' : 'Upload QRIS'}</span>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
                {qrisImage && (
                  <button
                    type="button"
                    onClick={handleResetQRIS}
                    className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    title="Reset QRIS Default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>QRIS Resmi Toko</span>
              </span>
            )}
          </div>
        </div>

        {/* QR Code Container */}
        <div
          onClick={() => setIsZoomed(true)}
          className="relative max-w-[210px] mx-auto bg-white p-3 rounded-2xl border-2 border-dashed border-blue-300 shadow-sm cursor-pointer group hover:border-blue-500 transition-all text-center select-none"
        >
          {qrisImage ? (
            <img
              src={qrisImage}
              alt="QRIS TRICOINS"
              className="w-full h-auto object-contain rounded-xl max-h-[200px]"
            />
          ) : (
            <div className="space-y-1.5 py-2">
              {/* Fallback Standard SVG QRIS */}
              <div className="bg-slate-900 text-white p-1 rounded-md text-[9px] font-black uppercase tracking-wider inline-block">
                QRIS • PEMBAYARAN CEPAT
              </div>
              <svg
                width="140"
                height="140"
                viewBox="0 0 100 100"
                className="mx-auto bg-white p-1 rounded-lg"
              >
                {/* Corner markers */}
                <rect x="5" y="5" width="26" height="26" fill="#0b1329" rx="3" />
                <rect x="9" y="9" width="18" height="18" fill="#ffffff" rx="2" />
                <rect x="13" y="13" width="10" height="10" fill="#0b1329" rx="1" />

                <rect x="69" y="5" width="26" height="26" fill="#0b1329" rx="3" />
                <rect x="73" y="9" width="18" height="18" fill="#ffffff" rx="2" />
                <rect x="77" y="13" width="10" height="10" fill="#0b1329" rx="1" />

                <rect x="5" y="69" width="26" height="26" fill="#0b1329" rx="3" />
                <rect x="9" y="73" width="18" height="18" fill="#ffffff" rx="2" />
                <rect x="13" y="77" width="10" height="10" fill="#0b1329" rx="1" />

                {/* Data blocks */}
                <rect x="36" y="8" width="6" height="6" fill="#0b1329" />
                <rect x="46" y="8" width="6" height="6" fill="#0b1329" />
                <rect x="56" y="8" width="6" height="6" fill="#0b1329" />
                <rect x="36" y="18" width="6" height="6" fill="#0b1329" />
                <rect x="56" y="18" width="6" height="6" fill="#0b1329" />
                <rect x="36" y="28" width="6" height="6" fill="#0b1329" />
                <rect x="46" y="28" width="6" height="6" fill="#0b1329" />

                <rect x="10" y="38" width="6" height="6" fill="#0b1329" />
                <rect x="20" y="38" width="6" height="6" fill="#0b1329" />
                <rect x="38" y="38" width="24" height="24" fill="#1d4ed8" rx="4" />
                <rect x="70" y="38" width="6" height="6" fill="#0b1329" />
                <rect x="84" y="38" width="6" height="6" fill="#0b1329" />

                <rect x="10" y="48" width="6" height="6" fill="#0b1329" />
                <rect x="25" y="48" width="6" height="6" fill="#0b1329" />
                <circle cx="50" cy="50" r="6" fill="#ffffff" />
                <rect x="74" y="48" width="6" height="6" fill="#0b1329" />
                <rect x="84" y="48" width="6" height="6" fill="#0b1329" />

                <rect x="36" y="68" width="6" height="6" fill="#0b1329" />
                <rect x="48" y="68" width="6" height="6" fill="#0b1329" />
                <rect x="68" y="68" width="6" height="6" fill="#0b1329" />
                <rect x="80" y="68" width="6" height="6" fill="#0b1329" />
                <rect x="36" y="78" width="6" height="6" fill="#0b1329" />
                <rect x="56" y="78" width="6" height="6" fill="#0b1329" />
                <rect x="72" y="78" width="6" height="6" fill="#0b1329" />
                <rect x="84" y="78" width="6" height="6" fill="#0b1329" />
                <rect x="44" y="88" width="6" height="6" fill="#0b1329" />
                <rect x="64" y="88" width="6" height="6" fill="#0b1329" />
                <rect x="80" y="88" width="6" height="6" fill="#0b1329" />
              </svg>
              <div className="text-[10px] font-bold text-slate-700">TRICOINS LAUNDRY PPG</div>
            </div>
          )}

          <div className="absolute inset-0 bg-blue-900/10 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <span className="px-2 py-1 bg-white/95 rounded-lg text-[10px] font-bold text-blue-700 shadow-xs flex items-center gap-1">
              <ZoomIn className="w-3 h-3" /> Perbesar
            </span>
          </div>
        </div>

        {/* Amount & Instruction */}
        <div className="text-center pt-1 border-t border-blue-100">
          {amount !== undefined && amount > 0 && (
            <div className="text-base font-black text-slate-900">
              Total: {formatRupiah(amount)}
            </div>
          )}
          {customerName && (
            <div className="text-[11px] text-slate-600 font-medium">
              Pelanggan: <span className="font-bold text-slate-800">{customerName}</span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-0.5">
            Mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay
          </p>
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="bg-white p-6 rounded-3xl max-w-sm w-full text-center space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-slate-900">QRIS TRICOINS LAUNDRY</span>
              <button
                onClick={() => setIsZoomed(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition active:scale-95 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
              {qrisImage ? (
                <img
                  src={qrisImage}
                  alt="QRIS TRICOINS"
                  className="w-full h-auto object-contain rounded-xl max-h-[320px] mx-auto"
                />
              ) : (
                <div className="p-4">
                  <div className="bg-slate-900 text-white py-1 rounded text-[10px] font-black uppercase tracking-wider mb-2">
                    QRIS • STANDAR PEMBAYARAN NASIONAL
                  </div>
                  <div className="w-52 h-52 mx-auto bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-slate-800" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-2">TRICOINS LAUNDRY PPG</div>
                </div>
              )}
            </div>

            {amount !== undefined && amount > 0 && (
              <div className="text-xl font-black text-blue-700">
                {formatRupiah(amount)}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Silakan tunjukkan QR ini ke pelanggan untuk di-scan menggunakan m-Banking atau e-Wallet.
            </p>

            <button
              onClick={() => setIsZoomed(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all transform active:scale-95 active:brightness-95 cursor-pointer select-none"
            >
              Tutup QRIS
            </button>
          </div>
        </div>
      )}
    </>
  );
};
