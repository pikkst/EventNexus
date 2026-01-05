package eu.eventnexus.livemap.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Event(
    val id: String,
    val name: String,
    val description: String? = null,
    val category: String,
    val date: String,
    val time: String? = null,
    val location: String,
    val latitude: Double,
    val longitude: Double,
    val organizer_id: String,
    val organizer_name: String? = null,
    val image_url: String? = null,
    val tickets_available: Int? = null,
    val ticket_price: Double? = null,
    val created_at: String? = null
)

@Serializable
data class EventDetail(
    val id: String,
    val name: String,
    val description: String? = null,
    val category: String,
    val date: String,
    val time: String? = null,
    val location: String,
    val latitude: Double,
    val longitude: Double,
    val organizer_id: String,
    val organizer_name: String? = null,
    val image_url: String? = null,
    val tickets_available: Int? = null,
    val ticket_price: Double? = null,
    val ticket_types: List<TicketType>? = null,
    val created_at: String? = null,
    val updated_at: String? = null
)

@Serializable
data class TicketType(
    val id: String,
    val name: String,
    val price: Double,
    val available: Int
)
