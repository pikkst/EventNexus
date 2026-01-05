package eu.eventnexus.livemap.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Event(
    val id: String,
    val name: String,
    val description: String? = null,
    val category: String,
    val date: String,
    val time: String? = null,
    
    // Location as JSONB object in DB
    val location: LocationData? = null,
    
    @SerialName("organizer_id")
    val organizerId: String,
    
    @SerialName("image")
    val imageUrl: String? = null,
    
    val price: Double = 0.0,
    
    @SerialName("max_capacity")
    val maxCapacity: Int? = null,
    
    @SerialName("attendees_count")
    val attendeesCount: Int? = null,
    
    @SerialName("created_at")
    val createdAt: String? = null
) {
    // Helper properties for map markers
    val latitude: Double
        get() = location?.coordinates?.get(1) ?: 0.0
    val longitude: Double
        get() = location?.coordinates?.get(0) ?: 0.0
    val cityName: String
        get() = location?.city ?: "Unknown"
}

@Serializable
data class LocationData(
    val city: String,
    val address: String? = null,
    val coordinates: List<Double>? = null // [lng, lat]
)

@Serializable
data class EventDetail(
    val id: String,
    val name: String,
    val description: String? = null,
    
    @SerialName("about_text")
    val aboutText: String? = null,
    
    val category: String,
    val date: String,
    val time: String? = null,
    
    @SerialName("end_date")
    val endDate: String? = null,
    
    val location: LocationData? = null,
    
    @SerialName("organizer_id")
    val organizerId: String,
    
    @SerialName("image")
    val imageUrl: String? = null,
    
    val price: Double = 0.0,
    
    @SerialName("max_capacity")
    val maxCapacity: Int? = null,
    
    @SerialName("attendees_count")
    val attendeesCount: Int? = null,
    
    val visibility: String? = "public",
    
    @SerialName("is_featured")
    val isFeatured: Boolean = false,
    
    val translations: Map<String, String>? = null,
    
    @SerialName("created_at")
    val createdAt: String? = null,
    
    @SerialName("updated_at")
    val updatedAt: String? = null
) {
    val latitude: Double
        get() = location?.coordinates?.get(1) ?: 0.0
    val longitude: Double
        get() = location?.coordinates?.get(0) ?: 0.0
    val cityName: String
        get() = location?.city ?: "Unknown"
}

@Serializable
data class TicketType(
    val id: String,
    val name: String,
    val price: Double,
    val available: Int
)
