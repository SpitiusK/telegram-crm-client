---
paths:
  - src/stores/**
---

# Zustand Store Rules

## Naming & Structure

- One store per domain: `auth.ts`, `chats.ts`, `crm.ts`, `ui.ts`
- Export as `useAuthStore`, `useChatStore`, `useCrmStore`, `useUiStore`
- Use `create<StateInterface>()(...)` pattern with typed interface
- Keep state shape flat -- avoid deeply nested objects

## IPC Access

Stores call Telegram/CRM through wrapper modules (`src/lib/telegram.ts`, `src/lib/crm-api.ts`).
**Never call `window.electronAPI.*` directly** from store code -- always go through the typed wrapper.

## Actions

Define actions as methods inside the store interface, not as standalone functions.
Actions that call IPC should handle loading/error state within the store:
```ts
fetchDialogs: async () => {
  set({ isLoading: true, error: null })
  try {
    const dialogs = await telegramAPI.getDialogs(...)
    set({ dialogs, isLoading: false })
  } catch (e) {
    set({ error: (e as Error).message, isLoading: false })
  }
}
```
