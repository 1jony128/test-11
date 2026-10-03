import { describe, expect, it } from 'vitest';
import { inferApiUrl, isSupportedPhone, normalizePhone, parseTextNotification } from './utils';

describe('utils', () => {
  it('infers GREEN-API host from the first four instance digits', () => {
    expect(inferApiUrl('310000001')).toBe('https://3100.api.green-api.com');
  });

  it('normalizes Russian phone numbers starting with 8', () => {
    expect(normalizePhone('8 (999) 123-45-67')).toBe('79991234567');
    expect(isSupportedPhone('8 (999) 123-45-67')).toBe(true);
  });

  it('accepts Belarus phone numbers', () => {
    expect(isSupportedPhone('+375 29 123-45-67')).toBe(true);
  });

  it('extracts only incoming text messages from a notification', () => {
    const parsed = parseTextNotification({
      receiptId: 15,
      body: {
        typeWebhook: 'incomingMessageReceived',
        timestamp: 1763115112,
        idMessage: 'm1',
        senderData: { chatId: '10000000', senderName: 'Тест' },
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
      },
    });

    expect(parsed).toMatchObject({ id: 'm1', chatId: '10000000', text: 'Привет', senderName: 'Тест' });
  });
});
