import { Client, JobAppointment, Invoice, PricingSettings, BlockedTime, Referral } from '../types';

// Empty initial datasets for production use
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_JOBS: JobAppointment[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_BLOCKED_TIMES: BlockedTime[] = [];
export const INITIAL_REFERRALS: Referral[] = [];

// Identifiers of legacy demo / test records to automatically prune from existing local storage
export const TEST_CLIENT_IDS = new Set(['c1', 'c2', 'c3', 'c4', 'c5']);
export const TEST_JOB_IDS = new Set(['job-1', 'job-2', 'job-3', 'job-4', 'job-5']);
export const TEST_INVOICE_IDS = new Set(['inv-101', 'inv-102', 'inv-103']);
export const TEST_BLOCKED_IDS = new Set(['block-1', 'block-2', 'block-3']);

// LocalStorage helpers
const STORAGE_KEYS = {
  CLIENTS: 'clean_convictions_clients',
  JOBS: 'clean_convictions_jobs',
  INVOICES: 'clean_convictions_invoices',
  SETTINGS: 'clean_convictions_settings',
  BLOCKED_TIMES: 'clean_convictions_blocked_times',
  REFERRALS: 'clean_convictions_referrals',
};

/**
 * Generates a clean, memorable referral code based on client name or phone
 * e.g., SARAH-YUMA, CARLOS-928, CC-784
 */
export function generateReferralCode(clientName: string, clientPhone?: string): string {
  const cleanName = clientName
    .trim()
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
  const prefix = cleanName.slice(0, 5) || 'CLEAN';
  const phoneSuffix = clientPhone ? clientPhone.replace(/\D/g, '').slice(-3) : '';
  const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
  const suffix = phoneSuffix || randomSuffix;
  return `${prefix}-${suffix}`;
}

export function loadStoredData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Error loading localStorage key ${key}:`, err);
    return fallback;
  }
}

export function saveStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error saving to localStorage key ${key}:`, err);
  }
}

export { STORAGE_KEYS };
