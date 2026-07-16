import React from 'react';
import { 
  Eye, 
  Edit3, 
  CheckCircle, 
  Trash2 
} from 'lucide-react';
import { usePhone } from '../context/PhoneContext';

export default function PhoneList({ setSelectedPhoneId, setOpenPhoneDetail }) {
  const {
    sortedAndFilteredPhones,
    requestSort,
    handleEditClick,
    handleSellClick,
    handleDeleteClick
  } = usePhone();

  const getStatusBadge = (status) => {
    const styles = {
      'Stokta': 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
      'Satışta': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
      'Tamirde': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/30',
      'Rezerve': 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-900/30',
      'Satıldı': 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-800/40'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles['Stokta']}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-bold tracking-wider select-none">
              <th onClick={() => requestSort('brand')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">Marka / Model</th>
              <th onClick={() => requestSort('imei1')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">IMEI / Seri No</th>
              <th onClick={() => requestSort('purchasePrice')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Alış Tutarı</th>
              <th onClick={() => requestSort('totalExpenses')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Yap. Masraf</th>
              <th onClick={() => requestSort('totalCost')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Maliyet</th>
              <th onClick={() => requestSort('salesPrice')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Satış Fiyatı</th>
              <th onClick={() => requestSort('profit')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-right">Kar / Zarar</th>
              <th onClick={() => requestSort('status')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-center">Durum</th>
              <th onClick={() => requestSort('waitingDays')} className="p-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-center">Bekleme</th>
              <th className="p-4 py-3.5 text-center no-print">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {sortedAndFilteredPhones.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-8 text-center text-slate-400 font-medium">
                  Kayıtlı telefon bulunamadı. Stok ekleyerek başlayabilirsiniz.
                </td>
              </tr>
            ) : (
              sortedAndFilteredPhones.map((phone) => (
                <tr 
                  key={phone.id}
                  onClick={() => {
                    setSelectedPhoneId(phone.id);
                    setOpenPhoneDetail(true);
                  }}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors cursor-pointer"
                >
                  {/* Brand / Model */}
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                    <div>{phone.brand} {phone.model}</div>
                    <div className="text-[10px] text-slate-450 font-normal">
                      {phone.storage}
                      {phone.ram ? ` / ${phone.ram}` : ''}
                      {phone.color ? ` / ${phone.color}` : ''}
                    </div>
                    {phone.changedParts && phone.changedParts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 font-normal">
                        {phone.changedParts.map((part, index) => (
                          <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20 dark:border-amber-900/30">
                            {part}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* IMEI / S/N */}
                  <td className="p-4 text-slate-600 dark:text-slate-400">
                    <div>1: {phone.imei1}</div>
                    {phone.imei2 && <div className="text-[10px]">2: {phone.imei2}</div>}
                    {phone.serialNumber && <div className="text-[10px] text-indigo-500 font-medium">S/N: {phone.serialNumber}</div>}
                  </td>
                  {/* Purchase Price */}
                  <td className="p-4 text-right text-slate-700 dark:text-slate-350">
                    {phone.purchasePrice.toLocaleString('tr-TR')} TL
                  </td>
                  {/* Expenses */}
                  <td className="p-4 text-right text-slate-500">
                    {phone.totalExpenses > 0 ? (
                      <span className="text-amber-600 font-semibold">{phone.totalExpenses.toLocaleString('tr-TR')} TL</span>
                    ) : (
                      <span className="text-slate-440 dark:text-slate-500">-</span>
                    )}
                  </td>
                  {/* Total Cost */}
                  <td className="p-4 text-right font-bold text-slate-800 dark:text-white">
                    {phone.totalCost.toLocaleString('tr-TR')} TL
                  </td>
                  {/* Sales Price */}
                  <td className="p-4 text-right text-slate-800 dark:text-slate-200 font-medium">
                    {phone.status === 'Satıldı' ? (
                      <span>{phone.salesPrice.toLocaleString('tr-TR')} TL</span>
                    ) : (
                      <span className="text-slate-440 dark:text-slate-500 italic">-</span>
                    )}
                  </td>
                  {/* Profit */}
                  <td className="p-4 text-right font-bold">
                    {phone.status === 'Satıldı' ? (
                      <span className={phone.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                        {phone.profit >= 0 ? '+' : ''}{phone.profit.toLocaleString('tr-TR')} TL
                      </span>
                    ) : (
                      <span className="text-slate-440 dark:text-slate-500">-</span>
                    )}
                  </td>
                  {/* Status */}
                  <td className="p-4 text-center">
                    {getStatusBadge(phone.status)}
                  </td>
                  {/* Waiting days */}
                  <td className="p-4 text-center">
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${
                      phone.status === 'Satıldı'
                        ? 'text-slate-440 dark:text-slate-500' 
                        : phone.daysInStock > 30 
                          ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' 
                          : 'text-slate-500'
                    }`}>
                      {phone.daysInStock} Gün
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="p-4 text-center space-x-1 whitespace-nowrap no-print" onClick={(e) => e.stopPropagation()}>
                    {/* Detail View */}
                    <button
                      onClick={() => {
                        setSelectedPhoneId(phone.id);
                        setOpenPhoneDetail(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                      title="Detaylar"
                    >
                      <Eye size={13} />
                    </button>

                    {/* Edit (only if not sold) */}
                    {phone.status !== 'Satıldı' && (
                      <>
                        <button
                          onClick={() => handleEditClick(phone)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-500 hover:text-amber-600 transition cursor-pointer"
                          title="Düzenle"
                        >
                          <Edit3 size={13} />
                        </button>
                        
                        <button
                          onClick={() => handleSellClick(phone)}
                          className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                          title="Satıldı Yap"
                        >
                          <CheckCircle size={13} />
                        </button>
                      </>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteClick(phone.id)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-650 transition cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
