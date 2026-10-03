import type { ReceiveNotificationResponse } from '../types';

export function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export function inferApiUrl(idInstance: string) {
  const digits = idInstance.replace(/\D/g, '');
  if (digits.length < 4) return '';
  return `https://${digits.slice(0, 4)}.api.green-api.com`;
}

export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }
  return digits;
}

export function isSupportedPhone(value: string) {
  const phone = normalizePhone(value);
  return (phone.startsWith('7') && phone.length === 11) || (phone.startsWith('375') && phone.length === 12);
}

export function formatPhone(value: string) {
  const phone = normalizePhone(value);
  if (phone.startsWith('7') && phone.length === 11) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9, 11)}`;
  }
  if (phone.startsWith('375') && phone.length === 12) {
    return `+375 ${phone.slice(3, 5)} ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10, 12)}`;
  }
  return value;
}

export function parseTextNotification(notification: ReceiveNotificationResponse) {
  const body = notification?.body;
  const type = body?.typeWebhook;
  const messageType = body?.messageData?.typeMessage;
  const text = body?.messageData?.textMessageData?.textMessage;
  const chatId = body?.senderData?.chatId ?? body?.senderData?.sender;

  if (type !== 'incomingMessageReceived' || messageType !== 'textMessage' || !text || !chatId) {
    return null;
  }

  return {
    id: body.idMessage || `incoming-${notification.receiptId}`,
    chatId,
    text,
    timestamp: (body.timestamp || Math.floor(Date.now() / 1000)) * 1000,
    senderName: body.senderData?.senderName || body.senderData?.chatName || '',
    phone: body.senderData?.senderPhoneNumber ? String(body.senderData.senderPhoneNumber) : undefined,
  };
}

export function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function mergeUniqueById<T extends { id: string }>(items: T[], item: T) {
  if (items.some((current) => current.id === item.id)) return items;
  return [...items, item].sort((a, b) => {
    const aTs = 'timestamp' in a ? Number(a.timestamp) : 0;
    const bTs = 'timestamp' in b ? Number(b.timestamp) : 0;
    return aTs - bTs;
  });
}
