import { describe, it, expect, vi, beforeEach } from 'vitest';
import { escapeHtml } from './security';
import { authService } from '../db/services/authService';
import { settingsService } from '../db/services/settingsService';

describe('Security Utilities', () => {
  it('should escape HTML to prevent XSS', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escapeHtml('<img src="x" onerror="alert(1)">')).toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
    expect(escapeHtml('Hello & World')).toBe('Hello &amp; World');
  });

  it('should handle null/undefined safely', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('Settings Service Backup/Import Security', () => {
  beforeEach(() => {
    // Mock localStorage
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value; }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => {
        for (const key in store) delete store[key];
      })
    });
  });

  it('should validate schema during import and reject invalid JSON', () => {
    expect(() => settingsService.importDatabase('invalid json')).toThrow();
    expect(() => settingsService.importDatabase('[]')).toThrow();
  });

  it('should prevent prototype pollution', () => {
    const maliciousPayload = JSON.stringify({
      "__proto__": { "polluted": true },
      "tys_settings": "{}"
    });
    
    settingsService.importDatabase(maliciousPayload);
    expect({}.polluted).toBeUndefined();
  });
});
