// Single source of truth for cleaning arrival windows, used by the Estimator's
// booking flow and the Schedule's Add Job flow. Centralized so adding or
// tweaking a slot only has to happen once instead of in three duplicated
// dropdowns/radio lists.
export interface TimeSlotPreset {
  id: string;
  label: string; // the exact string stored on the job (JobAppointment.timeSlot)
  sub: string; // short human name shown next to the label in pickers
}

export const TIME_SLOT_PRESETS: TimeSlotPreset[] = [
  { id: 'early-morning', label: '7:00 AM - 9:30 AM (Early Morning)', sub: 'Early Morning' },
  { id: 'morning', label: '8:00 AM - 11:30 AM (Morning)', sub: 'Morning Solo Slot' },
  { id: 'late-morning', label: '10:00 AM - 1:00 PM (Late Morning)', sub: 'Late Morning' },
  { id: 'midday', label: '12:00 PM - 3:30 PM (Midday)', sub: 'Midday Slot' },
  { id: 'early-afternoon', label: '1:00 PM - 4:00 PM (Early Afternoon)', sub: 'Early Afternoon' },
  { id: 'afternoon', label: '4:00 PM - 7:00 PM (Afternoon)', sub: 'Afternoon / Twilight' },
  { id: 'evening', label: '6:00 PM - 8:30 PM (Evening)', sub: 'Evening' },
];

export const CUSTOM_TIME_VALUE = 'Custom Time';
