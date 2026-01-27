package eu.eventnexus.adminsupport.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SupportChat(
    val id: String,
    @SerialName("user_id")
    val userId: String?,
    @SerialName("session_id")
    val sessionId: String,
    val status: String, // 'open', 'assigned', 'resolved', 'closed'
    @SerialName("assigned_to")
    val assignedTo: String?,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("updated_at")
    val updatedAt: String,
    @SerialName("last_message_at")
    val lastMessageAt: String?,
    @SerialName("user_email")
    val userEmail: String? = null,
    @SerialName("user_name")
    val userName: String? = null,
    @SerialName("last_message")
    val lastMessage: String? = null,
    @SerialName("unread_count")
    val unreadCount: Int = 0
)

@Serializable
data class ChatMessage(
    val id: String,
    @SerialName("chat_id")
    val chatId: String,
    @SerialName("sender_id")
    val senderId: String?,
    @SerialName("sender_type")
    val senderType: String, // 'user', 'admin', 'ai'
    val message: String,
    @SerialName("is_read")
    val isRead: Boolean = false,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("metadata")
    val metadata: Map<String, String>? = null
)

@Serializable
data class AdminUser(
    val id: String,
    val email: String,
    val role: String,
    @SerialName("full_name")
    val fullName: String? = null
)
