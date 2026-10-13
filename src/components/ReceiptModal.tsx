import React, { useRef } from 'react';
import {
  Printer,
  Download,
  Share2,
  X,
  CheckCircle2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { SheetTransactionRow } from '../services/sheetsApi';
import { formatIndonesianDate, formatRupiah } from '../utils/dateUtils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: SheetTransactionRow | null;
  selectedDate: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  selectedDate,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transaction) return null;

  const totalBayar =
    transaction.bayar || transaction.hargaCash + transaction.hargaQris;
  const isLunas = transaction.status.toUpperCase() === 'LUNAS';
  const receiptNo = `TRCN-${selectedDate.replace(/-/g, '')}-${String(
    transaction.slotNumber
  ).padStart(3, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = () => {
    if (!receiptRef.current) return;
    const canvas = document.createElement('canvas');
    const scale = 2; // high resolution
    const width = 400;
    const height = 560;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Border line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Header
    ctx.fillStyle = '#0b1329';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRICOINS LAUNDRY', width / 2, 45);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('Self-Service Coin Laundromat', width / 2, 62);
    ctx.fillText('NMID: ID1020261928371 • 07:00 - 21:00 WIB', width / 2, 78);

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(25, 95);
    ctx.lineTo(width - 25, 95);
    ctx.stroke();
    ctx.setLineDash([]);

    // Info details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = '11px sans-serif';
    ctx.fillText(`No. Struk : ${receiptNo}`, 25, 115);
    ctx.fillText(`Tanggal   : ${formatIndonesianDate(selectedDate)}`, 25, 133);
    ctx.fillText(`Pelanggan : ${transaction.customer || 'Pelanggan'}`, 25, 151);
    if (transaction.phoneNumber) {
      ctx.fillText(`No. HP    : ${transaction.phoneNumber}`, 25, 169);
    }

    // Divider
    ctx.beginPath();
    ctx.moveTo(25, 185);
    ctx.lineTo(width - 25, 185);
    ctx.stroke();

    // Items
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('RINCIAN PESANAN', 25, 205);

    ctx.font = '12px sans-serif';
    ctx.fillText(transaction.paket || 'CUCI + KERING', 25, 228);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(totalBayar), width - 25, 228);

    ctx.textAlign = 'left';
    let yPos = 250;
    if (transaction.washerCoins > 0 || transaction.dryerCoins > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(
        `Koin: ${transaction.washerCoins} Washer + ${transaction.dryerCoins} Dryer`,
        25,
        yPos
      );
      yPos += 18;
    }

    if (transaction.item) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(`Tambahan: ${transaction.item} (${transaction.jumlah || '1'})`, 25, yPos);
      yPos += 18;
    }

    if (transaction.note) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 10px sans-serif';
      ctx.fillText(`Note: ${transaction.note}`, 25, yPos);
      yPos += 18;
    }

    // Divider
    ctx.beginPath();
    ctx.moveTo(25, yPos + 10);
    ctx.lineTo(width - 25, yPos + 10);
    ctx.stroke();

    // Payment details
    yPos += 30;
    ctx.fillStyle = '#334155';
    ctx.font = '11px sans-serif';
    ctx.fillText('Metode Bayar', 25, yPos);
    ctx.textAlign = 'right';
    ctx.fillText(transaction.paymentMode || 'CASH', width - 25, yPos);

    yPos += 22;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('TOTAL BAYAR', 25, yPos);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1d4ed8';
    ctx.fillText(formatRupiah(totalBayar), width - 25, yPos);

    // Status stamp
    yPos += 35;
    ctx.fillStyle = isLunas ? '#059669' : '#d97706';
    ctx.strokeStyle = isLunas ? '#059669' : '#d97706';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(width / 2 - 60, yPos - 18, 120, 26);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isLunas ? 'LUNAS' : 'PENDING', width / 2, yPos);

    // Footer
    yPos += 45;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('Terima kasih telah mencuci di TRICOINS!', width / 2, yPos);
    ctx.fillText('Pakaian Bersih, Wangi & Bebas Kuman', width / 2, yPos + 14);

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Struk_${receiptNo}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShareWhatsApp = () => {
    const text = `*STRUK PEMBAYARAN TRICOINS LAUNDRY*
No. Struk: ${receiptNo}
Tanggal: ${formatIndonesianDate(selectedDate)}
Pelanggan: ${transaction.customer}

