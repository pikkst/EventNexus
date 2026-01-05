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
            val query = client.from("events")
                .select()
            
            // Apply filters if provided
            val result = if (latitude != null && longitude != null) {
                // Use PostGIS proximity search via RPC
                client.from("events")
                    .select()
                    .execute()
            } else {
                query.execute()
            }
            
            val events = result.decodeList<Event>()
            
            // Filter by category if provided
            val filtered = if (category != null && category != "All") {
                events.filter { it.category == category }
            } else {
                events
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
            val result = client.from("events")
                .select()
                .eq("id", id)
                .single()
                .execute()
            
            val event = result.decodeAs<EventDetail>()
            Result.success(event)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun searchEvents(query: String): Result<List<Event>> = withContext(Dispatchers.IO) {
        try {
            val result = client.from("events")
                .select()
                .ilike("name", "%$query%")
                .execute()
            
            val events = result.decodeList<Event>()
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
