import { STORAGE_KEYS, getJson, saveJson } from './shared';

export const repairService = {
  getAll: () => {
    return getJson(STORAGE_KEYS.REPAIRS, []);
  },

  getById: (id) => {
    const repairs = repairService.getAll();
    return repairs.find(r => r.id === id) || null;
  },

  save: (repairData) => {
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    let updated;
    
    if (repairData.id) {
      updated = repairs.map(r => r.id === repairData.id ? { ...r, ...repairData } : r);
      
      if (repairData.phoneId) {
        const phones = getJson(STORAGE_KEYS.PHONES, []);
        const updatedPhones = phones.map(p => {
          if (p.id === repairData.phoneId) {
            let updatedExpenses = p.expenses || [];
            const existingExpIdx = updatedExpenses.findIndex(e => e.id === `rep-exp-${repairData.id}`);
            
            const expObject = {
              id: `rep-exp-${repairData.id}`,
              name: `Tamir Gideri (${repairData.defect})`,
              amount: Number(repairData.cost || 0),
              date: new Date().toISOString().split('T')[0]
            };
            
            if (existingExpIdx >= 0) {
              updatedExpenses[existingExpIdx] = expObject;
            } else {
              updatedExpenses.push(expObject);
            }
            
            return {
              ...p,
              status: repairData.status === 'Teslim Edildi' || repairData.status === 'Hazır' ? 'Stokta' : 'Tamirde',
              expenses: updatedExpenses
            };
          }
          return p;
        });
        saveJson(STORAGE_KEYS.PHONES, updatedPhones);
      }
    } else {
      const newRep = {
        ...repairData,
        id: `rep-${Date.now()}`
      };
      updated = [...repairs, newRep];
      
      if (repairData.phoneId) {
        const phones = getJson(STORAGE_KEYS.PHONES, []);
        const updatedPhones = phones.map(p => {
          if (p.id === repairData.phoneId) {
            const expObject = {
              id: `rep-exp-${newRep.id}`,
              name: `Tamir Gideri (${repairData.defect})`,
              amount: Number(repairData.cost || 0),
              date: new Date().toISOString().split('T')[0]
            };
            return {
              ...p,
              status: 'Tamirde',
              expenses: [...(p.expenses || []), expObject]
            };
          }
          return p;
        });
        saveJson(STORAGE_KEYS.PHONES, updatedPhones);
      }
    }
    saveJson(STORAGE_KEYS.REPAIRS, updated);
    return true;
  },

  delete: (id) => {
    const repairs = getJson(STORAGE_KEYS.REPAIRS, []);
    const repair = repairs.find(r => r.id === id);
    saveJson(STORAGE_KEYS.REPAIRS, repairs.filter(r => r.id !== id));
    
    if (repair && repair.phoneId) {
      const phones = getJson(STORAGE_KEYS.PHONES, []);
      const updatedPhones = phones.map(p => {
        if (p.id === repair.phoneId) {
          return {
            ...p,
            status: p.status === 'Tamirde' ? 'Stokta' : p.status,
            expenses: (p.expenses || []).filter(e => e.id !== `rep-exp-${id}`)
          };
        }
        return p;
      });
      saveJson(STORAGE_KEYS.PHONES, updatedPhones);
    }
    return true;
  }
};
