/**
 * Data Normalization Helpers for Order & Tracking Duplicate Protection
 */

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Strip all non-digit characters (spaces, +, -, (), dots, zero-width chars)
  let cleaned = phone.replace(/\D/g, '');
  
  // Format Pakistani numbers to standard 11-digit local format 03XXXXXXXXX
  if (cleaned.startsWith('00920') && cleaned.length === 15) {
    cleaned = '0' + cleaned.substring(5);
  } else if (cleaned.startsWith('0092') && cleaned.length === 14) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('920') && cleaned.length === 13) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('92') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  // If cleaned starts with '0' and is longer than 11 digits, limit to 11
  if (cleaned.startsWith('0') && cleaned.length > 11) {
    cleaned = cleaned.substring(0, 11);
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

export const PROVINCE_CITIES_MAP: Record<string, string[]> = {
  "Punjab": ["Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sargodha", "Bahawalpur", "Sialkot", "Sheikhupura", "Rahim Yar Khan", "Jhang", "Dera Ghazi Khan", "Gujrat", "Sahiwal", "Kasur", "Okara", "Chiniot", "Kamoke", "Hafizabad", "Sadiqabad", "Burewala", "Muzaffargarh", "Khanpur", "Gojra", "Bahawalnagar", "Muridke", "Pakpattan", "Jaranwala", "Chishtian", "Daska", "Mandi Bahauddin", "Ahmadpur East", "Kamalia", "Vehari", "Wazirabad", "Khushab", "Chakwal", "Mianwali", "Kot Adu", "Pindi Bhattian", "Sukheke"],
  "Sindh": ["Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas", "Jacobabad", "Shikarpur", "Tando Adam", "Khairpur", "Dadu", "Tando Allahyar", "Kotri", "Thatta", "Badin", "Ghotki", "Kashmore", "Umerkot", "Matiari", "Shahdadkot", "Shadadkot"],
  "Khyber Pakhtunkhwa": ["Peshawar", "Mardan", "Mingora", "Kohat", "Abbottabad", "Dera Ismail Khan", "Nowshera", "Charsadda", "Swabi", "Sawabi", "Mansehra", "Bannu", "Timargara", "Haripur", "Swat", "Chitral"],
  "Balochistan": ["Quetta", "Turbat", "Khuzdar", "Hub", "Chaman", "Gwadar", "Dera Murad Jamali", "Sibi", "Zhob", "Loralai"],
  "Azad Kashmir": ["Muzaffarabad", "Mirpur", "Rawalakot", "Kotli", "Bhimber", "Bagh", "Sudhanoti"],
  "Gilgit-Baltistan": ["Gilgit", "Skardu", "Hunza", "Chilas", "Gahkuch", "Aliabad", "Shigar", "Khaplu"],
  "Islamabad Capital Territory": ["Islamabad"]
};

export function getProvinceFromCity(city: string | null | undefined): string {
  if (!city || !city.trim()) return '';
  const cleanCity = city.trim().toLowerCase();
  for (const [province, cities] of Object.entries(PROVINCE_CITIES_MAP)) {
    if (cities.some(c => c.toLowerCase() === cleanCity)) {
      return province;
    }
  }
  return '';
}
