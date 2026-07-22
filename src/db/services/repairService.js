import { STORAGE_KEYS, getJson, saveJson, generateUUID, parseNumber, validateNonNegative, round2 } from './shared';
import { partService } from './partService';
import { cashMovementService } from './cashMovementService';
import { mapPaymentMethod } from './installmentService';
import { runTransaction } from './transactionRunner';

export const repairService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.REPAIRS, []);
  },

  getById: (id) => {
    const repairs = repairService.getAll();
    return repairs.find(r => r.id === id) || null;
  },

  save: async (repairData) => {
    return await runTransaction(async () => {
      const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
      const isEdit = Boolean(repairData.id);
      const repairId = repairData.id || generateUUID();
      const oldRepair = isEdit ? repairs.find(r => r.id === repairId) : null;

      // Unify laborCost and laborFee (Requirement 14)
      const laborFee = validateNonNegative(
        repairData.laborFee !== undefined ? repairData.laborFee : (repairData.laborCost || 0),
        'İşçilik Ücreti'
      );

      // Support legacy spareParts [{ name, price }] and convert to usedParts if needed
      let rawParts = repairData.usedParts || [];
      if ((!rawParts || rawParts.length === 0) && repairData.spareParts && repairData.spareParts.length > 0) {
        rawParts = repairData.spareParts.map(p => ({
          partId: p.partId || '',
          nameSnapshot: p.name || 'Parça',
          quantity: 1,
          unitCostSnapshot: parseNumber(p.cost || 0),
          unitSalePrice: parseNumber(p.price || 0)
        }));
      }

      // Normalize usedParts
      const newUsedParts = (rawParts || []).map(p => {
        const qty = validateNonNegative(p.quantity || 1, 'Parça Adedi');
        const unitCost = parseNumber(p.unitCostSnapshot || p.unitCost || p.cost || 0);
        const unitSale = parseNumber(p.unitSalePrice || p.price || 0);
        return {
          id: p.id || generateUUID(),
          partId: p.partId || '',
          nameSnapshot: p.nameSnapshot || p.name || 'Parça',
          name: p.nameSnapshot || p.name || 'Parça',
          quantity: qty,
          unitCostSnapshot: unitCost,
          unitSalePrice: unitSale,
          price: unitSale,
          lineTotal: round2(qty * unitSale)
        };
      });

      const oldUsedParts = oldRepair ? (oldRepair.usedParts || []).map(p => ({
        ...p,
        quantity: parseNumber(p.quantity) || 1
      })) : [];

      // Track stock adjustments per partId
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

      // 3. Pre-validate stock availability
      for (const [partId, delta] of Object.entries(partDeltas)) {
        if (delta > 0) {
          const part = partService.getById(partId);
          if (!part) {
            throw new Error(`Seçilen parça (ID: ${partId}) stoğumuzda bulunamadı.`);
          }
          if (part.quantity < delta) {
            throw new Error(`Stok yetersiz! "${part.name}" için mevcut stok: ${part.quantity}, gerekli miktar: ${delta}`);
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

      // 5. Calculate totals
      const partsCostTotal = newUsedParts.reduce((sum, p) => sum + round2(p.quantity * p.unitCostSnapshot), 0);
      const partsSaleTotal = newUsedParts.reduce((sum, p) => sum + p.lineTotal, 0);
      const calculatedTotal = round2(partsSaleTotal + laborFee);
      const totalCost = repairData.cost !== undefined ? validateNonNegative(repairData.cost, 'Servis Masrafı') : calculatedTotal;

      const updatedRepairData = {
        ...repairData,
        id: repairId,
        usedParts: newUsedParts,
        spareParts: newUsedParts.map(p => ({ name: p.nameSnapshot, price: p.unitSalePrice, partId: p.partId })),
        laborFee,
        laborCost: laborFee,
        partsCostTotal,
        partsSaleTotal,
        cost: totalCost,
        totalPrice: repairData.totalPrice !== undefined ? parseNumber(repairData.totalPrice) : calculatedTotal,
        updatedAt: new Date().toISOString()
      };

      let updatedRepairs;
      if (isEdit) {
        updatedRepairs = repairs.map(r => r.id === repairId ? updatedRepairData : r);
      } else {
        updatedRepairData.createdAt = new Date().toISOString();
        updatedRepairs = [updatedRepairData, ...repairs];
      }

      // 6. Handle associated inventory phone status & expenses if linked
      if (repairData.phoneId) {
        const phones = getJson(STORAGE_KEYS.PHONES, []);
        const updatedPhones = phones.map(p => {
          if (p.id === repairData.phoneId) {
            let updatedExpenses = p.expenses || [];
            const existingExpIdx = updatedExpenses.findIndex(e => e.id === `rep-exp-${repairId}`);
            
            const expObject = {
              id: `rep-exp-${repairId}`,
              name: `Tamir Gideri (${repairData.defect || 'Cihaz Onarımı'})`,
              amount: totalCost,
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
              expenses: updatedExpenses,
              updatedAt: new Date().toISOString()
            };
          }
          return p;
        });
        await saveJson(STORAGE_KEYS.PHONES, updatedPhones);
      }

      // 7. Record cash movement if repair delivered and paid
      if (repairData.status === 'Teslim Edildi' && totalCost > 0 && (!oldRepair || oldRepair.status !== 'Teslim Edildi')) {
        await cashMovementService.save({
          operationId: `${repairId}-cash`,
          direction: 'in',
          paymentMethod: mapPaymentMethod(repairData.paymentType || 'Nakit'),
          amount: totalCost,
          sourceType: 'repair',
          sourceId: repairId,
          description: `Teknik Servis Tahsilatı - ${repairData.phoneDescription || 'Tamir'}`,
          date: new Date().toISOString().split('T')[0]
        });
      }

      await saveJson(STORAGE_KEYS.REPAIRS, updatedRepairs);
      return updatedRepairData;
    });
  },

  delete: async (id) => {
    return await runTransaction(async () => {
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
              expenses: (p.expenses || []).filter(e => e.id !== `rep-exp-${id}`),
              updatedAt: new Date().toISOString()
            };
          }
          return p;
        });
        await saveJson(STORAGE_KEYS.PHONES, updatedPhones);
      }
      return true;
    });
  }
};
