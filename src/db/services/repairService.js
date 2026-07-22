import { STORAGE_KEYS, getJson, saveJson, generateUUID, safeNumber, round2 } from './shared';
import { partService } from './partService';

export const repairService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.REPAIRS, []);
  },

  getById: (id) => {
    const repairs = repairService.getAll();
    return repairs.find(r => r.id === id) || null;
  },

  save: async (repairData) => {
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    const isEdit = Boolean(repairData.id);
    const repairId = repairData.id || generateUUID();
    const oldRepair = isEdit ? repairs.find(r => r.id === repairId) : null;

    // Normalize usedParts
    const newUsedParts = (repairData.usedParts || []).map(p => ({
      id: p.id || generateUUID(),
      partId: p.partId || '',
      nameSnapshot: p.nameSnapshot || p.name || 'Parça',
      quantity: safeNumber(p.quantity) || 1,
      unitCostSnapshot: safeNumber(p.unitCostSnapshot || p.unitCost || p.purchasePrice),
      unitSalePrice: safeNumber(p.unitSalePrice || p.price),
      lineTotal: round2(safeNumber(p.quantity || 1) * safeNumber(p.unitSalePrice || p.price))
    }));

    const oldUsedParts = oldRepair ? (oldRepair.usedParts || []).map(p => ({
      ...p,
      quantity: safeNumber(p.quantity) || 1
    })) : [];

    // Track stock adjustments per partId
    // delta = newQty - oldQty (positive means more used -> deduct from stock)
    const partDeltas = {};

    // 1. Process old parts
    oldUsedParts.forEach(op => {
      if (op.partId) {
        partDeltas[op.partId] = (partDeltas[op.partId] || 0) - op.quantity;
      }
    });

    // 2. Process new parts
    newUsedParts.forEach(np => {
      if (np.partId) {
        partDeltas[np.partId] = (partDeltas[np.partId] || 0) + np.quantity;
      }
    });

    // 3. Pre-validate stock availability before modifying anything
    for (const [partId, delta] of Object.entries(partDeltas)) {
      if (delta > 0) {
        const part = partService.getById(partId);
        if (!part) {
          throw new Error(`Seçilen parça (ID: ${partId}) stoğumuzda bulunamadı.`);
        }
        if (part.quantity < delta) {
          throw new Error(`Stok yetersiz! "${part.name}" için mevcut stok: ${part.quantity}, gerekli ilave miktar: ${delta}`);
        }
      }
    }

    // 4. Apply stock adjustments safely
    for (const [partId, delta] of Object.entries(partDeltas)) {
      if (delta !== 0) {
        await partService.adjustStock(partId, -delta, {
          sourceType: 'repair',
          sourceId: repairId,
          description: delta > 0 
            ? `Tamir için stok düşümü (${repairData.defect || 'Tamir'})`
            : `Tamir güncellemesinden stoğa iade`
        });
      }
    }

    // 5. Calculate total costs and prices
    const partsCostTotal = newUsedParts.reduce((sum, p) => sum + round2(p.quantity * p.unitCostSnapshot), 0);
    const partsSaleTotal = newUsedParts.reduce((sum, p) => sum + p.lineTotal, 0);
    const laborFee = safeNumber(repairData.laborFee || 0);
    
    // Total price to customer = parts sales + labor
    const totalPrice = repairData.totalPrice !== undefined 
      ? safeNumber(repairData.totalPrice)
      : round2(partsSaleTotal + laborFee);

    const updatedRepairData = {
      ...repairData,
      id: repairId,
      usedParts: newUsedParts,
      laborFee,
      partsCostTotal,
      partsSaleTotal,
      totalPrice,
      cost: safeNumber(repairData.cost || partsCostTotal),
      updatedAt: new Date().toISOString()
    };

    let updatedRepairs;
    if (isEdit) {
      updatedRepairs = repairs.map(r => r.id === repairId ? updatedRepairData : r);
    } else {
      updatedRepairData.createdAt = new Date().toISOString();
      updatedRepairs = [updatedRepairData, ...repairs];
    }

    // Update associated phone status & expense if linked
    if (repairData.phoneId) {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const updatedPhones = phones.map(p => {
        if (p.id === repairData.phoneId) {
          let updatedExpenses = p.expenses || [];
          const existingExpIdx = updatedExpenses.findIndex(e => e.id === `rep-exp-${repairId}`);
          
          const expObject = {
            id: `rep-exp-${repairId}`,
            name: `Tamir Gideri (${repairData.defect || 'Cihaz Onarımı'})`,
            amount: safeNumber(repairData.cost || partsCostTotal),
            date: new Date().toISOString().split('T')[0]
          };
          
          if (existingExpIdx >= 0) {
            updatedExpenses[existingExpIdx] = expObject;
          } else {
            updatedExpenses.push(expObject);
          }
          
          const isDone = repairData.status === 'Teslim Edildi' || repairData.status === 'Hazır';
          return {
            ...p,
            status: isDone ? 'Stokta' : 'Serviste',
            expenses: updatedExpenses
          };
        }
        return p;
      });
      await saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    }

    await saveJson(STORAGE_KEYS.REPAIRS, updatedRepairs);
    return updatedRepairData;
  },

  delete: async (id) => {
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    const repair = repairs.find(r => r.id === id);
    if (!repair) return true;

    // Return all used stock parts back to inventory
    const usedParts = repair.usedParts || [];
    for (const p of usedParts) {
      if (p.partId && p.quantity > 0) {
        try {
          await partService.adjustStock(p.partId, p.quantity, {
            sourceType: 'repair_cancellation',
            sourceId: id,
            description: `İptal edilen tamir sonrası stoğa iade (${repair.defect || ''})`
          });
        } catch (err) {
          console.error(`Part restore error on repair delete for part ${p.partId}:`, err);
        }
      }
    }

    await saveJson(STORAGE_KEYS.REPAIRS, repairs.filter(r => r.id !== id));
    
    if (repair.phoneId) {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const updatedPhones = phones.map(p => {
        if (p.id === repair.phoneId) {
          return {
            ...p,
            status: (p.status === 'Serviste' || p.status === 'Tamirde') ? 'Stokta' : p.status,
            expenses: (p.expenses || []).filter(e => e.id !== `rep-exp-${id}`)
          };
        }
        return p;
      });
      await saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    }
    return true;
  }
};
