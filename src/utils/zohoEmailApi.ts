import { PricingSettings } from '../types';

export interface InboxMessage {
  id: string;
  from: string;
  to?: string;
  sender: string;
  subject: string;
  snippet: string;
  receivedTime: string;
  isUnread: boolean;
}

export interface MailFolder {
  folderId: string;
  folderName: string;
  folderType: string;
}

// The Zoho email endpoints live on the same Cloudflare Worker as the
// Marketing AI drafting endpoint (same URL/secret — see Settings -> Marketing AI).
export function isZohoEmailConfigured(settings: PricingSettings): boolean {
  return !!(settings.marketingAiEndpoint && settings.marketingAiSecret);
}

function workerUrl(settings: PricingSettings, path: string): string {
  const base = (settings.marketingAiEndpoint || '').replace(/\/$/, '');
  return `${base}${path}`;
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchFolders(settings: PricingSettings): Promise<MailFolder[]> {
  const res = await fetch(workerUrl(settings, '/email/folders'), {
    headers: { 'X-App-Secret': settings.marketingAiSecret as string },
  });
  const data = await handle<{ folders: MailFolder[] }>(res);
  return data.folders || [];
}

export async function fetchMessages(
  settings: PricingSettings,
  folderId: string,
  limit = 20
): Promise<InboxMessage[]> {
  const res = await fetch(
    workerUrl(settings, `/email/messages?folderId=${encodeURIComponent(folderId)}&limit=${limit}`),
    { headers: { 'X-App-Secret': settings.marketingAiSecret as string } }
  );
  const data = await handle<{ messages: InboxMessage[] }>(res);
  return data.messages || [];
}

export async function fetchMessageContent(
  settings: PricingSettings,
  id: string,
  folderId: string
): Promise<string> {
  const res = await fetch(
    workerUrl(settings, `/email/message?id=${encodeURIComponent(id)}&folderId=${encodeURIComponent(folderId)}`),
    { headers: { 'X-App-Secret': settings.marketingAiSecret as string } }
  );
  const data = await handle<{ content: string }>(res);
  return data.content || '';
}

export async function deleteMessage(
  settings: PricingSettings,
  id: string,
  folderId: string,
  permanent = false
): Promise<void> {
  const res = await fetch(
    workerUrl(
      settings,
      `/email/message?id=${encodeURIComponent(id)}&folderId=${encodeURIComponent(folderId)}${permanent ? '&permanent=true' : ''}`
    ),
    { method: 'DELETE', headers: { 'X-App-Secret': settings.marketingAiSecret as string } }
  );
  await handle<{ deleted: boolean }>(res);
}

export async function sendEmail(
  settings: PricingSettings,
  to: string,
  subject: string,
  body: string,
  cc?: string
): Promise<void> {
  const res = await fetch(workerUrl(settings, '/email/send'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Secret': settings.marketingAiSecret as string,
    },
    body: JSON.stringify({ to, subject, body, cc }),
  });
  await handle<{ sent: boolean }>(res);
}
