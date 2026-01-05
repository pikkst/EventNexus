package eu.eventnexus.livemap.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Ticket(
    val id: String,
    val event_id: String,
    val user_id: String,
    val ticket_type: String,
    val price: Double,
    val qr_code: String,
    val status: String, // "valid", "used", "expired"
    val purchased_at: String,
    val used_at: String? = null,
    
    // Event details (joined)
    val event_name: String? = null,
    val event_date: String? = null,
    val event_time: String? = null,
    val event_location: String? = null,
    val event_image_url: String? = null
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
