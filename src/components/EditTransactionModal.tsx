import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Coins,
  QrCode,
  Banknote,
  Split,
} from 'lucide-react';
import { SheetTransactionRow, TransactionInput } from '../services/sheetsApi';
import { formatRupiah } from '../utils/dateUtils';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: SheetTransactionRow | null;
  targetTabName: string;
  onSaveEdit: (rowNumber: number, data: TransactionInput) => Promise<void>;
  isSaving: boolean;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  targetTabName,
  onSaveEdit,
  isSaving,
}) => {
  if (!isOpen || !transaction) return null;

  const [customer, setCustomer] = useState(transaction.customer);
  const [phoneNumber, setPhoneNumber] = useState(transaction.phoneNumber);
  const [paymentMode, setPaymentMode] = useState<'QRIS' | 'CASH' | 'SPLIT'>(
    (transaction.paymentMode as any) || 'CASH'
  );
  const [paket, setPaket] = useState(transaction.paket);
  const [item, setItem] = useState(transaction.item);
  const [jumlah, setJumlah] = useState(transaction.jumlah);
  const [washerCoins, setWasherCoins] = useState(transaction.washerCoins);
  const [dryerCoins, setDryerCoins] = useState(transaction.dryerCoins);
  const [hargaCash, setHargaCash] = useState(transaction.hargaCash);
  const [hargaQris, setHargaQris] = useState(transaction.hargaQris);
  const [status, setStatus] = useState<'LUNAS' | 'TIDAK LUNAS'>(
    transaction.status.toUpperCase() === 'LUNAS' ? 'LUNAS' : 'TIDAK LUNAS'
  );
  const [note, setNote] = useState(transaction.note);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await onSaveEdit(transaction.rowNumber, {
        customer,
        phoneNumber,
        paymentMode,
        item,
        jumlah,
        paket,
        washerCoins,
        dryerCoins,
        hargaCash,
        hargaQris,
        status,
        note,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan transaksi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">
              Edit Transaksi #{transaction.slotNumber} (Baris {transaction.rowNumber})
            </h3>
            <p className="text-[11px] text-slate-400">Tab: {targetTabName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer & Phone */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer:</label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">No HP:</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Status & Payment Mode */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
              >
                <option value="LUNAS">✅ LUNAS</option>
                <option value="TIDAK LUNAS">⏳ TIDAK LUNAS / PENDING</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Metode Bayar:</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold bg-white"
              >
                <option value="QRIS">QRIS</option>
                <option value="CASH">CASH</option>
                <option value="SPLIT">SPLIT</option>
              </select>
            </div>
          </div>

          {/* Paket & Item */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Paket:</label>
              <input
                type="text"
                value={paket}
                onChange={(e) => setPaket(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Item Tambahan:</label>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="SOKLIN LIQUID 1K..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Qty & Amounts */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Jumlah Item:</label>
              <input
                type="text"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="1 atau 6.4"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-center font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Harga Cash (Rp):</label>
              <input
                type="number"
                value={hargaCash}
                onChange={(e) => setHargaCash(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Harga QRIS (Rp):</label>
              <input
                type="number"
                value={hargaQris}
                onChange={(e) => setHargaQris(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>
          </div>

          {/* Coins */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Koin Washer:</label>
              <input
                type="number"
                value={washerCoins}
                onChange={(e) => setWasherCoins(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-cyan-300 bg-cyan-50 font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Koin Dryer:</label>
              <input
                type="number"
                value={dryerCoins}
                onChange={(e) => setDryerCoins(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-orange-300 bg-orange-50 font-bold"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Note:</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs transition"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
