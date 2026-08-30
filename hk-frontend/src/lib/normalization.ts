/**
 * Data Normalization Helpers for Order & Tracking Duplicate Protection
 */

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Format Pakistani numbers (e.g., +923001234567 or 923001234567 -> 03001234567)
  if (cleaned.startsWith('92') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeTracking(tracking: string | null | undefined): string {
  if (!tracking) return '';
  return tracking.trim().toUpperCase();
}

/**
 * Checks if two item arrays contain identical products and quantities
 */
export function areItemsIdentical(itemsA: any[], itemsB: any[]): boolean {
  if (!Array.isArray(itemsA) || !Array.isArray(itemsB)) return false;
  if (itemsA.length !== itemsB.length) return false;

  const sortedA = [...itemsA].sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
  const sortedB = [...itemsB].sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));

  return sortedA.every((itemA, idx) => {
    const itemB = sortedB[idx];
    return (
      normalizeText(itemA.productName) === normalizeText(itemB.productName) &&
      Number(itemA.qty) === Number(itemB.qty)
    );
  });
}
