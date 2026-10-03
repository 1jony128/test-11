import type { Credentials, ReceiveNotificationResponse } from '../types';
import { normalizeApiUrl } from './utils';

export class GreenApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
    this.payload = payload;
  }
}

function endpoint(credentials: Credentials, method: string, suffix = '') {
  const apiUrl = normalizeApiUrl(credentials.apiUrl);
  const { idInstance, apiTokenInstance } = credentials;
  return `${apiUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    const object = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : null;
    const reason = object?.reason || object?.message || payload;
    throw new GreenApiError(
      typeof reason === 'string' ? reason : `GREEN-API вернул HTTP ${response.status}`,
      response.status,
      payload,
    );
  }

  return payload as T;
}

export async function getSettings(credentials: Credentials) {
  return request<Record<string, unknown>>(endpoint(credentials, 'getSettings'));
}

export async function checkAccount(credentials: Credentials, phoneNumber: string) {
  return request<{ exist?: boolean; chatId?: string; fromCache?: boolean; status?: boolean; reason?: string }>(
    endpoint(credentials, 'checkAccount'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
    },
  );
}

export async function sendMessage(credentials: Credentials, chatId: string, message: string) {
  return request<{ idMessage?: string }>(endpoint(credentials, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
}

export async function receiveNotification(credentials: Credentials, receiveTimeout = 5) {
  const url = `${endpoint(credentials, 'receiveNotification')}?receiveTimeout=${receiveTimeout}`;
  return request<ReceiveNotificationResponse | null>(url);
}

export async function deleteNotification(credentials: Credentials, receiptId: number) {
  return request<{ result: boolean; reason?: string }>(
    endpoint(credentials, 'deleteNotification', `/${receiptId}`),
    { method: 'DELETE' },
  );
}
