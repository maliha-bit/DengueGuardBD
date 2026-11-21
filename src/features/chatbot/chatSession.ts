import type { ChatMessage } from '@/api/types';

/**
 * In-memory chat for this browser session: survives moving between pages, cleared by
 * "New chat" or a reload. Logged-in users' chats are also saved through the API.
 */
let session: ChatMessage[] = [];

export const getChatSession = () => session;
export const setChatSession = (messages: ChatMessage[]) => {
  session = messages;
};
/** Tests reset this between cases. */
export const resetChatSession = () => {
  session = [];
};
