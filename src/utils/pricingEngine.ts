import {
  CleaningProgram,
  HomeCondition,
  CleaningFrequency,
  AddOnDefinition,
  EstimatorInput,
  QuoteBreakdown,
  PricingSettings,
  ChecklistItem,
} from '../types';

export const DEFAULT_ADD_ONS: AddOnDefinition[] = [
  {
    id: 'fridge',
    name: 'Inside Fridge',
    price: 30,
    estimatedMinutes: 30,
    description: 'Empty shelves, deep scrub, sanitize door seals & produce bins',
    iconName: 'Refrigerator',
  },
  {
    id: 'oven',
    name: 'Inside Oven',
    price: 30,
    estimatedMinutes: 40,
    description: 'Degrease racks, interior glass, bake element & door edges',
    iconName: 'Flame',
  },
  {
    id: 'windows',
    name: 'Interior Windows & Tracks',
    price: 40,
    estimatedMinutes: 45,
    description: 'Interior glass panes, sill dusting & vacuuming track dirt',
    iconName: 'Square',
  },
  {
    id: 'garage_sweep',
    name: 'Garage Sweep & Tidy',
    price: 25,
    estimatedMinutes: 25,
    description: 'Sweep concrete perimeter, cobweb removal & tidy entry step',
    iconName: 'Warehouse',
  },
  {
    id: 'laundry_room',
    name: 'Laundry Room Detail',
    price: 15,
    estimatedMinutes: 20,
    description: 'Wipe washer/dryer exteriors, lint trap area, fold prep surface',
    iconName: 'Shirt',
  },
  {
    id: 'closet_org',
    name: 'Closet Organizing',
    price: 60,
    estimatedMinutes: 60,
    description: 'Hang alignment, shoe organization, shelf refolding & tidying',
    iconName: 'FolderCheck',
  },
  {
    id: 'garage_org',
    name: 'Garage Organizing',
    price: 50,
    estimatedMinutes: 60,
    description: 'Bin grouping, tool staging & broom/shovel rack organization',
    iconName: 'Boxes',
  },
  {
    id: 'pet_safe',
    name: 'Pet-Safe Products',
    price: 15,
    estimatedMinutes: 0,
    description: 'Strict non-toxic, pet-safe, plant-derived botanical cleaners',
    iconName: 'PawPrint',
  },
  {
    id: 'pet_disinfect',
    name: 'Pet Illness Disinfect',
    price: 40,
    estimatedMinutes: 30,
    description: 'Hospital-grade veterinary-safe sanitization for past illness/mishaps',
    iconName: 'ShieldAlert',
  },
  {
    id: 'cabinets_interior',
    name: 'Inside Cabinets & Drawers',
    price: 35,
    estimatedMinutes: 45,
    description: 'Wipe inside kitchen or vanity cabinets (recommended for move cleans)',
    iconName: 'Layers',
  },
  {
    id: 'extra_dishes',
    name: 'Dishes / Extra Kitchen Prep',
    price: 25,
    estimatedMinutes: 30,
    description: 'Load/run dishwasher, hand wash sink-full & wipe drying rack',
    iconName: 'Coffee',
  },
];

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  basePrices: {
    regular: 129, // 1500 sqft standard base
    deep: 179,
    move: 199,
    office: 110,
  },
  baseSqft: 1500,
  sqftIncrementRate: {
    regular: 18, // per 500 sq ft over base
    deep: 30,
    move: 35,
    office: 25,
  },
  bathroomIncrement: 15, // each bathroom beyond 1
  bedroomIncrement: 10,  // each bedroom beyond 1
  conditionRates: {
    standard: 0.0,
    normal: 0.15,
    heavy: 0.30,
  },
  frequencyDiscounts: {
    'one-time': 0.0,
    monthly: 0.10,
    'bi-weekly': 0.15,
    weekly: 0.20,
  },
  militaryDiscountRate: 0.10,
  referralRewardAmount: 25,
  referralDiscountAmount: 25,
  addOns: DEFAULT_ADD_ONS,
  businessEmail: 'hello@cleanconvictions.com',
};

/**
 * Calculates the exact Clean Convictions flat-rate estimate based on cleanconvictions.com estimator logic
 */
