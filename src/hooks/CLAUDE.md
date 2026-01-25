# React Hooks

## Overview
Custom React hooks for state management and API interactions.

## File Structure
```
hooks/
├── chat/                    # Teacher chat system
│   ├── index.ts            # Barrel export
│   ├── types.ts            # Shared types
│   ├── useTeacherChat.ts   # Main hook (~80 lines)
│   ├── useSession.ts       # Session management
│   └── useMessages.ts      # Message handling + streaming
├── useAuth.ts              # Authentication
├── useTeacherChat.ts       # Re-export for backwards compatibility
└── ...
```

## Patterns

### Composing Hooks
```typescript
// Main hook composes smaller hooks
export function useTeacherChat(options) {
  const session = useSession(options);
  const messages = useMessages({ ...options, saveSession: session.saveSession });

  return { ...session, ...messages };
}
```

### Streaming Responses
```typescript
// Handle SSE streaming from Edge Functions
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process chunks...
}
```

## Size Limits
- Main hook: ≤100 lines
- Helper hooks: ≤150 lines
- Types file: ≤100 lines

## Testing
Hooks should be testable in isolation using React Testing Library.
