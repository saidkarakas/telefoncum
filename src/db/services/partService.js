import { STORAGE_KEYS, getJson, saveJson, generateUUID, parseNumber, validateNonNegative } from './shared';
import { stockMovementService } from './stockMovementService';

export const PART_CATEGORIES = [
  'Ekran',
  'Batarya',
  'Kamera',
  'Şarj Soketi',
  'Hoparlör',
  'Mikrofon',
  'Kasa',
  'Arka Kapak',
  'Flex',
  'Entegre',
  'Vida ve Küçük Parça',
  'Aksesuar',
  'Diğer'
];

export const partService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.PARTS, []);
  },

  getById: (id) => {
    if (!id) return null;
    const parts = partService.getAll();
    return parts.find(p => p.id === id) || null;
  },

  findByBarcode: (barcode) => {
    if (!barcode) return null;
    const parts = partService.getAll();
    const cleanBar = String(barcode).trim();
    return parts.find(p => p.barcode && String(p.barcode).trim() === cleanBar) || null;
  },

  getLowStockParts: () => {
    const parts = partService.getAll();
    return parts.filter(p => p.quantity <= (p.minQuantity || 0));
  },

  search: (query) => {
    if (!query) return partService.getAll();
    const q = String(query).trim().toLowerCase();
    const parts = partService.getAll();
    return parts.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.compatibleModels && p.compatibleModels.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  },

  save: async (partData) => {
    const parts = getJson(STORAGE_KEYS.PARTS, []);
    
    // Check barcode duplicate if provided
    if (partData.barcode) {
      const dup = parts.find(p => p.id !== partData.id && p.barcode && String(p.barcode).trim() === String(partData.barcode).trim());
      if (dup) {
        throw new Error(`Bu barkod numarası başka bir parçada tanımlı: ${dup.name} (${dup.code || ''})`);
      }
    }

    let updated;
    const cleanQty = validateNonNegative(partData.quantity || 0, 'Stok Miktarı');
    const cleanMinQty = validateNonNegative(partData.minQuantity || 0, 'Minimum Stok Miktarı');
    const purchasePrice = validateNonNegative(partData.purchasePrice || 0, 'Parça Alış Fiyatı');
    const salePrice = validateNonNegative(partData.salePrice || 0, 'Parça Satış Fiyatı');
    const exists = partData.id ? parts.some(p => p.id === partData.id) : false;

    if (exists) {
      const existing = parts.find(p => p.id === partData.id);
      const prevQty = existing ? existing.quantity : 0;
      
      updated = parts.map(p => p.id === partData.id ? { 
        ...p, 
        ...partData,
        quantity: cleanQty,
        minQuantity: cleanMinQty,
        purchasePrice,
        salePrice,
        updatedAt: new Date().toISOString()
      } : p);

      if (existing && prevQty !== cleanQty) {
        const diff = cleanQty - prevQty;
        await stockMovementService.record({
          itemType: 'part',
          itemId: partData.id,
          movementType: diff > 0 ? 'in' : 'out',
          quantity: Math.abs(diff),
          previousQuantity: prevQty,
          newQuantity: cleanQty,
          unitCost: purchasePrice,
          sourceType: 'manual',
          description: `Manuel Stok Güncellemesi (${diff > 0 ? '+' : ''}${diff})`
        });
      }
    } else {
      const newPartId = partData.id || generateUUID();
      const newPart = {
        ...partData,
        id: newPartId,
        code: partData.code || `PRT-${Date.now().toString().slice(-6)}`,
        barcode: partData.barcode || '',
        name: (partData.name || 'Yeni Parça').trim(),
        category: partData.category || 'Diğer',
        brand: partData.brand || '',
        compatibleModels: partData.compatibleModels || '',
        supplierId: partData.supplierId || '',
        supplierName: partData.supplierName || '',
        purchasePrice,
        salePrice,
        quantity: cleanQty,
        minQuantity: cleanMinQty,
        location: partData.location || '',
        notes: partData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updated = [newPart, ...parts];

      if (cleanQty > 0) {
        await stockMovementService.record({
          itemType: 'part',
          itemId: newPartId,
          movementType: 'in',
          quantity: cleanQty,
          previousQuantity: 0,
          newQuantity: cleanQty,
          unitCost: purchasePrice,
          sourceType: 'manual',
          description: 'İlk Stok Girişi'
        });
      }
    }

    await saveJson(STORAGE_KEYS.PARTS, updated);
    return true;
  },

  adjustStock: async (partId, deltaQuantity, movementInfo = {}) => {
    const parts = getJson(STORAGE_KEYS.PARTS, []);
    const partIndex = parts.findIndex(p => p.id === partId);
    if (partIndex === -1) {
      throw new Error(`Stok parçası (ID: ${partId}) bulunamadı.`);
    }

    const part = parts[partIndex];
    const prevQty = parseNumber(part.quantity);
    const delta = parseNumber(deltaQuantity);
    const newQty = prevQty + delta;

    if (newQty < 0) {
      throw new Error(`Stok yetersiz! "${part.name}" parçası için mevcut stok: ${prevQty}, talep edilen: ${Math.abs(delta)}`);
    }

    const updatedPart = {
      ...part,
      quantity: newQty,
      updatedAt: new Date().toISOString()
    };

    const updatedParts = [...parts];
    updatedParts[partIndex] = updatedPart;

    await saveJson(STORAGE_KEYS.PARTS, updatedParts);

    await stockMovementService.record({
      itemType: 'part',
      itemId: partId,
      movementType: movementInfo.movementType || (delta >= 0 ? 'in' : 'out'),
      quantity: Math.abs(delta),
      previousQuantity: prevQty,
      newQuantity: newQty,
      unitCost: part.purchasePrice,
      sourceType: movementInfo.sourceType || 'manual',
      sourceId: movementInfo.sourceId || '',
      description: movementInfo.description || `Stok Düzeltmesi (${delta >= 0 ? '+' : ''}${delta})`
    });

    return updatedPart;
  },

  delete: async (id) => {
    const parts = getJson(STORAGE_KEYS.PARTS, []);
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    
    // Check if part is referenced in any repair
    const usedInRepair = repairs.some(r => 
      (r.usedParts || []).some(p => p.partId === id)
    );

    if (usedInRepair) {
      throw new Error("Bu parça tamir kayıtlarında kullanıldığı için tamamen silinemez. Stok miktarını 0 yapabilirsiniz.");
    }

    await saveJson(STORAGE_KEYS.PARTS, parts.filter(p => p.id !== id));
    return true;
  }
};
