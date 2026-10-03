# MAX Chat · GREEN-API

Тестовое задание на позицию Frontend React Developer: минималистичный интерфейс отправки и получения **только текстовых сообщений** в MAX через GREEN-API.

## Что реализовано

- React + TypeScript + Vite.
- Вход по `idInstance` и `apiTokenInstance`.
- `apiUrl` автоматически определяется по первым 4 цифрам `idInstance`; при необходимости его можно указать вручную из личного кабинета GREEN-API.
- Проверка соединения методом `getSettings`.
- Проверка номера и получение `chatId` через `checkAccount`.
- Отправка текста через `sendMessage`.
- Получение входящих уведомлений через HTTP API (`receiveNotification`) и подтверждение обработки через `deleteNotification`.
- В чат добавляются только `incomingMessageReceived` с `typeMessage === "textMessage"`; прочие уведомления корректно подтверждаются и пропускаются.
- Интерфейс в стиле web MAX: список чатов, активный чат, текстовые сообщения, адаптивная мобильная версия.
- Защита от дублей входящих сообщений по `idMessage`.
- Обработка ошибок API, лимит сообщения 4000 символов, Enter для отправки / Shift+Enter для переноса строки.
- Учетные данные не записываются в `localStorage`: они хранятся только в `sessionStorage` текущей вкладки.

## Требования GREEN-API

Для работы с получением сообщений через HTTP API у инстанса необходимо:

1. Авторизовать инстанс MAX в личном кабинете GREEN-API.
2. Включить входящие уведомления (`incomingWebhook: yes`).
3. Оставить `webhookUrl` пустым — иначе `ReceiveNotification` не работает.
4. Использовать номер РФ (`7...`) или Беларуси (`375...`) для метода `CheckAccount`, согласно документации MAX GREEN-API.

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте адрес, который покажет Vite (обычно `http://localhost:5173`).

## Проверки

```bash
npm test
npm run build
```

## Основные файлы

- `src/lib/greenApi.ts` — HTTP-клиент GREEN-API.
- `src/lib/utils.ts` — нормализация номера, разбор входящих уведомлений, вспомогательные функции.
- `src/App.tsx` — UI, состояние, long polling и сценарии чата.
- `src/styles.css` — адаптивный интерфейс без UI-библиотек.

## API методы

Приложение использует:

- `GET /waInstance{idInstance}/getSettings/{apiTokenInstance}`
- `POST /waInstance{idInstance}/checkAccount/{apiTokenInstance}`
- `POST /waInstance{idInstance}/sendMessage/{apiTokenInstance}`
- `GET /waInstance{idInstance}/receiveNotification/{apiTokenInstance}?receiveTimeout=5`
- `DELETE /waInstance{idInstance}/deleteNotification/{apiTokenInstance}/{receiptId}`

## Важное замечание

GREEN-API публикует `apiUrl`, `idInstance` и `apiTokenInstance` в личном кабинете. В тестовом задании явно указаны только `idInstance` и `apiTokenInstance`, поэтому приложение автоматически строит стандартный хост вида `https://XXXX.api.green-api.com` из первых четырех цифр инстанса и оставляет ручной ввод `apiUrl` в расширенных настройках на случай нестандартного хоста.
