package eu.eventnexus.livemap.data.repository

import eu.eventnexus.livemap.data.SupabaseClient
import eu.eventnexus.livemap.data.model.Ticket
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TicketRepository {
    private val client = SupabaseClient.client
    
    suspend fun getUserTickets(userId: String): Result<List<Ticket>> = withContext(Dispatchers.IO) {
        try {
            val result = client.from("tickets")
                .select {
                    filter {
                        eq("user_id", userId)
                    }
                }
                .execute()
            
            val tickets = result.decodeList<Ticket>()
            Result.success(tickets)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getTicketById(id: String): Result<Ticket> = withContext(Dispatchers.IO) {
        try {
            val result = client.from("tickets")
                .select()
                .eq("id", id)
                .single()
                .execute()
            
            val ticket = result.decodeAs<Ticket>()
            Result.success(ticket)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun purchaseTicket(
        eventId: String,
        ticketTypeId: String,
        userId: String
    ): Result<Ticket> = withContext(Dispatchers.IO) {
        try {
            // Call Edge Function for ticket purchase
            // This should handle payment, ticket generation, etc.
            val result = client.from("tickets")
                .insert(mapOf(
                    "event_id" to eventId,
                    "user_id" to userId,
                    "ticket_type_id" to ticketTypeId,
                    "status" to "valid"
                ))
                .single()
                .execute()
            
            val ticket = result.decodeAs<Ticket>()
            Result.success(ticket)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
