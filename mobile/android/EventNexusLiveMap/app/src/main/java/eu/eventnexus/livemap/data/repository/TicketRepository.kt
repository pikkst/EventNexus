package eu.eventnexus.livemap.data.repository

import eu.eventnexus.livemap.BuildConfig
import eu.eventnexus.livemap.data.SupabaseClient
import eu.eventnexus.livemap.data.model.Ticket
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.postgrest.from
import io.ktor.client.call.body
import io.ktor.client.statement.HttpResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class TicketRepository {
    private val client = SupabaseClient.client
    
    suspend fun getUserTickets(userId: String): Result<List<Ticket>> = withContext(Dispatchers.IO) {
        try {
            val tickets = client.from("tickets")
                .select(io.github.jan.supabase.postgrest.query.Columns.ALL) {
                    filter {
                        eq("user_id", userId)
                    }
                }.decodeList<Ticket>()
            
            Result.success(tickets)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getTicketById(id: String): Result<Ticket> = withContext(Dispatchers.IO) {
        try {
            val tickets = client.from("tickets")
                .select(io.github.jan.supabase.postgrest.query.Columns.ALL) {
                    filter {
                        eq("id", id)
                    }
                    limit(1)
                }.decodeList<Ticket>()
            
            val ticket = tickets.firstOrNull() ?: throw Exception("Ticket not found")
            Result.success(ticket)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun purchaseTicket(
        eventId: String,
        ticketTypeId: String, 
        userId: String,
        ticketCount: Int,
        pricePerTicket: Double,
        eventName: String
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            // Define the request body for the create-checkout function
            @Serializable
            data class CheckoutRequest(
                val userId: String,
                val eventId: String,
                val ticketCount: Int,
                val pricePerTicket: Double,
                val eventName: String,
                val ticketTemplateId: String? = null,
                val ticketType: String? = null,
                val ticketName: String? = null,
                val successUrl: String,
                val cancelUrl: String
            )

            // Define the response body
            @Serializable
            data class CheckoutResponse(
                val url: String? = null,
                val error: String? = null
            )

            val successUrl = "eventnexus://checkout/success?session_id={CHECKOUT_SESSION_ID}&event_id=$eventId"
            val cancelUrl = "eventnexus://checkout/cancel?event_id=$eventId"

            val request = CheckoutRequest(
                userId = userId,
                eventId = eventId,
                ticketCount = ticketCount,
                pricePerTicket = pricePerTicket,
                eventName = eventName,
                ticketTemplateId = null, 
                ticketType = "general", 
                ticketName = "General Admission",
                successUrl = successUrl,
                cancelUrl = cancelUrl
            )

            // Invoke function and explicitly deserialize
            val response: HttpResponse = client.functions.invoke("create-checkout", request)
            val responseString = response.body<String>()
            
            val json = Json { ignoreUnknownKeys = true }
            val checkoutResponse = json.decodeFromString<CheckoutResponse>(responseString)

            if (checkoutResponse.url != null) {
                Result.success(checkoutResponse.url)
            } else {
                Result.failure(Exception(checkoutResponse.error ?: "Failed to get checkout URL"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
