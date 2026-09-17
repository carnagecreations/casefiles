export type CleaningProgram = 'regular' | 'deep' | 'move' | 'office';

export type HomeCondition = 'standard' | 'normal' | 'heavy';

export type CleaningFrequency = 'one-time' | 'monthly' | 'bi-weekly' | 'weekly';

export interface AddOnDefinition {
  id: string;
  name: string;
  price: number;
  estimatedMinutes: number;
  description: string;
  iconName: string;
}

export interface EstimatorInput {
  program: CleaningProgram;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  condition: HomeCondition;
  frequency: CleaningFrequency;
  isMilitaryOrVeteran: boolean;
  selectedAddOns: string[]; // array of add-on ids
  customNotes?: string;
  referralCode?: string;
  referralDiscount?: number;
}

export interface QuoteBreakdown {
  program: CleaningProgram;
  basePrice: number;
  sqftPrice: number;
  bedBathPrice: number;
  conditionSurcharge: number;
  conditionLabel: string;
  conditionPercentage: number;
  addOnsTotal: number;
  addOnsList: { name: string; price: number }[];
  subtotal: number;
  frequencyDiscountPercent: number;
  frequencyDiscountAmount: number;
  militaryDiscountPercent: number;
  militaryDiscountAmount: number;
  referralCode?: string;
  referralDiscountAmount?: number;
  referrerName?: string;
  totalDiscount: number;
  finalPrice: number;
  estimatedHoursMin: number;
  estimatedHoursMax: number;
  effectiveHourlyRate: number;
  suggestedCrewHoursText: string;
  twoPersonHoursMin: number;
  twoPersonHoursMax: number;
  twoPersonCrewText: string;
  cleanGuaranteeNote: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string; // e.g., Yuma, Foothills, Somerton
  entryCode?: string; // lockbox, gate code, garage keypad
  petNotes?: string;
  preferredFrequency: CleaningFrequency;
  defaultProgram: CleaningProgram;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  condition: HomeCondition;
  isMilitary: boolean;
  defaultAddOns: string[];
  agreedRate: number;
  status: 'active' | 'lead' | 'paused';
  createdAt: string;
  specialInstructions?: string;
  referralCode?: string;
  referredByCode?: string;
  referredByClientId?: string;
  referredByName?: string;
  referralCreditBalance?: number;
  autoRecurring?: boolean; // auto-book the next visit when a job completes (default true for recurring frequencies)
  tags?: string[]; // free-form segmentation, e.g. "VIP", "At-Risk", "One-Time"
  activityLog?: ClientActivityEntry[]; // running notes/timeline for this client
  doNotServe?: boolean;
  doNotServeReason?: string;
  skipNextVisit?: boolean; // pauses just the next auto-recurring booking, then clears itself
  followUpDate?: string; // YYYY-MM-DD — when to follow up on a lead/quote
}

export interface ClientActivityEntry {
  id: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export interface ChecklistItem {
  id: string;
  room: 'kitchen' | 'bathrooms' | 'bedrooms' | 'living' | 'add-ons' | 'wrap-up';
  task: string;
  isCompleted: boolean;
}

export interface JobAppointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  address: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "8:30 AM - 11:30 AM"
  program: CleaningProgram;
  condition: HomeCondition;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  selectedAddOns: string[];
  price: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  actualMinutes?: number;
  checklist: ChecklistItem[];
  notes?: string;
  invoiceId?: string;
  routeOrder?: number;
  assignedTo?: string; // team member this job is assigned to
  timerStartedAt?: string; // ISO timestamp while the on-site timer is running
  cancellationReason?: string;
  qualityRating?: number; // 1-5 self/client-reported quality rating on completion
}

export interface BlockedTime {
  id: string;
  date: string; // YYYY-MM-DD
  title: string; // e.g. "Equipment Maintenance", "Doctor Appointment"
  timeSlot: string; // e.g. "1:00 PM - 3:00 PM"
  category: 'personal' | 'maintenance' | 'travel' | 'holiday';
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobId?: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  serviceDate: string;
  program: CleaningProgram;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  status: 'unpaid' | 'paid';
  paidDate?: string;
  paymentMethod?: 'Zelle' | 'Cash' | 'Venmo' | 'Card' | 'Check';
  referralCreditApplied?: number;
  tipAmount?: number;
  lateFeeAmount?: number;
  amountPaid?: number; // running total of partial payments received (unpaid invoices only)
  notes?: string;
}

export interface Referral {
  id: string;
  referrerClientId: string;
  referrerName: string;
  referrerCode: string;
  refereeName: string;
  refereePhone?: string;
  refereeEmail?: string;
  refereeClientId?: string;
  rewardAmount: number; // e.g. $25 credit for referrer
  refereeDiscount: number; // e.g. $25 discount for new client
  status: 'pending' | 'qualified' | 'redeemed';
  dateReferred: string;
  dateQualified?: string;
  dateRedeemed?: string;
  notes?: string;
}

export interface PricingSettings {
  basePrices: Record<CleaningProgram, number>;
  baseSqft: number; // typically 1,500 sqft
  sqftIncrementRate: Record<CleaningProgram, number>; // per 500 sq ft
  bathroomIncrement: number; // beyond 1 bath
  bedroomIncrement: number; // beyond 1 bed
  conditionRates: Record<HomeCondition, number>; // e.g., 0, 0.15, 0.30
  frequencyDiscounts: Record<CleaningFrequency, number>; // e.g., 0, 0.10, 0.15, 0.20
  militaryDiscountRate: number; // 0.10
  referralRewardAmount: number; // e.g., $25 credit for referring client
  referralDiscountAmount: number; // e.g., $25 off first cleaning for new client
  addOns: AddOnDefinition[];
  helperName?: string; // default name pre-filled on new hour entries
  helperHourlyRate?: number; // default $/hr pre-filled on new hour entries
  marketingAiEndpoint?: string; // Cloudflare Worker URL for the Marketing AI drafting tool
  marketingAiSecret?: string; // shared secret sent as the X-App-Secret header
  teamMembers?: string[]; // names jobs can be assigned to (owner + helpers)
  mileageRate?: number; // $/mile used to auto-calc a gas expense from logged mileage
  lateFeePercent?: number; // % of subtotal applied as a late fee on overdue invoices
  extraChecklistItems?: string[]; // always-included checklist tasks appended to every job
}

export type MarketingDraftMode = 'reply_email' | 'reply_post' | 'create_post';

export interface MarketingDraft {
  id: string;
  mode: MarketingDraftMode;
  platform?: string;
  tone?: string;
  inputContext: string;
  draftText: string;
  createdAt: string; // YYYY-MM-DD
}

export type ExpenseCategory =
  | 'supplies'
  | 'gas'
  | 'equipment'
  | 'insurance'
  | 'marketing'
  | 'helper_pay'
  | 'other';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number;
  jobId?: string;
  clientId?: string;
  notes?: string;
  isLowStock?: boolean; // flagged as running low / needs reordering soon
  isRecurringMonthly?: boolean; // e.g. insurance premium — reminds if not re-logged this month
}

export interface HelperShift {
  id: string;
  date: string; // YYYY-MM-DD
  helperName: string;
  jobId?: string;
  hours: number;
  hourlyRate: number;
  payAmount: number;
  notes?: string;
  paid: boolean;
  paidDate?: string;
}