export function calculateEstimate(
  input: EstimatorInput,
  settings: PricingSettings = DEFAULT_PRICING_SETTINGS
): QuoteBreakdown {
  const {
    program,
    sqft,
    bedrooms,
    bathrooms,
    condition,
    frequency,
    isMilitaryOrVeteran,
    selectedAddOns,
    referralCode,
    referralDiscount,
  } = input;

  // 1. Base Price for the program
  const basePrice = settings.basePrices[program] || 129;

  // 2. Square Footage calculation:
  // Standard base covers up to 1,500 sqft. If smaller (e.g. <=1000 for regular), minimum base is $89
  let sqftPrice = 0;
  if (sqft < 1100 && program === 'regular') {
    // Discount for compact apartment under 1100 sqft down to $89 - $109
    sqftPrice = -20;
  } else if (sqft > settings.baseSqft) {
    const extraBlocks = Math.ceil((sqft - settings.baseSqft) / 500);
    const ratePerBlock = settings.sqftIncrementRate[program] || 20;
    sqftPrice = extraBlocks * ratePerBlock;
  }

  // 3. Bedroom and Bathroom scaling
  const extraBaths = Math.max(0, bathrooms - 1);
  const extraBeds = Math.max(0, bedrooms - 1);
  const bedBathPrice =
    extraBaths * settings.bathroomIncrement +
    extraBeds * settings.bedroomIncrement;

  // 4. Physical footprint subtotal before condition
  const spaceSubtotal = Math.max(79, basePrice + sqftPrice + bedBathPrice);

  // 5. Condition multiplier
  const conditionPercentage = settings.conditionRates[condition] || 0;
  const conditionSurcharge = Math.round(spaceSubtotal * conditionPercentage);
  const conditionLabel =
    condition === 'heavy'
      ? 'Needs Work (+30%)'
      : condition === 'normal'
      ? 'Normal Wear (+15%)'
      : 'Clean Standard (Included)';

  // 6. Add-ons
  const activeAddOnsList: { name: string; price: number }[] = [];
  let addOnsTotal = 0;
  let addOnsMinutes = 0;

  selectedAddOns.forEach((addOnId) => {
    const found = settings.addOns.find((a) => a.id === addOnId);
    if (found) {
      activeAddOnsList.push({ name: found.name, price: found.price });
      addOnsTotal += found.price;
      addOnsMinutes += found.estimatedMinutes;
    }
  });

  // 7. Base service total before discounts
  const subtotal = spaceSubtotal + conditionSurcharge + addOnsTotal;

  // 8. Frequency discount (e.g., Weekly 20%, Bi-weekly 15%, Monthly 10%)
  const frequencyDiscountPercent = settings.frequencyDiscounts[frequency] || 0;
  // Frequency discount applies to the recurring service portion (space + condition)
  const servicePortion = spaceSubtotal + conditionSurcharge;
  const frequencyDiscountAmount = Math.round(servicePortion * frequencyDiscountPercent);

  // 9. Military / Veteran Discount (10% on remainder)
  const militaryDiscountPercent = isMilitaryOrVeteran ? settings.militaryDiscountRate : 0;
  const afterFrequency = subtotal - frequencyDiscountAmount;
  const militaryDiscountAmount = isMilitaryOrVeteran
    ? Math.round(afterFrequency * militaryDiscountPercent)
    : 0;

  // 10. Referral Discount (e.g. $25 for new referred customers)
  const referralDiscountAmount = referralDiscount !== undefined
    ? referralDiscount
    : (referralCode && referralCode.trim().length > 0 ? settings.referralDiscountAmount || 25 : 0);

  const totalDiscount = frequencyDiscountAmount + militaryDiscountAmount + referralDiscountAmount;
  const finalPrice = Math.max(50, subtotal - totalDiscount);

  // 11. Solo Cleaner Estimated Duration & Labor Efficiency
  let baseHours = 2.5;
  if (program === 'deep') baseHours = 3.5;
  if (program === 'move') baseHours = 4.0;
  if (program === 'office') baseHours = 2.0;

  const extraSqftHours = Math.max(0, (sqft - 1500) / 750) * 0.4;
  const extraRoomsHours = extraBaths * 0.35 + extraBeds * 0.15;
  const conditionMultiplier = condition === 'heavy' ? 1.35 : condition === 'normal' ? 1.15 : 1.0;
  const addOnsHours = addOnsMinutes / 60;

  const calculatedHours = (baseHours + extraSqftHours + extraRoomsHours) * conditionMultiplier + addOnsHours;
  const estimatedHoursMin = Math.max(1.5, Math.round((calculatedHours - 0.5) * 10) / 10);
  const estimatedHoursMax = Math.round((calculatedHours + 0.5) * 10) / 10;

  const avgHours = (estimatedHoursMin + estimatedHoursMax) / 2;
  const effectiveHourlyRate = Math.round(finalPrice / avgHours);

  const suggestedCrewHoursText = `${estimatedHoursMin} - ${estimatedHoursMax} solo hours`;

  // 12. Two-Person Crew Duration
  // Two people working together don't quite halve the time (setup, one
  // bathroom/kitchen at a time, coordination overhead) — 1.6x throughput
  // is a realistic estimate for a 2-person residential cleaning crew.
  const TWO_PERSON_EFFICIENCY = 1.6;
  const twoPersonHoursMin = Math.max(0.75, Math.round((estimatedHoursMin / TWO_PERSON_EFFICIENCY) * 10) / 10);
  const twoPersonHoursMax = Math.max(1, Math.round((estimatedHoursMax / TWO_PERSON_EFFICIENCY) * 10) / 10);
  const twoPersonCrewText = `${twoPersonHoursMin} - ${twoPersonHoursMax} hrs with 2-person crew`;

  const cleanGuaranteeNote =
    'Clean Convictions Guarantee: Spot missed? We re-clean within 24 hours at no extra charge.';

  return {
    program,
    basePrice,
    sqftPrice,
    bedBathPrice,
    conditionSurcharge,
    conditionLabel,
    conditionPercentage,
    addOnsTotal,
    addOnsList: activeAddOnsList,
    subtotal,
    frequencyDiscountPercent,
    frequencyDiscountAmount,
    militaryDiscountPercent,
    militaryDiscountAmount,
    referralCode,
    referralDiscountAmount,
    totalDiscount,
    finalPrice,
    estimatedHoursMin,
    estimatedHoursMax,
    effectiveHourlyRate,
    suggestedCrewHoursText,
    twoPersonHoursMin,
    twoPersonHoursMax,
    twoPersonCrewText,
    cleanGuaranteeNote,
  };
}

