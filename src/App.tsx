import { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Chat, ChatMessage, Credentials } from './types';
import { checkAccount, deleteNotification, getSettings, GreenApiError, receiveNotification, sendMessage } from './lib/greenApi';
import { formatMessageTime, formatPhone, inferApiUrl, isSupportedPhone, mergeUniqueById, normalizeApiUrl, normalizePhone, parseTextNotification } from './lib/utils';
import { BackIcon, ChevronIcon, LogoutIcon, PlusIcon, SearchIcon, SendIcon } from './components/Icons';

const CREDENTIALS_KEY = 'max-green-api-credentials';
const CHAT_STATE_KEY = 'max-green-api-chat-state';

function readCredentials(): Credentials | null {
  try {
    const value = sessionStorage.getItem(CREDENTIALS_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function readChatState(): { chats: Chat[]; messages: ChatMessage[] } {
  try {
    const value = localStorage.getItem(CHAT_STATE_KEY);
    return value ? JSON.parse(value) : { chats: [], messages: [] };
  } catch {
    return { chats: [], messages: [] };
  }
}

function initials(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'M';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function messageError(error: unknown) {
  if (error instanceof GreenApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Неизвестная ошибка';
}

function App() {
  const initial = useMemo(() => readChatState(), []);
  const [credentials, setCredentials] = useState<Credentials | null>(() => readCredentials());
  const [chats, setChats] = useState<Chat[]>(initial.chats);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [activeChatId, setActiveChatId] = useState<string | null>(initial.chats[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(Boolean(initial.chats[0]));
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    localStorage.setItem(CHAT_STATE_KEY, JSON.stringify({ chats, messages }));
  }, [chats, messages]);

  useEffect(() => {
    if (!credentials) return;
    let stopped = false;

    const poll = async () => {
      while (!stopped) {
        try {
          const notification = await receiveNotification(credentials, 5);
          if (!notification || stopped) continue;

          const parsed = parseTextNotification(notification);
          if (parsed) {
            setMessages((current) => mergeUniqueById(current, {
              id: parsed.id,
              chatId: parsed.chatId,
              text: parsed.text,
              direction: 'incoming',
              timestamp: parsed.timestamp,
              status: 'sent',
            }));

            setChats((current) => {
              const existing = current.find((chat) => chat.id === parsed.chatId);
              const updated: Chat = {
                id: parsed.chatId,
                phone: parsed.phone ?? existing?.phone,
                title: parsed.senderName || existing?.title || (parsed.phone ? formatPhone(parsed.phone) : `Чат ${parsed.chatId}`),
                lastMessage: parsed.text,
                updatedAt: parsed.timestamp,
                unread: activeChatId === parsed.chatId ? 0 : (existing?.unread ?? 0) + 1,
              };
              return [updated, ...current.filter((chat) => chat.id !== parsed.chatId)]
                .sort((a, b) => b.updatedAt - a.updatedAt);
            });
          }

          await deleteNotification(credentials, notification.receiptId);
          setConnectionError('');
        } catch (error) {
          if (stopped) return;
          setConnectionError(messageError(error));
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
      }
    };

    void poll();
    return () => { stopped = true; };
  }, [credentials, activeChatId]);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;
  const activeMessages = messages.filter((message) => message.chatId === activeChatId);
  const filteredChats = chats.filter((chat) => {
    const value = `${chat.title} ${chat.phone ?? ''}`.toLowerCase();
    return value.includes(search.toLowerCase());
  });

  const markReadAndOpen = (chatId: string) => {
    setActiveChatId(chatId);
    setMobileChatOpen(true);
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, unread: 0 } : chat));
  };

  const logout = () => {
    sessionStorage.removeItem(CREDENTIALS_KEY);
    setCredentials(null);
    setConnectionError('');
  };

  if (!credentials) {
    return <LoginScreen onConnected={(value) => {
      sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(value));
      setCredentials(value);
    }} />;
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileChatOpen ? 'mobile-hidden' : ''}`}>
        <div className="sidebar-topbar">
          <div className="brand-mark" aria-label="MAX">M</div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setNewChatOpen(true)} aria-label="Новый чат" title="Новый чат">
              <PlusIcon />
            </button>
            <button className="icon-button" onClick={logout} aria-label="Выйти" title="Сменить инстанс">
              <LogoutIcon />
            </button>
          </div>
        </div>

        <div className="search-wrap">
          <SearchIcon className="search-icon" />
          <input value={search} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)} placeholder="Поиск" aria-label="Поиск чатов" />
        </div>

        {connectionError && (
          <div className="connection-banner" title={connectionError}>
            <span className="status-dot status-dot--error" />
            <span>Нет соединения с GREEN-API</span>
          </div>
        )}

        <div className="chat-list">
          {filteredChats.length === 0 ? (
            <div className="empty-list">
              <div className="empty-list-icon"><PlusIcon /></div>
              <strong>{search ? 'Ничего не найдено' : 'Пока нет чатов'}</strong>
              {!search && <button onClick={() => setNewChatOpen(true)}>Начать переписку</button>}
            </div>
          ) : filteredChats.map((chat) => (
            <button
              key={chat.id}
              className={`chat-row ${activeChatId === chat.id ? 'chat-row--active' : ''}`}
              onClick={() => markReadAndOpen(chat.id)}
            >
              <div className="avatar">{initials(chat.title)}</div>
              <div className="chat-row-content">
                <div className="chat-row-titleline">
                  <strong>{chat.title}</strong>
                  <time>{chat.updatedAt ? formatMessageTime(chat.updatedAt) : ''}</time>
                </div>
                <div className="chat-row-previewline">
                  <span>{chat.lastMessage || (chat.phone ? formatPhone(chat.phone) : 'Новый чат')}</span>
                  {!!chat.unread && <b className="unread-badge">{chat.unread > 99 ? '99+' : chat.unread}</b>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={`chat-pane ${mobileChatOpen ? 'mobile-visible' : ''}`}>
        {activeChat ? (
          <ChatView
            chat={activeChat}
            messages={activeMessages}
            credentials={credentials}
            onBack={() => setMobileChatOpen(false)}
            onMessageUpdate={(message) => {
              setMessages((current) => mergeUniqueById(current.filter((item) => item.id !== message.id), message));
              setChats((current) => current.map((chat) => chat.id === message.chatId ? {
                ...chat,
                lastMessage: message.text,
                updatedAt: message.timestamp,
              } : chat).sort((a, b) => b.updatedAt - a.updatedAt));
            }}
          />
        ) : (
          <div className="desktop-empty">
            <div className="desktop-empty-mark">M</div>
            <h1>MAX Chat</h1>
            <p>Выберите чат или создайте новый, чтобы отправить сообщение через GREEN-API.</p>
            <button className="primary-button compact" onClick={() => setNewChatOpen(true)}><PlusIcon /> Новый чат</button>
          </div>
        )}
      </section>

      {newChatOpen && (
        <NewChatDialog
          credentials={credentials}
          onClose={() => setNewChatOpen(false)}
          onCreated={(chat) => {
            setChats((current) => [chat, ...current.filter((item) => item.id !== chat.id)]);
            setActiveChatId(chat.id);
            setMobileChatOpen(true);
            setNewChatOpen(false);
          }}
        />
      )}
    </main>
  );
}

function LoginScreen({ onConnected }: { onConnected: (credentials: Credentials) => void }) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inferred = inferApiUrl(idInstance);
  const apiUrl = normalizeApiUrl(customApiUrl || inferred);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!/^\d+$/.test(idInstance.trim())) {
      setError('idInstance должен состоять из цифр.');
      return;
    }
    if (!apiTokenInstance.trim()) {
      setError('Введите apiTokenInstance.');
      return;
    }
    if (!apiUrl) {
      setError('Не удалось определить apiUrl. Укажите его из личного кабинета GREEN-API.');
      return;
    }

    const credentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
      apiUrl,
    };

    setLoading(true);
    try {
      const settings = await getSettings(credentials);
      if (settings.webhookUrl) {
        setError('Для HTTP API поле webhookUrl должно быть пустым. Очистите Webhook URL в настройках инстанса и повторите подключение.');
        return;
      }
      onConnected(credentials);
    } catch (requestError) {
      setError(`${messageError(requestError)}. Проверьте idInstance, токен и apiUrl.`);
      setAdvanced(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">M</div>
        <h1>MAX Chat</h1>
        <p className="login-subtitle">Минималистичный веб-клиент для текстовых сообщений через GREEN-API</p>

        <form onSubmit={submit} className="login-form">
          <label>
            <span>idInstance</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={idInstance}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setIdInstance(event.target.value.replace(/\s/g, ''))}
              placeholder="310000001"
            />
          </label>
          <label>
            <span>apiTokenInstance</span>
            <input
              type="password"
              autoComplete="off"
              value={apiTokenInstance}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setApiTokenInstance(event.target.value)}
              placeholder="Введите токен"
            />
          </label>

          <button type="button" className="advanced-toggle" onClick={() => setAdvanced((value) => !value)}>
            Настройки API <ChevronIcon className={advanced ? 'chevron-up' : ''} />
          </button>
          {advanced && (
            <label className="advanced-field">
              <span>apiUrl</span>
              <input
                type="url"
                value={customApiUrl}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCustomApiUrl(event.target.value)}
                placeholder={inferred || 'https://3100.api.green-api.com'}
              />
              <small>Обычно определяется по idInstance. При необходимости вставьте точный apiUrl из личного кабинета.</small>
            </label>
          )}

          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Подключение…' : 'Войти в чат'}
          </button>
        </form>

        <p className="security-note">Данные доступа хранятся только в sessionStorage текущей вкладки и удаляются при выходе.</p>
      </section>
    </main>
  );
}

function NewChatDialog({ credentials, onClose, onCreated }: {
  credentials: Credentials;
  onClose: () => void;
  onCreated: (chat: Chat) => void;
}) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const normalized = normalizePhone(phone);

    if (!isSupportedPhone(normalized)) {
      setError('Введите номер РФ (+7) или Беларуси (+375) в международном формате.');
      return;
    }

    setLoading(true);
    try {
      const response = await checkAccount(credentials, normalized);
      if (response.status === false) throw new Error(response.reason || 'Инстанс не готов');
      if (!response.exist || !response.chatId) {
        setError('На этом номере не найден аккаунт MAX.');
        return;
      }
      onCreated({
        id: response.chatId,
        phone: normalized,
        title: formatPhone(normalized),
        updatedAt: Date.now(),
        unread: 0,
      });
    } catch (requestError) {
      setError(messageError(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.target === event.currentTarget && onClose()}>
      <form className="dialog" onSubmit={submit}>
        <div className="dialog-header">
          <div>
            <h2>Новый чат</h2>
            <p>Введите номер пользователя MAX</p>
          </div>
          <button type="button" className="dialog-close" onClick={onClose}>×</button>
        </div>
        <label>
          <span>Номер телефона</span>
          <input ref={inputRef} value={phone} onChange={(event: ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)} placeholder="+7 999 123-45-67" inputMode="tel" />
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Отмена</button>
          <button className="primary-button compact" disabled={loading}>
            {loading ? <span className="spinner" /> : <PlusIcon />}
            {loading ? 'Проверка…' : 'Создать чат'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatView({ chat, messages, credentials, onBack, onMessageUpdate }: {
  chat: Chat;
  messages: ChatMessage[];
  credentials: Credentials;
  onBack: () => void;
  onMessageUpdate: (message: ChatMessage) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setError('');
    setText('');
    textareaRef.current?.focus();
  }, [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, chat.id]);

  const submit = async () => {
    const value = text.trim();
    if (!value || sending) return;
    if (value.length > 4000) {
      setError('Максимальная длина сообщения — 4000 символов.');
      return;
    }

    const temporaryId = `local-${crypto.randomUUID()}`;
    const optimistic: ChatMessage = {
      id: temporaryId,
      chatId: chat.id,
      text: value,
      direction: 'outgoing',
      timestamp: Date.now(),
      status: 'sending',
    };

    setText('');
    setError('');
    setSending(true);
    onMessageUpdate(optimistic);

    try {
      await sendMessage(credentials, chat.id, value);
      onMessageUpdate({ ...optimistic, status: 'sent' });
    } catch (requestError) {
      onMessageUpdate({ ...optimistic, status: 'error' });
      setError(messageError(requestError));
    } finally {
      setSending(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <>
      <header className="chat-header">
        <button className="icon-button mobile-back" onClick={onBack} aria-label="Назад"><BackIcon /></button>
        <div className="avatar avatar--header">{initials(chat.title)}</div>
        <div className="chat-header-copy">
          <strong>{chat.title}</strong>
          <span><i className="status-dot" /> MAX · GREEN-API</span>
        </div>
      </header>

      <div className="messages-area">
        <div className="messages-inner">
          <div className="date-chip">Сегодня</div>
          {messages.length === 0 && (
            <div className="conversation-start">
              <div className="conversation-avatar">{initials(chat.title)}</div>
              <strong>{chat.title}</strong>
              <span>Начните переписку</span>
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className={`message-line message-line--${message.direction}`}>
              <div className={`message-bubble ${message.status === 'error' ? 'message-bubble--error' : ''}`}>
                <div>{message.text}</div>
                <div className="message-meta">
                  <time>{formatMessageTime(message.timestamp)}</time>
                  {message.direction === 'outgoing' && (
                    <span aria-label={message.status === 'error' ? 'Ошибка отправки' : message.status === 'sending' ? 'Отправляется' : 'Отправлено'}>
                      {message.status === 'error' ? '!' : message.status === 'sending' ? '·' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="composer-wrap">
        {error && <div className="composer-error">{error}</div>}
        <div className="composer">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            maxLength={4000}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение"
            aria-label="Текст сообщения"
          />
          <button className="send-button" onClick={() => void submit()} disabled={!text.trim() || sending} aria-label="Отправить">
            <SendIcon />
          </button>
        </div>
        <span className="composer-hint">Enter — отправить · Shift+Enter — новая строка</span>
      </footer>
    </>
  );
}

export default App;
