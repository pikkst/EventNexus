package eu.eventnexus.livemap.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Ticket(
    val id: String,
    
    @SerialName("event_id")
    val eventId: String,
    
    @SerialName("user_id")
    val userId: String,
    
    @SerialName("ticket_code")
    val ticketCode: String,
    
    val status: String = "valid", // "valid", "used", "cancelled"
    
    @SerialName("purchase_date")
    val purchaseDate: String,
    
    @SerialName("used_at")
    val usedAt: String? = null,
    
    // Joined event details (if query includes them)
    @SerialName("event_name")
    val eventName: String? = null,
    
    @SerialName("event_date")
    val eventDate: String? = null,
    
    @SerialName("event_location")
    val eventLocation: String? = null,
    
    @SerialName("event_image")
    val eventImageUrl: String? = null
)

@Serializable
data class TicketPurchaseRequest(
    val event_id: String,
    val ticket_type_id: String,
    val quantity: Int = 1
)

@Serializable
data class TicketPurchaseResponse(
    val success: Boolean,
    val tickets: List<Ticket>? = null,
    val error: String? = null
)