/**
 * Generates an SMS / Text quote ready to send to a client or copy to clipboard
 */
export function generateClientTextQuote(
  clientName: string,
  quote: QuoteBreakdown,
  input: EstimatorInput,
  cleaningDate?: string,
  cleaningTime?: string
): string {
  const programTitles: Record<CleaningProgram, string> = {
    regular: 'Regular / Maintenance Cleaning',
    deep: 'Comprehensive Deep Clean',
    move: 'Move In / Move Out Cleaning',
    office: 'Office / Commercial Cleaning',
  };

  const freqLabels: Record<CleaningFrequency, string> = {
    'one-time': 'One-Time Service',
    monthly: 'Monthly Service (-10% off)',
    'bi-weekly': 'Every Other Week (-15% off)',
    weekly: 'Weekly Service (-20% off)',
  };

  const addOnsText =
    quote.addOnsList.length > 0
      ? `\nIncluded Add-Ons:\n${quote.addOnsList.map((a) => ` • ${a.name} ($${a.price})`).join('\n')}`
      : '';

  const discountParts: string[] = [];
  if (quote.frequencyDiscountAmount > 0) {
    discountParts.push(`${freqLabels[input.frequency]}`);
  }
  if (input.isMilitaryOrVeteran) {
    discountParts.push('10% Military/Veteran');
  }
  if (quote.referralDiscountAmount && quote.referralDiscountAmount > 0) {
    discountParts.push(`$${quote.referralDiscountAmount} Referral Credit`);
  }

  const discountText =
    quote.totalDiscount > 0
      ? `\nYour Savings: -$${quote.totalDiscount} (${discountParts.join(' + ')})`
      : '';

  let scheduleDateLine = '';
  if (cleaningDate) {
    const formattedDate = new Date(cleaningDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    scheduleDateLine = `\n📅 Cleaning Date: ${formattedDate}${cleaningTime ? ` (${cleaningTime})` : ''}`;
  }

  return `Hi ${clientName || 'there'}! Here is your flat-rate cleaning estimate from Clean Convictions:

Service: ${programTitles[input.program]}
Home Specs: ${input.sqft.toLocaleString()} sq ft • ${input.bedrooms} bed / ${input.bathrooms} bath
Condition: ${input.condition === 'heavy' ? 'Needs Heavy Work' : input.condition === 'normal' ? 'Normal Wear' : 'Standard Clean'}
Schedule: ${freqLabels[input.frequency]}${scheduleDateLine}${addOnsText}${discountText}

✨ Flat-Rate Total: $${quote.finalPrice}
⏱ Estimated On-Site Time: ${quote.suggestedCrewHoursText}

🛡 Clean Convictions 24-Hour Guarantee:
If any area doesn't meet our standard and is reported within 24 hours, we return and re-clean it free of charge.

Would you like to get this locked in on my schedule? Let me know which morning works best for you!
- Clean Convictions (cleanconvictions.com)`;
}

/**
 * Builds the customized room-by-room checklist according to the program & add-ons
 */
export function generateChecklistForJob(
  program: CleaningProgram,
  addOns: string[],
  extraItems: string[] = []
): ChecklistItem[] {
  const list: ChecklistItem[] = [];

  // Kitchen
  list.push(
    { id: 'k1', room: 'kitchen', task: 'Sanitize countertops & backsplash', isCompleted: false },
    { id: 'k2', room: 'kitchen', task: 'Clean & polish exterior of appliances (stove, fridge, dishwasher)', isCompleted: false },
    { id: 'k3', room: 'kitchen', task: 'Scrub & disinfect sink, drain & chrome faucet fixtures', isCompleted: false },
    { id: 'k4', room: 'kitchen', task: 'Clean microwave inside & outside', isCompleted: false },
    { id: 'k5', room: 'kitchen', task: 'Wipe exterior cabinet faces & hardware', isCompleted: false },
    { id: 'k6', room: 'kitchen', task: 'Vacuum & wet mop kitchen floors', isCompleted: false }
  );

  if (program === 'deep' || program === 'move') {
    list.push(
      { id: 'k7', room: 'kitchen', task: 'Hand-wipe baseboards & remove wall grease splashes', isCompleted: false },
      { id: 'k8', room: 'kitchen', task: 'Clean behind & around counter trash bins', isCompleted: false }
    );
  }

  // Bathrooms
  list.push(
    { id: 'b1', room: 'bathrooms', task: 'Scrub & disinfect toilet bowl, exterior, base & hinges', isCompleted: false },
    { id: 'b2', room: 'bathrooms', task: 'Deep scrub shower walls, tile, tub basin & glass doors', isCompleted: false },
    { id: 'b3', room: 'bathrooms', task: 'Polish chrome fixtures & descale showerheads', isCompleted: false },
    { id: 'b4', room: 'bathrooms', task: 'Clean vanity countertop, sink basin & polish mirrors streak-free', isCompleted: false },
    { id: 'b5', room: 'bathrooms', task: 'Empty wastebaskets & replace liners', isCompleted: false },
    { id: 'b6', room: 'bathrooms', task: 'Hand-wash & sanitize bathroom floor tiles', isCompleted: false }
  );

  if (program === 'deep' || program === 'move') {
    list.push(
      { id: 'b7', room: 'bathrooms', task: 'Scrub grout lines & remove soap scum build-up', isCompleted: false },
      { id: 'b8', room: 'bathrooms', task: 'Dust exhaust fan vent & wipe light bars', isCompleted: false }
    );
  }

  // Living & Common Areas
  list.push(
    { id: 'l1', room: 'living', task: 'High dusting: ceiling fans, corners & light fixtures', isCompleted: false },
    { id: 'l2', room: 'living', task: 'Dust all furniture surfaces, shelves & decor items', isCompleted: false },
    { id: 'l3', room: 'living', task: 'Straighten pillows, throw blankets & tidy surfaces', isCompleted: false },
    { id: 'l4', room: 'living', task: 'Sanitize high-touch areas (light switches, door knobs)', isCompleted: false },
    { id: 'l5', room: 'living', task: 'Vacuum all carpeted areas & area rugs thoroughly', isCompleted: false },
    { id: 'l6', room: 'living', task: 'Mop hard floor surfaces with pH-neutral cleaner', isCompleted: false }
  );

  if (program === 'deep' || program === 'move') {
    list.push(
      { id: 'l7', room: 'living', task: 'Hand-wipe baseboards, door frames & window sills', isCompleted: false },
      { id: 'l8', room: 'living', task: 'Vacuum under reachable furniture cushions & edges', isCompleted: false }
    );
  }

  // Bedrooms
  list.push(
    { id: 'br1', room: 'bedrooms', task: 'Make bed / straighten linens (or change if fresh sheets left out)', isCompleted: false },
    { id: 'br2', room: 'bedrooms', task: 'Dust nightstands, dressers, lamps & headboards', isCompleted: false },
    { id: 'br3', room: 'bedrooms', task: 'Vacuum carpets including closet walkways & perimeter', isCompleted: false }
  );

  // Add-on specific tasks
  if (addOns.includes('fridge')) {
    list.push({ id: 'ao_fridge', room: 'add-ons', task: 'Inside Fridge: Remove drawers, wash bins, disinfect shelves', isCompleted: false });
  }
  if (addOns.includes('oven')) {
    list.push({ id: 'ao_oven', room: 'add-ons', task: 'Inside Oven: Degrease racks, scrape charred deposits, clean door glass', isCompleted: false });
  }
  if (addOns.includes('windows')) {
    list.push({ id: 'ao_windows', room: 'add-ons', task: 'Interior Windows: Clean all interior panes & vacuum dusty sill tracks', isCompleted: false });
  }
  if (addOns.includes('garage_sweep')) {
    list.push({ id: 'ao_garage', room: 'add-ons', task: 'Garage: Sweep whole floor slab, sweep cobwebs from overhead corners', isCompleted: false });
  }
  if (addOns.includes('laundry_room')) {
    list.push({ id: 'ao_laundry', room: 'add-ons', task: 'Laundry Room: Wipe machine exteriors, clean detergent tray & mop floor', isCompleted: false });
  }
  if (addOns.includes('closet_org')) {
    list.push({ id: 'ao_closet', room: 'add-ons', task: 'Closet Organizing: Uniform hanger spacing, folded stacks & shoe alignment', isCompleted: false });
  }
  if (addOns.includes('garage_org')) {
    list.push({ id: 'ao_gorg', room: 'add-ons', task: 'Garage Organizing: Sort storage totes, sweep walkway, organize tool racks', isCompleted: false });
  }
  if (addOns.includes('cabinets_interior')) {
    list.push({ id: 'ao_cabs', room: 'add-ons', task: 'Inside Cabinets: Vacuum crumb dust & wipe shelf surfaces', isCompleted: false });
  }
  if (addOns.includes('pet_disinfect')) {
    list.push({ id: 'ao_petdis', room: 'add-ons', task: 'Pet Disinfection: Apply hospital-grade enzymatic treatment to targeted areas', isCompleted: false });
  }

  // Wrap-up & Quality Check
  list.push(
    { id: 'w1', room: 'wrap-up', task: 'Final walkthrough: check mirrors, chrome & baseboards against sunlight', isCompleted: false },
    { id: 'w2', room: 'wrap-up', task: 'Empty all trash cans to exterior receptacles & reline', isCompleted: false },
    { id: 'w3', room: 'wrap-up', task: 'Lockup check: confirm doors secured, AC set, lights turned off', isCompleted: false }
  );

  // Always-included custom items from Settings
  extraItems.forEach((task, i) => {
    if (task.trim()) {
      list.push({ id: `custom_${i}`, room: 'wrap-up', task: task.trim(), isCompleted: false });
    }
  });

  return list;
}
