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

  const [shareFeedback, setShareFeedback] = React.useState<string | null>(null);
  const [isGeneratingImg, setIsGeneratingImg] = React.useState(false);

  const generateReceiptCanvas = (): HTMLCanvasElement | null => {
    const canvas = document.createElement('canvas');
    const scale = 2; // high resolution
    const width = 420;
    const height = 580;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // Card background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Outer subtle border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Deep Navy Header Box
    ctx.fillStyle = '#0b1329';
    ctx.fillRect(10, 10, width - 20, 85);

    // Header Text
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRICOINS LAUNDROMAT', width / 2, 35);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('STRUK TRANSAKSI RESMI', width / 2, 58);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Self-Service Coin Laundromat • Buka 07:00 - 21:00 WIB', width / 2, 78);

    // Order Info Details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText(`No. Struk : ${receiptNo}`, 25, 120);
    ctx.fillText(`Tanggal   : ${formatIndonesianDate(selectedDate)}`, 25, 138);
    ctx.fillText(`Pelanggan : ${transaction.customer || 'Pelanggan'}`, 25, 156);
    if (transaction.phoneNumber) {
      ctx.fillText(`No. HP    : ${transaction.phoneNumber}`, 25, 174);
    }

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(25, 190);
    ctx.lineTo(width - 25, 190);
    ctx.stroke();
    ctx.setLineDash([]);

    // Items Section
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('RINCIAN PESANAN', 25, 212);

    ctx.font = '12px sans-serif';
    ctx.fillText(transaction.paket || 'CUCI + KERING', 25, 235);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(totalBayar), width - 25, 235);

    ctx.textAlign = 'left';
    let yPos = 258;
    if (transaction.washerCoins > 0 || transaction.dryerCoins > 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(
        `• Koin Mesin: ${transaction.washerCoins} Washer + ${transaction.dryerCoins} Dryer`,
        25,
        yPos
      );
      yPos += 18;
    }

    if (transaction.item) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(`• Item Tambahan: ${transaction.item} (${transaction.jumlah || '1'})`, 25, yPos);
      yPos += 18;
    }

    if (transaction.note) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 10px sans-serif';
      ctx.fillText(`• Catatan: ${transaction.note}`, 25, yPos);
      yPos += 18;
    }

    // Divider
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(25, yPos + 10);
    ctx.lineTo(width - 25, yPos + 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Payment details
    yPos += 32;
    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText('Metode Pembayaran', 25, yPos);
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(transaction.paymentMode || 'CASH', width - 25, yPos);

    yPos += 24;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('TOTAL BAYAR', 25, yPos);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2563eb';
    ctx.fillText(formatRupiah(totalBayar), width - 25, yPos);

    // Status stamp box
    yPos += 36;
    ctx.fillStyle = isLunas ? '#f0fdf4' : '#fffbeb';
    ctx.strokeStyle = isLunas ? '#16a34a' : '#d97706';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if ((ctx as any).roundRect) {
      (ctx as any).roundRect(width / 2 - 70, yPos - 18, 140, 28, 6);
    } else {
      ctx.rect(width / 2 - 70, yPos - 18, 140, 28);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isLunas ? '#15803d' : '#b45309';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isLunas ? '✓ LUNAS' : 'PENDING', width / 2, yPos);

    // Footer
    yPos += 45;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('Terima kasih telah mencuci di TRICOINS LAUNDRY!', width / 2, yPos);
    ctx.fillText('Pakaian Bersih, Harum & Bebas Bakteri', width / 2, yPos + 14);

    return canvas;
  };

  const getReceiptBlob = async (): Promise<Blob | null> => {
    const canvas = generateReceiptCanvas();
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  };

  const handleDownloadImage = () => {
    const canvas = generateReceiptCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Struk_${receiptNo}.png`;
    link.href = dataUrl;
    link.click();
    setShareFeedback('✓ File gambar struk PNG telah diunduh!');
    setTimeout(() => setShareFeedback(null), 4000);
  };

  const handleCopyReceiptImage = async () => {
    try {
      setIsGeneratingImg(true);
      const blob = await getReceiptBlob();
      if (!blob) throw new Error('Gagal merender struk');

      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setShareFeedback('✓ Foto struk berhasil disalin! Anda bisa langsung Paste (Ctrl+V) di WhatsApp.');
      } else {
        handleDownloadImage();
      }
    } catch (err) {
      handleDownloadImage();
    } finally {
      setIsGeneratingImg(false);
      setTimeout(() => setShareFeedback(null), 5000);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsGeneratingImg(true);
    const text = `*STRUK PEMBAYARAN RESMI TRICOINS LAUNDRY*
No. Struk: ${receiptNo}
Tanggal: ${formatIndonesianDate(selectedDate)}
Pelanggan: ${transaction.customer}

Rincian Pesanan:
- Paket: ${transaction.paket || 'Cuci + Kering'}
- Koin Mesin: ${transaction.washerCoins} Washer, ${transaction.dryerCoins} Dryer
${transaction.item ? `- Item Retail: ${transaction.item}` : ''}
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

    try {
      const blob = await getReceiptBlob();
      if (blob) {
        const file = new File([blob], `Struk_${receiptNo}.png`, { type: 'image/png' });

        // 1. Try Native Web Share API with image file (works on Android / iOS / supported desktop)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Struk TRICOINS - ${transaction.customer}`,
            text: text,
            files: [file],
          });
          setIsGeneratingImg(false);
          return;
        }

        // 2. Fallback: Copy image to clipboard so cashier can immediately Ctrl+V in WhatsApp chat
        try {
          if (navigator.clipboard && (window as any).ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          }
        } catch (e) {
          // Ignore clipboard permission issue
        }

        // 3. Download the PNG file automatically
        const link = document.createElement('a');
        link.download = `Struk_${receiptNo}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    } catch (err) {
      console.warn('Share error fallback:', err);
    } finally {
      setIsGeneratingImg(false);
    }

    setShareFeedback(
      '✓ Foto struk telah disalin ke clipboard & diunduh! Cukup tekan Tempel/Paste (Ctrl+V) di chat WhatsApp customer.'
    );
    const safeLink = document.createElement('a');
    safeLink.href = targetUrl;
    safeLink.target = '_blank';
    safeLink.rel = 'noopener noreferrer';
    document.body.appendChild(safeLink);
    safeLink.click();
    document.body.removeChild(safeLink);
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

        {/* Feedback Alert for WhatsApp Image Share */}
        {shareFeedback && (
          <div className="px-4 py-2.5 bg-emerald-50 border-t border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{shareFeedback}</span>
          </div>
        )}

        {/* Action Buttons with Tactile Feedback */}
        <div className="p-3 bg-white border-t border-slate-200 space-y-2">
          {/* Main WhatsApp Photo Share Button */}
          <button
            onClick={handleShareWhatsApp}
            disabled={isGeneratingImg}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all transform active:scale-95 active:brightness-95 hover:shadow-lg cursor-pointer select-none"
          >
            {isGeneratingImg ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyiapkan Foto Struk...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Kirim Foto Struk ke WhatsApp</span>
              </>
            )}
          </button>

          {/* Secondary Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleCopyReceiptImage}
              disabled={isGeneratingImg}
              className="flex items-center justify-center space-x-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all transform active:scale-95 active:brightness-95 cursor-pointer select-none"
              title="Salin foto struk ke clipboard agar bisa langsung di-paste"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Salin Foto</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="flex items-center justify-center space-x-1 py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all transform active:scale-95 active:brightness-95 cursor-pointer select-none"
              title="Unduh foto struk PNG beresolusi tinggi"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PNG</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center space-x-1 py-2 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all transform active:scale-95 active:brightness-95 cursor-pointer select-none"
              title="Cetak struk ke printer thermal / fisik"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
