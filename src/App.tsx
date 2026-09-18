import React, { useState, useEffect } from 'react';
import {
  Client,
  JobAppointment,
  Invoice,
  PricingSettings,
  EstimatorInput,
  BlockedTime,
  QuoteBreakdown,
  CleaningProgram,
  Referral,
  Expense,
  HelperShift,
  MarketingDraft,
  ClientActivityEntry,
  QuickNote,
  Partner,
} from './types';
import {
  generateReferralCode,
} from './utils/starterData';
import {
  DEFAULT_PRICING_SETTINGS,
  calculateEstimate,
  generateChecklistForJob,
} from './utils/pricingEngine';
import { nextRecurrenceDate } from './utils/recurring';
import { syncCollection, syncDoc, putDoc, removeDoc, putSettingsDoc } from './firebase';
import { signOutUser } from './components/AuthGate';
import { Navbar, AppTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MarketingHubView } from './components/MarketingHubView';
import { InboxView } from './components/InboxView';
import { EstimatorView } from './components/EstimatorView';
import { ScheduleView } from './components/ScheduleView';
import { ChecklistView } from './components/ChecklistView';
import { ClientsView } from './components/ClientsView';
import { InvoicesView } from './components/InvoicesView';
import { ExpensesView } from './components/ExpensesView';
import { TeamView } from './components/TeamView';
import { SettingsView } from './components/SettingsView';
import { ReferralsView } from './components/ReferralsView';
import { QuickCaptureButton } from './components/QuickCaptureButton';
import { PartnersView } from './components/PartnersView';

interface AppProps {
  userEmail: string;
}

