import { apiRequest } from "./queryClient";
import { Conversation, Message, Source } from "@shared/schema";

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
  usage: {
    tokens_prompt: number;
    tokens_completion: number;
    model: string;
  };
}

export const conversationService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await apiRequest("GET", "/api/conversations");
    return response.json();
  },

  async createConversation(title?: string): Promise<Conversation> {
    const response = await apiRequest("POST", "/api/conversations", { title });
    return response.json();
  },

  async deleteConversation(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/conversations/${id}`);
  },

  async getMessages(conversationId: number | string): Promise<Message[]> {
    const response = await apiRequest("GET", `/api/conversations/${conversationId}/messages`);
    return response.json();
  },

  async sendMessage(conversationId: number | string, content: string): Promise<SendMessageResponse> {
    const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content });
    return response.json();
  }
};
