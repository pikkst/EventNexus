package eu.eventnexus.livemap.data.repository

import eu.eventnexus.livemap.data.SupabaseClient
import eu.eventnexus.livemap.data.model.Event
import eu.eventnexus.livemap.data.model.EventDetail
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class EventRepository {
    private val client = SupabaseClient.client
    
    suspend fun getEvents(
        latitude: Double? = null,
        longitude: Double? = null,
        radiusKm: Double = 50.0,
        category: String? = null
    ): Result<List<Event>> = withContext(Dispatchers.IO) {
        try {
            // Build query
            val events = client.from("events")
                .select(Columns.ALL)
                .decodeList<Event>()
            
            // Filter active events only
            val activeEvents = events.filter { it.attendeesCount != null }
            
            // Filter by category if provided
            val filtered = if (category != null && category != "All") {
                activeEvents.filter { it.category.equals(category, ignoreCase = true) }
            } else {
                activeEvents
            }
            
            // Filter by radius if location provided
            val proximityFiltered = if (latitude != null && longitude != null) {
                filtered.filter { event ->
                    calculateDistance(latitude, longitude, event.latitude, event.longitude) <= radiusKm
                }
            } else {
                filtered
            }
            
            Result.success(proximityFiltered)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getEventById(id: String): Result<EventDetail> = withContext(Dispatchers.IO) {
        try {
            val events = client.from("events")
                .select(Columns.ALL) {
                    filter {
                        eq("id", id)
                    }
                    limit(1)
                }.decodeList<EventDetail>()
            
            val event = events.firstOrNull() ?: throw Exception("Event not found")
            Result.success(event)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun searchEvents(query: String): Result<List<Event>> = withContext(Dispatchers.IO) {
        try {
            val events = client.from("events")
                .select(Columns.ALL) {
                    filter {
                        ilike("name", "%$query%")
                    }
                }.decodeList<Event>()
            
            Result.success(events)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val earthRadius = 6371.0 // km
        
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        
        return earthRadius * c
    }
}
