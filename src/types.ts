export type Credentials = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

export type Chat = {
  id: string;
  phone?: string;
  title: string;
  lastMessage?: string;
  updatedAt: number;
  unread?: number;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  text: string;
  direction: 'incoming' | 'outgoing';
  timestamp: number;
  status?: 'sending' | 'sent' | 'error';
};

export type ReceiveNotificationResponse = {
  receiptId: number;
  body: {
    typeWebhook?: string;
    timestamp?: number;
    idMessage?: string;
    senderData?: {
      chatId?: string;
      chatName?: string;
      sender?: string;
      senderName?: string;
      senderPhoneNumber?: number;
    };
    messageData?: {
      typeMessage?: string;
      textMessageData?: {
        textMessage?: string;
      };
    };
  };
};
