package eu.eventnexus.adminsupport.data.repository

import eu.eventnexus.adminsupport.data.models.ChatMessage
import eu.eventnexus.adminsupport.data.models.SupportChat
import eu.eventnexus.adminsupport.data.remote.SupabaseClientInstance
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class ChatRepository {
    private val client = SupabaseClientInstance.client

    suspend fun getOpenChats(adminId: String): List<SupportChat> {
        return client.from("support_chats")
            .select(
                columns = Columns.raw("""
                    *,
                    users!user_id(email, full_name),
                    last_message:support_chat_messages(message, created_at)
                """.trimIndent())
            ) {
                filter {
                    or {
                        eq("status", "open")
                        and {
                            eq("status", "assigned")
                            eq("assigned_to", adminId)
                        }
                    }
                }
                order("updated_at", ascending = false)
            }
            .decodeList<SupportChat>()
    }

    suspend fun getChatMessages(chatId: String): List<ChatMessage> {
        return client.from("support_chat_messages")
            .select {
                filter {
                    eq("chat_id", chatId)
                }
                order("created_at", ascending = true)
            }
            .decodeList<ChatMessage>()
    }

    suspend fun sendMessage(chatId: String, adminId: String, message: String): ChatMessage {
        val newMessage = buildJsonObject {
            put("chat_id", chatId)
            put("sender_id", adminId)
            put("sender_type", "admin")
            put("message", message)
        }

        val result = client.from("support_chat_messages")
            .insert(newMessage) {
                select()
            }
            .decodeSingle<ChatMessage>()

        // Update chat status and last_message_at
        client.from("support_chats")
            .update({
                set("updated_at", "now()")
                set("last_message_at", "now()")
                set("status", "assigned")
                set("assigned_to", adminId)
            }) {
                filter {
                    eq("id", chatId)
                }
            }

        return result
    }

    suspend fun assignChat(chatId: String, adminId: String) {
        client.from("support_chats")
            .update({
                set("status", "assigned")
                set("assigned_to", adminId)
                set("updated_at", "now()")
            }) {
                filter {
                    eq("id", chatId)
                }
            }
    }

    suspend fun resolveChat(chatId: String) {
        client.from("support_chats")
            .update({
                set("status", "resolved")
                set("updated_at", "now()")
            }) {
                filter {
                    eq("id", chatId)
                }
            }
    }

    suspend fun markMessagesAsRead(chatId: String, adminId: String) {
        client.from("support_chat_messages")
            .update({
                set("is_read", true)
            }) {
                filter {
                    eq("chat_id", chatId)
                    eq("sender_type", "user")
                    eq("is_read", false)
                }
            }
    }

    suspend fun getAiSuggestion(chatId: String, userMessage: String): String? {
        // Call Edge Function for AI suggestion
        val response = client.functions.invoke(
            function = "ai-support-chat",
            body = buildJsonObject {
                put("action", "suggest_response")
                put("chat_id", chatId)
                put("user_message", userMessage)
            }
        )

        return response.data?.toString()
    }
}