Rincian Layanan:
- Paket: ${transaction.paket || 'Cuci + Kering'}
- Koin: ${transaction.washerCoins} Washer, ${transaction.dryerCoins} Dryer
${transaction.item ? `- Item: ${transaction.item}` : ''}
Metode Bayar: ${transaction.paymentMode}
*Total: ${formatRupiah(totalBayar)}*
Status: *${isLunas ? 'LUNAS' : 'PENDING'}*

Terima kasih atas kunjungan Anda di TRICOINS LAUNDRY!`;

    const cleanPhone = (transaction.phoneNumber || '').replace(/[^0-9]/g, '');
    let targetUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (cleanPhone.startsWith('08')) {
      const intlPhone = `62${cleanPhone.slice(1)}`;
      targetUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
    }
    window.open(targetUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-xs sm:text-sm">Struk Pembayaran Pelanggan</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            ref={receiptRef}
            id="printable-receipt"
            className="w-full max-w-[340px] bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-xs font-mono text-slate-800 space-y-3"
          >
            {/* Header & Logo */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300">
              <div className="w-12 h-12 mx-auto rounded-xl bg-white p-0.5 border border-slate-200 overflow-hidden shadow-xs">
                <img
                  src="/logo.jpg"
                  alt="TRICOINS"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <h3 className="font-black text-sm tracking-tight text-slate-900">
                TRICOINS LAUNDRY
              </h3>
              <p className="text-[10px] text-slate-500 font-sans">
                Self-Service Coin Laundromat • Bandung
              </p>
              <p className="text-[9px] text-slate-400 font-sans">
                Buka 07:00 - 21:00 WIB • NMID: ID1020261928371
              </p>
            </div>

            {/* Receipt Meta */}
            <div className="text-[11px] space-y-0.5 pt-1 text-slate-600">
              <div className="flex justify-between">
                <span>No. Struk:</span>
                <span className="font-bold text-slate-900">{receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatIndonesianDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold text-slate-900">{transaction.customer}</span>
              </div>
              {transaction.phoneNumber && (
                <div className="flex justify-between">
                  <span>No. HP:</span>
                  <span>{transaction.phoneNumber}</span>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="py-2 border-t border-b border-dashed border-slate-300 space-y-1.5">
              <div className="flex justify-between items-start font-bold text-slate-900 text-xs">
                <span>{transaction.paket || 'CUCI + KERING'}</span>
                <span>{formatRupiah(totalBayar)}</span>
              </div>

              {(transaction.washerCoins > 0 || transaction.dryerCoins > 0) && (
                <div className="text-[10px] text-slate-500 font-sans">
                  Koin Mesin: {transaction.washerCoins} Washer, {transaction.dryerCoins} Dryer
                </div>
              )}

              {transaction.item && (
                <div className="text-[10px] text-slate-500 font-sans">
                  Item Retail: {transaction.item} ({transaction.jumlah || '1'})
                </div>
              )}

              {transaction.note && (
                <div className="text-[10px] text-slate-400 italic font-sans">
                  Catatan: {transaction.note}
                </div>
              )}
            </div>

            {/* Payment Summary */}
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Metode Bayar:</span>
                <span className="font-bold text-slate-900">{transaction.paymentMode}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1">
                <span>TOTAL:</span>
                <span className="text-blue-700">{formatRupiah(totalBayar)}</span>
              </div>
            </div>

            {/* Stamp Lunas */}
            <div className="text-center pt-2">
              <span
                className={`inline-block px-3 py-1 rounded-md border-2 font-black text-xs uppercase tracking-wider ${
                  isLunas
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                    : 'border-amber-600 text-amber-700 bg-amber-50'
                }`}
              >
                {isLunas ? '✓ LUNAS' : 'PENDING'}
              </span>
            </div>

            {/* Receipt Footer */}
            <div className="text-center text-[10px] text-slate-400 font-sans pt-2 border-t border-dashed border-slate-300 space-y-0.5">
              <p>Terima kasih telah mencuci di TRICOINS!</p>
              <p>Pakaian bersih, harum, dan higienis.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons with Tactile Feedback */}
        <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-3 gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center space-x-1 py-2 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadImage}
            className="flex items-center justify-center space-x-1 py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF/PNG</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center space-x-1 py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all transform active:scale-95 active:brightness-95 hover:shadow-md cursor-pointer select-none"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