export default function App({ userEmail }: AppProps) {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');

  // All business data lives in Firestore and syncs live between every
  // signed-in team member's device — nothing is stored only locally.
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<JobAppointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_PRICING_SETTINGS);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [helperShifts, setHelperShifts] = useState<HelperShift[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [marketingDrafts, setMarketingDrafts] = useState<MarketingDraft[]>([]);

  // Active job selected for checklist walkthrough
  const [selectedJobIdForChecklist, setSelectedJobIdForChecklist] = useState<string>('');

  // Initial input passed to estimator (e.g. when "Re-Quote" clicked on a client)
  const [estimatorInputData, setEstimatorInputData] = useState<Partial<EstimatorInput> | undefined>();

  // Pre-fill passed to the Marketing Hub (e.g. "Request a Review" quick action)
  const [marketingPrefill, setMarketingPrefill] = useState<
    | {
        mode: 'reply_email' | 'reply_post' | 'create_post';
        context: string;
        recipientEmail?: string;
        recipientPhone?: string;
        subject?: string;
      }
    | undefined
  >();
  const [unreadEmailCount, setUnreadEmailCount] = useState(0);

  // Subscribe to live Firestore data once, for the lifetime of the app shell.
  useEffect(() => {
    const unsubs = [
      syncCollection<Client>('clients', setClients),
      syncCollection<JobAppointment>('jobs', setJobs),
      syncCollection<Invoice>('invoices', setInvoices),
      syncCollection<BlockedTime>('blockedTimes', setBlockedTimes),
      syncCollection<Referral>('referrals', setReferrals),
      syncCollection<Expense>('expenses', setExpenses),
      syncCollection<HelperShift>('helperShifts', setHelperShifts),
      syncCollection<QuickNote>('quickNotes', setQuickNotes),
      syncCollection<Partner>('partners', setPartners),
      syncCollection<MarketingDraft>('marketingDrafts', setMarketingDrafts),
      syncDoc<PricingSettings>('settings/pricing', DEFAULT_PRICING_SETTINGS, (loaded) => {
        setSettings(loaded);
        // One-time auto-fill: if this Firestore doc predates the Zoho business
        // email field, write it in once so Riot doesn't have to re-type it.
        if (!loaded.businessEmail) {
          putSettingsDoc({ ...loaded, businessEmail: 'hello@cleanconvictions.com' });
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Find currently active in-progress job id
  const inProgressJob = jobs.find((j) => j.status === 'in-progress');

  // --- Handlers (every mutation writes straight to Firestore; the live
  // subscriptions above reflect the change back into state for everyone,
  // including this tab) ---

  // Book job from estimator
  const handleBookJobFromEstimator = (
    input: EstimatorInput,
    clientInfo: { name: string; phone: string; address: string; date: string; timeSlot: string }
  ) => {
    const referralDiscount = input.referralCode ? (settings.referralDiscountAmount || 25) : 0;
    const inputWithReferral: EstimatorInput = {
      ...input,
      referralCode: input.referralCode,
      referralDiscount,
    };
    const quote = calculateEstimate(inputWithReferral, settings);

    // Check if client exists or create a new client record
    let clientId = 'c-' + Date.now();
    const existing = clients.find(
      (c) => c.name.toLowerCase() === clientInfo.name.toLowerCase()
    );
    if (existing) {
      clientId = existing.id;
    } else {
      const newClient: Client = {
        id: clientId,
        name: clientInfo.name,
        phone: clientInfo.phone,
        email: '',
        address: clientInfo.address,
        city: 'Yuma',
        preferredFrequency: input.frequency,
        defaultProgram: input.program,
        sqft: input.sqft,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        condition: input.condition,
        isMilitary: input.isMilitaryOrVeteran,
        defaultAddOns: input.selectedAddOns,
        agreedRate: quote.finalPrice,
        status: 'active',
        referralCode: generateReferralCode(clientInfo.name, clientInfo.phone),
        referralCreditBalance: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };
      putDoc('clients', newClient.id, newClient);
    }

    // If a referral code was entered, match to existing referrer and record referral
    if (input.referralCode) {
      const cleanCode = input.referralCode.trim().toUpperCase();
      const referrer = clients.find(
        (c) => c.referralCode && c.referralCode.toUpperCase() === cleanCode
      );

      const newReferral: Referral = {
        id: 'ref-' + Date.now(),
        referrerClientId: referrer ? referrer.id : 'organic',
        referrerName: referrer ? referrer.name : 'Clean Convictions Promo',
        referrerCode: cleanCode,
        refereeName: clientInfo.name,
        refereePhone: clientInfo.phone,
        status: 'qualified',
        dateReferred: new Date().toISOString().split('T')[0],
        dateQualified: clientInfo.date,
        refereeDiscount: referralDiscount,
        rewardAmount: settings.referralRewardAmount || 25,
        notes: `Applied on estimate for ${clientInfo.date} service.`,
      };

      putDoc('referrals', newReferral.id, newReferral);

      // If known referrer, award them their $25 credit immediately
      if (referrer) {
        putDoc('clients', referrer.id, {
          ...referrer,
          referralCreditBalance: (referrer.referralCreditBalance || 0) + (settings.referralRewardAmount || 25),
        });
      }
    }

    const newJob: JobAppointment = {
      id: 'job-' + Date.now(),
      clientId,
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
      address: clientInfo.address,
      date: clientInfo.date,
      timeSlot: clientInfo.timeSlot,
      program: input.program,
      condition: input.condition,
      sqft: input.sqft,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      selectedAddOns: input.selectedAddOns,
      price: quote.finalPrice,
      status: 'scheduled',
      checklist: generateChecklistForJob(input.program, input.selectedAddOns, settings.extraChecklistItems),
      notes: `Booked from Clean Convictions Estimator. Rate: $${quote.finalPrice}${
        input.referralCode ? ` (Referral Code ${input.referralCode} applied: -$${referralDiscount})` : ''
      }`,
    };

    putDoc('jobs', newJob.id, newJob);
    setActiveTab('schedule');
  };

  // Save client from estimator
  const handleSaveClientFromEstimator = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...clientData,
      id: 'c-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    putDoc('clients', newClient.id, newClient);
    bumpPartnerReferralCount(newClient.partnerId);
    setActiveTab('clients');
  };

  // Update job status (e.g. start, finish)
  const handleUpdateJobStatus = (
    jobId: string,
    status: JobAppointment['status'],
    minutes?: number
  ) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    putDoc('jobs', jobId, {
      ...job,
      status,
      actualMinutes: minutes !== undefined ? minutes : job.actualMinutes,
    });
  };

  // Open checklist for specific job
  const handleOpenChecklist = (jobId: string) => {
    setSelectedJobIdForChecklist(jobId);
    setActiveTab('checklist');
  };

  // Toggle checklist item
  const handleToggleCheckItem = (jobId: string, itemId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const updatedChecklist = job.checklist.map((item) =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );
    putDoc('jobs', jobId, { ...job, checklist: updatedChecklist });
  };

  // Mark all checklist items complete
  const handleMarkAllCompleted = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    putDoc('jobs', jobId, {
      ...job,
      checklist: job.checklist.map((item) => ({ ...item, isCompleted: true })),
    });
  };

  // Save job note
  const handleSaveJobNotes = (jobId: string, notes: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    putDoc('jobs', jobId, { ...job, notes });
  };

  // Complete job and auto-generate invoice
  const handleCompleteJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    // Check if invoice already exists
    const existingInv = invoices.find((inv) => inv.jobId === jobId);
    let invId = existingInv?.id;

    if (!existingInv) {
      const newInvNumber = `CC-2026-${Math.floor(100 + Math.random() * 900)}`;
      const todayStr = new Date().toISOString().split('T')[0];
      const newInvoice: Invoice = {
        id: 'inv-' + Date.now(),
        invoiceNumber: newInvNumber,
        jobId: job.id,
        clientId: job.clientId,
        clientName: job.clientName,
        clientEmail: '',
        clientPhone: job.clientPhone,
        clientAddress: job.address,
        issueDate: todayStr,
        dueDate: todayStr,
        serviceDate: job.date,
        program: job.program,
        items: [
          {
            description: `${job.program.toUpperCase()} Cleaning (${job.sqft.toLocaleString()} sq ft • ${job.bedrooms} Bed / ${job.bathrooms} Bath)`,
            amount: job.price,
          },
        ],
        subtotal: job.price,
        discountTotal: 0,
        totalAmount: job.price,
        status: 'unpaid',
        notes: `Service completed and certified on ${todayStr}. Spot missed? 24-hr guarantee holds.`,
      };

      invId = newInvoice.id;
      putDoc('invoices', newInvoice.id, newInvoice);
    }

    putDoc('jobs', jobId, { ...job, status: 'completed', invoiceId: invId });

    // Auto-schedule the client's next visit if they're on a recurring
    // frequency, auto-recurring hasn't been turned off for them, and they
    // don't already have a future job on the books.
    const client = clients.find((c) => c.id === job.clientId);
    if (client && client.skipNextVisit) {
      // Consume the skip flag once, without auto-booking this cycle.
      putDoc('clients', client.id, { ...client, skipNextVisit: false });
    } else if (client && client.autoRecurring !== false) {
      const nextDate = nextRecurrenceDate(job.date, client.preferredFrequency);
      if (nextDate) {
        const hasFutureJob = jobs.some(
          (j) => j.clientId === client.id && j.date > job.date && j.status !== 'cancelled'
        );
        if (!hasFutureJob) {
          const nextJob: JobAppointment = {
            id: 'job-' + (Date.now() + 1),
            clientId: client.id,
            clientName: client.name,
            clientPhone: client.phone,
            address: client.address,
            date: nextDate,
            timeSlot: job.timeSlot,
            program: job.program,
            condition: client.condition,
            sqft: job.sqft,
            bedrooms: job.bedrooms,
            bathrooms: job.bathrooms,
            selectedAddOns: job.selectedAddOns,
            price: job.price,
            status: 'scheduled',
            checklist: generateChecklistForJob(job.program, job.selectedAddOns, settings.extraChecklistItems),
            notes: 'Auto-scheduled next recurring visit.',
          };
          putDoc('jobs', nextJob.id, nextJob);
        }
      }
    }
  };

  // Create invoice from job on schedule
  const handleCreateInvoiceFromJob = (job: JobAppointment) => {
    const existing = invoices.find((inv) => inv.jobId === job.id);
    if (existing) {
      setActiveTab('invoices');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber: `CC-2026-${Math.floor(100 + Math.random() * 900)}`,
      jobId: job.id,
      clientId: job.clientId,
      clientName: job.clientName,
      clientEmail: '',
      clientPhone: job.clientPhone,
      clientAddress: job.address,
      issueDate: todayStr,
      dueDate: todayStr,
      serviceDate: job.date,
      program: job.program,
      items: [
        {
          description: `${job.program.toUpperCase()} Home Cleaning (${job.sqft.toLocaleString()} sq ft)`,
          amount: job.price,
        },
      ],
      subtotal: job.price,
      discountTotal: 0,
      totalAmount: job.price,
      status: 'unpaid',
      notes: 'Clean Convictions flat rate billing. Payment due upon service completion.',
    };

    putDoc('invoices', newInvoice.id, newInvoice);
    setActiveTab('invoices');
  };

  // Add scheduled job
  const handleAddJob = (jobData: Omit<JobAppointment, 'id' | 'checklist'>) => {
    const newJob: JobAppointment = {
      ...jobData,
      id: 'job-' + Date.now(),
      checklist: generateChecklistForJob(jobData.program, jobData.selectedAddOns || [], settings.extraChecklistItems),
    };
    putDoc('jobs', newJob.id, newJob);
  };

  // Bumps a partner's referral tally whenever a client is saved with that partnerId —
  // called from every path that can create a client (manual add, Estimator save).
  const bumpPartnerReferralCount = (partnerId?: string) => {
    if (!partnerId) return;
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) return;
    putDoc('partners', partner.id, {
      ...partner,
      referredClientCount: (partner.referredClientCount || 0) + 1,
      status: partner.status === 'not_contacted' || partner.status === 'contacted' || partner.status === 'interested'
        ? 'partnered'
        : partner.status,
    });
  };

  // Clients CRM Actions
  const handleAddClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...clientData,
      id: 'c-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    putDoc('clients', newClient.id, newClient);
    bumpPartnerReferralCount(newClient.partnerId);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    putDoc('clients', updatedClient.id, updatedClient);
  };

  const handleDeleteClient = (clientId: string) => {
    removeDoc('clients', clientId);
  };

  const handleDeleteJob = (jobId: string) => {
    removeDoc('jobs', jobId);
  };

  // Load client specs into Estimator
  const handleLoadIntoEstimator = (input: Partial<EstimatorInput>) => {
    setEstimatorInputData(input);
    setActiveTab('estimator');
  };

  // Schedule for client from CRM
  const handleScheduleForClient = (
    client: Client,
    scheduleDetails?: { date: string; timeSlot: string; notes?: string; agreedRate?: number; program?: CleaningProgram }
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newJob: JobAppointment = {
      id: 'job-' + Date.now(),
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      address: client.address,
      date: scheduleDetails?.date || todayStr,
      timeSlot: scheduleDetails?.timeSlot || '8:00 AM - 11:30 AM (Morning)',
      program: scheduleDetails?.program || client.defaultProgram,
      condition: client.condition,
      sqft: client.sqft,
      bedrooms: client.bedrooms,
      bathrooms: client.bathrooms,
      selectedAddOns: client.defaultAddOns || [],
      price: scheduleDetails?.agreedRate ?? client.agreedRate,
      status: 'scheduled',
      checklist: generateChecklistForJob(
        scheduleDetails?.program || client.defaultProgram,
        client.defaultAddOns || [],
        settings.extraChecklistItems
      ),
      notes: scheduleDetails?.notes || client.specialInstructions || '',
    };
    putDoc('jobs', newJob.id, newJob);
    setActiveTab('schedule');
  };

  // Invoices actions
  const handleMarkPaid = (invoiceId: string, method: Invoice['paymentMethod']) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const todayStr = new Date().toISOString().split('T')[0];
    putDoc('invoices', invoiceId, { ...inv, status: 'paid', paidDate: todayStr, paymentMethod: method });
  };

  const handleCreateCustomInvoice = (invData: Omit<Invoice, 'id'>) => {
    const newInvoice: Invoice = {
      ...invData,
      id: 'inv-' + Date.now(),
    };
    putDoc('invoices', newInvoice.id, newInvoice);
  };

  // Blocked Times actions
  const handleAddBlockedTime = (blockedData: Omit<BlockedTime, 'id'>) => {
    const newBlocked: BlockedTime = {
      ...blockedData,
      id: 'block-' + Date.now(),
    };
    putDoc('blockedTimes', newBlocked.id, newBlocked);
  };

  const handleDeleteBlockedTime = (id: string) => {
    removeDoc('blockedTimes', id);
  };

  const handleUpdateJobRouteOrder = (jobId: string, routeOrder: number) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    putDoc('jobs', jobId, { ...job, routeOrder });
  };

  // Direct Invoice generation from Estimator
  const handleCreateInvoiceFromQuote = (
    breakdown: QuoteBreakdown,
    input: EstimatorInput,
    clientInfo: {
      name: string;
      phone: string;
      email?: string;
      address: string;
      date: string;
    }
  ) => {
    const todayStr = clientInfo.date || new Date().toISOString().split('T')[0];
    const dueDateStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const matchedClient = clients.find(
      (c) => c.name.toLowerCase() === clientInfo.name.toLowerCase()
    );

    const lineItems = [
      {
        id: 'item-1',
        description: `${input.program.toUpperCase()} Clean (${input.sqft.toLocaleString()} sq ft, ${input.bedrooms} bed, ${input.bathrooms} bath - ${input.condition} condition)`,
        amount: breakdown.subtotal - breakdown.addOnsTotal,
      },
    ];

    if (breakdown.addOnsTotal > 0 && input.selectedAddOns?.length) {
      lineItems.push({
        id: 'item-2',
        description: `Add-ons: ${input.selectedAddOns.join(', ')}`,
        amount: breakdown.addOnsTotal,
      });
    }

    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber: `CC-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: matchedClient ? matchedClient.id : 'client-' + Date.now(),
      clientName: clientInfo.name || (matchedClient ? matchedClient.name : 'Walk-in Client'),
      clientPhone: clientInfo.phone || (matchedClient ? matchedClient.phone : ''),
      clientEmail: clientInfo.email || (matchedClient ? matchedClient.email : ''),
      clientAddress: clientInfo.address || (matchedClient ? matchedClient.address : 'Yuma, AZ'),
      issueDate: todayStr,
      dueDate: dueDateStr,
      serviceDate: todayStr,
      program: input.program,
      items: lineItems,
      subtotal: breakdown.subtotal,
      discountTotal: breakdown.totalDiscount,
      totalAmount: breakdown.finalPrice,
      status: 'unpaid',
      notes: `Clean Convictions flat rate service quote. Frequency: ${input.frequency}. 24-Hour Free Re-Clean Guarantee included.`,
    };

    putDoc('invoices', newInvoice.id, newInvoice);
    setActiveTab('invoices');
  };

  // Settings action
  const handleSaveSettings = (newSettings: PricingSettings) => {
    putSettingsDoc(newSettings);
  };

  // Referral System Handlers
  const handleAddReferral = (newRef: Omit<Referral, 'id'>) => {
    const referral: Referral = {
      ...newRef,
      id: 'ref-' + Date.now(),
      dateReferred: newRef.dateReferred || new Date().toISOString().split('T')[0],
    };
    putDoc('referrals', referral.id, referral);
  };

  const handleUpdateReferral = (updated: Referral) => {
    putDoc('referrals', updated.id, updated);
  };

  const handleDeleteReferral = (refId: string) => {
    removeDoc('referrals', refId);
  };

  const handleAwardCreditToClient = (clientId: string, amount: number) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    putDoc('clients', clientId, {
      ...client,
      referralCreditBalance: Math.max(0, (client.referralCreditBalance || 0) + amount),
    });
  };

  // Expense tracking
  const handleAddExpense = (data: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { ...data, id: 'exp-' + Date.now() };
    putDoc('expenses', newExpense.id, newExpense);
  };

  const handleDeleteExpense = (id: string) => {
    removeDoc('expenses', id);
  };

  // Helper hours & pay
  const handleAddShift = (data: Omit<HelperShift, 'id' | 'payAmount'>) => {
    const newShift: HelperShift = {
      ...data,
      id: 'shift-' + Date.now(),
      payAmount: Math.round(data.hours * data.hourlyRate * 100) / 100,
    };
    putDoc('helperShifts', newShift.id, newShift);
  };

  const handleMarkShiftPaid = (id: string) => {
    const shift = helperShifts.find((s) => s.id === id);
    if (!shift) return;
    putDoc('helperShifts', id, { ...shift, paid: true, paidDate: new Date().toISOString().split('T')[0] });
  };

  const handleDeleteShift = (id: string) => {
    removeDoc('helperShifts', id);
  };

  // Quick Capture — zero-friction brain dump, available from every screen
  const handleAddQuickNote = (text: string) => {
    const newNote: QuickNote = {
      id: 'note-' + Date.now(),
      text,
      createdAt: new Date().toISOString(),
      isDone: false,
    };
    putDoc('quickNotes', newNote.id, newNote);
  };

  const handleToggleQuickNoteDone = (id: string, isDone: boolean) => {
    const note = quickNotes.find((n) => n.id === id);
    if (!note) return;
    putDoc('quickNotes', id, { ...note, isDone });
  };

  const handleDeleteQuickNote = (id: string) => {
    removeDoc('quickNotes', id);
  };

  // Partners — property managers, RV/mobile-home parks, HOAs, realtors: a B2B
  // referral channel tracked separately from individual clients.
  // Turns "Desert Skies RV Resort" into "DESERT-SKIES-RV-RESORT" — used both as
  // the code residents mention and as the ?ref= param on cleanconvictions.com,
  // where the site prettifies it back into a display name with no lookup needed.
  const slugifyPartnerCode = (text: string) =>
    text.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleAddPartner = (data: Omit<Partner, 'id' | 'createdAt'>) => {
    const code = data.referralCode && data.referralCode.trim()
      ? slugifyPartnerCode(data.referralCode)
      : slugifyPartnerCode(data.businessName);
    const newPartner: Partner = {
      ...data,
      id: 'partner-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
      referralCode: code,
    };
    putDoc('partners', newPartner.id, newPartner);
  };

  const handleUpdatePartner = (id: string, data: Partial<Partner>) => {
    const partner = partners.find((p) => p.id === id);
    if (!partner) return;
    putDoc('partners', id, { ...partner, ...data });
  };

  const handleDeletePartner = (id: string) => {
    removeDoc('partners', id);
  };

  // Jump to Marketing Hub pre-filled with a ready-to-send snowbird-season outreach
  // message for a property manager / RV park partner — ready-to-send, no AI needed.
  const handleDraftOutreach = (partner: Partner) => {
    const contactFirstName = partner.contactName ? partner.contactName.split(' ')[0] : 'there';
    const code = partner.referralCode || slugifyPartnerCode(partner.businessName);
    const bookingLink = `https://www.cleanconvictions.com/book?ref=${code}`;

    let context: string;
    let subject: string;

    switch (partner.type) {
      case 'realtor':
        // Realtors refer per-transaction (a listing, a closing) rather than
        // per-resident — the pitch and the payoff for them are both different.
        context = `Hi ${contactFirstName}, I'm Riot with Clean Convictions, a local Yuma cleaning company. I wanted to reach out about partnering with ${partner.businessName} on listing-prep and closing cleanings.\n\nHere's the offer: any client of yours who books through this link gets $25 off — ${bookingLink} — or they can just mention code ${code}. That covers move-out cleans before a listing goes live (homes show better and sell faster clean) and move-in cleans for your buyers at closing.\n\nFor you: every 2 referrals earns a free listing-prep cleaning you can use on your own listings, every 5 earns a free "closing gift" cleaning to hand a client at closing (a nice touch that keeps your name on their mind), and at 10 you get priority same-week scheduling on every listing plus a shoutout as a Preferred Cleaning Partner on our site and social.\n\nCan I drop off a few cards or QR flyers, or email you something to include in your closing packets? Happy to chat whenever works for you. Thank you!`;
        subject = `Cleaning Partnership for ${partner.businessName} Listings & Closings`;
        break;

      case 'mover':
      case 'senior_move_manager':
        // Movers and senior move managers both sit at the exact moment a
        // move-out/move-in clean becomes urgent — same pitch shape either way.
        context = `Hi ${contactFirstName}, I'm Riot with Clean Convictions, a local Yuma cleaning company. I wanted to reach out about partnering with ${partner.businessName} on move-out and move-in cleanings.\n\nHere's the offer: any client of yours who books through this link gets $25 off — ${bookingLink} — or they can just mention code ${code}. It's one less thing on their plate during an already stressful move.\n\nFor you: every 2 referrals earns a free cleaning for your own home or office, 5 earns $75 credit, and at 10 we set up a standing "movers + cleaners" bundle deal you can offer your customers, plus a shoutout as a Preferred Cleaning Partner.\n\nCould I drop off some cards, or something you could hand out when clients are scheduling their move? Happy to chat whenever works for you. Thank you!`;
        subject = `Cleaning Partnership for ${partner.businessName} Moves`;
        break;

      case 'vacation_rental_manager':
        // A different relationship entirely — usually a direct recurring
        // turnover-cleaning contract, not just a discount-code referral.
        context = `Hi ${contactFirstName}, I'm Riot with Clean Convictions, a local Yuma cleaning company. I wanted to talk about handling turnover cleaning for ${partner.businessName}'s short-term rentals.\n\nWe do same-day turnover cleaning between guests, and can offer a locked-in partner rate on your ongoing turnovers instead of one-off invoices. If you manage other properties or know other owners, referring us in earns real perks: 3 referrals gets you a free turnover on us, 6 gets $75 credit, and at 10 you get priority same-day scheduling across every listing you manage.\n\nWould you be open to a trial turnover on one property, no commitment, just to see the quality and turnaround? Happy to chat whenever works for you. Thank you!`;
        subject = `Turnover Cleaning Partnership for ${partner.businessName}`;
        break;

      default:
        context = `Hi ${contactFirstName}, I'm Riot with Clean Convictions, a local Yuma cleaning company. With snowbird season starting back up, I wanted to reach out about ${partner.businessName} — we'd love to be the cleaning service you recommend to residents heading into their winter homes.\n\nHere's the offer: any resident at ${partner.businessName} who books through this link gets $25 off their first cleaning automatically — ${bookingLink} — or they can just mention code ${code} when they call or text us. They get a fully clean, move-in-ready home the day they arrive for the season.\n\nFor you: once a few residents book, we'll clean your office or a common area free as a thank-you, and it keeps growing the more residents you send our way. I can drop off a few flyers or QR code cards, or email you something to include in a welcome packet — whatever's easiest.\n\nWould you be open to that? Happy to chat whenever works for you. Thank you!`;
        subject = `Winter/Snowbird Cleaning Special for ${partner.businessName} Residents`;
    }

    setMarketingPrefill({
      mode: 'create_post',
      context,
      recipientEmail: partner.email || undefined,
      recipientPhone: partner.phone || undefined,
      subject,
    });
    setActiveTab('marketing');
  };

  // Assign a job to a specific team member
  const handleAssignJob = (jobId: string, assignedTo: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    putDoc('jobs', jobId, { ...job, assignedTo: assignedTo || undefined });
  };

  // Cancel a job with an optional reason on file
  const handleCancelJob = (jobId: string, reason?: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    putDoc('jobs', jobId, { ...job, status: 'cancelled', cancellationReason: reason || job.cancellationReason });
  };

  // Reschedule a cancelled/existing job to a new date/time as a fresh scheduled job
  const handleRescheduleJob = (jobId: string, date: string, timeSlot: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const newJob: JobAppointment = {
      ...job,
      id: 'job-' + Date.now(),
      date,
      timeSlot,
      status: 'scheduled',
      actualMinutes: undefined,
      timerStartedAt: undefined,
      cancellationReason: undefined,
      invoiceId: undefined,
      checklist: generateChecklistForJob(job.program, job.selectedAddOns, settings.extraChecklistItems),
    };
    putDoc('jobs', newJob.id, newJob);
  };

  // Client tags (segmentation) and activity notes/timeline
  const handleUpdateClientTags = (clientId: string, tags: string[]) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    putDoc('clients', clientId, { ...client, tags });
  };

  const handleAddClientActivity = (clientId: string, note: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client || !note.trim()) return;
    const entry: ClientActivityEntry = {
      id: 'act-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      note: note.trim(),
    };
    putDoc('clients', clientId, { ...client, activityLog: [...(client.activityLog || []), entry] });
  };

  // Add a tip / extra charge to an existing invoice
  const handleAddInvoiceTip = (invoiceId: string, tipAmount: number) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    putDoc('invoices', invoiceId, {
      ...inv,
      tipAmount,
      totalAmount: inv.subtotal - inv.discountTotal + tipAmount,
    });
  };

  // Jump to the Marketing Hub pre-filled to draft a review request for a client
  const handleRequestReview = (client: Client) => {
    setMarketingPrefill({
      mode: 'create_post',
      context: `Hi ${client.name}, thank you so much for choosing Clean Convictions for your recent cleaning! If you have a minute, we'd really appreciate a quick Google review — it helps our small business a lot. Thank you!`,
      recipientEmail: client.email || undefined,
      recipientPhone: client.phone || undefined,
      subject: 'We would love your feedback!',
    });
    setActiveTab('marketing');
  };

  // Toggle a supply/expense item's low-stock flag
  const handleToggleLowStock = (expenseId: string) => {
    const exp = expenses.find((e) => e.id === expenseId);
    if (!exp) return;
    putDoc('expenses', expenseId, { ...exp, isLowStock: !exp.isLowStock });
  };

  // Do-Not-Serve flag on a client
  const handleSetDoNotServe = (clientId: string, doNotServe: boolean, reason?: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    putDoc('clients', clientId, { ...client, doNotServe, doNotServeReason: doNotServe ? reason : undefined });
  };

  // Skip just the next auto-recurring visit for a client (consumed once in handleCompleteJob)
  const handleToggleSkipNextVisit = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    putDoc('clients', clientId, { ...client, skipNextVisit: !client.skipNextVisit });
  };

  // Apply a late fee to an overdue unpaid invoice, based on settings.lateFeePercent
  const handleApplyLateFee = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const feePercent = settings.lateFeePercent || 0;
    const lateFeeAmount = Math.round(inv.subtotal * (feePercent / 100) * 100) / 100;
    putDoc('invoices', invoiceId, {
      ...inv,
      lateFeeAmount,
      totalAmount: inv.subtotal - inv.discountTotal + (inv.tipAmount || 0) + lateFeeAmount,
    });
  };

  // Jump to Marketing Hub pre-filled to draft a payment reminder for an overdue invoice
  const handleRequestPaymentReminder = (invoice: Invoice) => {
    setMarketingPrefill({
      mode: 'reply_email',
      context: `Hi ${invoice.clientName}, this is a friendly reminder that invoice ${invoice.invoiceNumber} ($${invoice.totalAmount}) for your cleaning on ${invoice.serviceDate} was due ${invoice.dueDate}. Please let us know if you have any questions — thank you!`,
      recipientEmail: invoice.clientEmail || undefined,
      recipientPhone: invoice.clientPhone || undefined,
      subject: `Payment reminder — Invoice ${invoice.invoiceNumber}`,
    });
    setActiveTab('marketing');
  };

  // Jump to Marketing Hub pre-filled to draft an "on our way" heads-up text for a job today
  const handleDraftOnMyWay = (job: JobAppointment) => {
    setMarketingPrefill({
      mode: 'reply_email',
      context: `Hi ${job.clientName}, just a heads up that we're on our way for your ${job.timeSlot} cleaning today. See you soon!`,
      recipientPhone: job.clientPhone || undefined,
      subject: "We're on our way!",
    });
    setActiveTab('marketing');
  };

  // Log mileage as a gas expense using the configured $/mile rate
  const handleLogMileage = (miles: number, date: string, jobId?: string) => {
    const rate = settings.mileageRate || 0.67;
    const amount = Math.round(miles * rate * 100) / 100;
    const job = jobId ? jobs.find((j) => j.id === jobId) : undefined;
    const newExpense: Expense = {
      id: 'exp-' + Date.now(),
      date,
      category: 'gas',
      description: `${miles} mi @ $${rate}/mi${job ? ` — ${job.clientName}` : ''}`,
      amount,
      jobId,
      clientId: job?.clientId,
    };
    putDoc('expenses', newExpense.id, newExpense);
  };

  // Set a 1-5 quality rating on a completed job
  const handleSetJobQuality = (jobId: string, rating: number) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    putDoc('jobs', jobId, { ...job, qualityRating: rating });
  };

  // Duplicate a job onto a new date (quick rebooking of a near-identical visit)
  const handleDuplicateJob = (jobId: string, date: string, timeSlot: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const newJob: JobAppointment = {
      ...job,
      id: 'job-' + Date.now(),
      date,
      timeSlot,
      status: 'scheduled',
      actualMinutes: undefined,
      timerStartedAt: undefined,
      cancellationReason: undefined,
      invoiceId: undefined,
      qualityRating: undefined,
      checklist: generateChecklistForJob(job.program, job.selectedAddOns, settings.extraChecklistItems),
    };
    putDoc('jobs', newJob.id, newJob);
  };

  // Record a partial payment against an invoice; auto-marks paid once fully covered
  const handleRecordPartialPayment = (invoiceId: string, amount: number, method: Invoice['paymentMethod']) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const newAmountPaid = (inv.amountPaid || 0) + amount;
    if (newAmountPaid >= inv.totalAmount) {
      const todayStr = new Date().toISOString().split('T')[0];
      putDoc('invoices', invoiceId, {
        ...inv,
        amountPaid: inv.totalAmount,
        status: 'paid',
        paidDate: todayStr,
        paymentMethod: method,
      });
    } else {
      putDoc('invoices', invoiceId, { ...inv, amountPaid: newAmountPaid });
    }
  };

  // Jump to Marketing Hub pre-filled to draft a thank-you note after an invoice is paid
  const handleDraftThankYou = (invoice: Invoice) => {
    setMarketingPrefill({
      mode: 'reply_email',
      context: `Hi ${invoice.clientName}, thank you so much for your payment on invoice ${invoice.invoiceNumber}! We really appreciate your business and look forward to cleaning for you again.`,
      recipientEmail: invoice.clientEmail || undefined,
      recipientPhone: invoice.clientPhone || undefined,
      subject: 'Thank you!',
    });
    setActiveTab('marketing');
  };

  // Jump to Marketing Hub pre-filled with this week's business stats, for a recap post/update
  const handleDraftWeeklyRecap = () => {
    const weekAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekJobsCompleted = jobs.filter((j) => j.status === 'completed' && j.date >= weekAgoStr).length;
    const weekRevenue = invoices
      .filter((i) => i.status === 'paid' && (i.paidDate || '') >= weekAgoStr)
      .reduce((sum, i) => sum + i.totalAmount, 0);
    const unpaidTotal = invoices.filter((i) => i.status === 'unpaid').reduce((sum, i) => sum + i.totalAmount, 0);
    setMarketingPrefill({
      mode: 'create_post',
      context: `This week: ${weekJobsCompleted} cleanings completed, $${weekRevenue} in revenue collected, $${unpaidTotal} currently outstanding in unpaid invoices.`,
    });
    setActiveTab('marketing');
  };

  // Marketing Hub
  const handleSaveMarketingDraft = (data: Omit<MarketingDraft, 'id' | 'createdAt'>) => {
    const newDraft: MarketingDraft = {
      ...data,
      id: 'draft-' + Date.now(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    putDoc('marketingDrafts', newDraft.id, newDraft);
  };

  const handleDeleteMarketingDraft = (id: string) => {
    removeDoc('marketingDrafts', id);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        jobs={jobs}
        invoices={invoices}
        clients={clients}
        activeJobId={inProgressJob?.id}
        pendingReferralsCount={referrals.filter((r) => r.status === 'pending').length}
        unreadEmailCount={unreadEmailCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (
          <DashboardView
            clients={clients}
            jobs={jobs}
            invoices={invoices}
            expenses={expenses}
            helperShifts={helperShifts}
            onNavigate={(tab) => setActiveTab(tab)}
            onDraftWeeklyRecap={handleDraftWeeklyRecap}
          />
        )}

        {activeTab === 'estimator' && (
          <EstimatorView
            settings={settings}
            clients={clients}
            partners={partners}
            onBookJob={handleBookJobFromEstimator}
            onSaveClient={handleSaveClientFromEstimator}
            onCreateInvoiceFromQuote={handleCreateInvoiceFromQuote}
            initialInput={estimatorInputData}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            jobs={jobs}
            clients={clients}
            blockedTimes={blockedTimes}
            settings={settings}
            onUpdateJobStatus={handleUpdateJobStatus}
            onOpenChecklist={handleOpenChecklist}
            onCreateInvoiceFromJob={handleCreateInvoiceFromJob}
            onAddJob={handleAddJob}
            onDeleteJob={handleDeleteJob}
            onAddBlockedTime={handleAddBlockedTime}
            onDeleteBlockedTime={handleDeleteBlockedTime}
            onUpdateJobRouteOrder={handleUpdateJobRouteOrder}
            onAssignJob={handleAssignJob}
            onCancelJob={handleCancelJob}
            onRescheduleJob={handleRescheduleJob}
            onDraftOnMyWay={handleDraftOnMyWay}
            onDuplicateJob={handleDuplicateJob}
          />
        )}

        {activeTab === 'checklist' && (
          <ChecklistView
            jobs={jobs}
            selectedJobId={selectedJobIdForChecklist}
            onToggleCheckItem={handleToggleCheckItem}
            onMarkAllCompleted={handleMarkAllCompleted}
            onSaveJobNotes={handleSaveJobNotes}
            onCompleteJob={handleCompleteJob}
            onSetJobQuality={handleSetJobQuality}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsView
            clients={clients}
            jobs={jobs}
            invoices={invoices}
            settings={settings}
            referrals={referrals}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onDeleteJob={handleDeleteJob}
            onLoadIntoEstimator={handleLoadIntoEstimator}
            onScheduleForClient={handleScheduleForClient}
            onUpdateClientTags={handleUpdateClientTags}
            onAddClientActivity={handleAddClientActivity}
            onRequestReview={handleRequestReview}
            onSetDoNotServe={handleSetDoNotServe}
            onToggleSkipNextVisit={handleToggleSkipNextVisit}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            invoices={invoices}
            clients={clients}
            onMarkPaid={handleMarkPaid}
            onCreateInvoice={handleCreateCustomInvoice}
            onAddInvoiceTip={handleAddInvoiceTip}
            onApplyLateFee={handleApplyLateFee}
            onRequestPaymentReminder={handleRequestPaymentReminder}
            onRecordPartialPayment={handleRecordPartialPayment}
            onDraftThankYou={handleDraftThankYou}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            clients={clients}
            jobs={jobs}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onToggleLowStock={handleToggleLowStock}
            onLogMileage={handleLogMileage}
            settings={settings}
          />
        )}

        {activeTab === 'team' && (
          <TeamView
            helperShifts={helperShifts}
            jobs={jobs}
            settings={settings}
            onAddShift={handleAddShift}
            onMarkShiftPaid={handleMarkShiftPaid}
            onDeleteShift={handleDeleteShift}
          />
        )}

        {activeTab === 'marketing' && (
          <MarketingHubView
            drafts={marketingDrafts}
            settings={settings}
            onSaveDraft={handleSaveMarketingDraft}
            onDeleteDraft={handleDeleteMarketingDraft}
            prefill={marketingPrefill}
            onPrefillConsumed={() => setMarketingPrefill(undefined)}
          />
        )}

        {activeTab === 'inbox' && (
          <InboxView settings={settings} onUnreadCountChange={setUnreadEmailCount} />
        )}

        {activeTab === 'partners' && (
          <PartnersView
            partners={partners}
            onAddPartner={handleAddPartner}
            onUpdatePartner={handleUpdatePartner}
            onDeletePartner={handleDeletePartner}
            onDraftOutreach={handleDraftOutreach}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {activeTab === 'referrals' && (
          <ReferralsView
            referrals={referrals}
            clients={clients}
            settings={settings}
            onAddReferral={handleAddReferral}
            onUpdateReferral={handleUpdateReferral}
            onDeleteReferral={handleDeleteReferral}
            onAwardCreditToClient={handleAwardCreditToClient}
            onUpdateClient={handleUpdateClient}
            onNavigateToEstimator={(info) => {
              setEstimatorInputData((prev) => ({
                ...prev,
                referralCode: info.referralCode,
              }));
              setActiveTab('estimator');
            }}
          />
        )}
      </main>

      {/* Bottom Sticky Status Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 sm:px-8 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 print:hidden">
        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <span className="font-semibold text-slate-800">Clean Convictions Solo Operations</span>
          <span>•</span>
          <span>Yuma, Arizona</span>
          <span>•</span>
          <a
            href="https://cleanconvictions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline font-medium"
          >
            cleanconvictions.com
          </a>
          {settings.businessPhone && (
            <>
              <span>•</span>
              <a href={`tel:${settings.businessPhone}`} className="text-emerald-700 hover:underline font-medium">
                {settings.businessPhone}
              </a>
            </>
          )}
          {settings.businessEmail && (
            <>
              <span>•</span>
              <a href={`mailto:${settings.businessEmail}`} className="text-emerald-700 hover:underline font-medium">
                {settings.businessEmail}
              </a>
            </>
          )}
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span>24-Hour Free Re-Clean Guarantee Standard</span>
          <span>•</span>
          <span>Synced live</span>
          <span>•</span>
          <span className="text-slate-500">{userEmail}</span>
          <button
            onClick={signOutUser}
            className="text-slate-500 hover:text-rose-600 underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </footer>

      <QuickCaptureButton
        notes={quickNotes}
        onAdd={handleAddQuickNote}
        onToggleDone={handleToggleQuickNoteDone}
        onDelete={handleDeleteQuickNote}
      />
    </div>
  );
}
