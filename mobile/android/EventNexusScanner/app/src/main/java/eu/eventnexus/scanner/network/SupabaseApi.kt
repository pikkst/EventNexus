package eu.eventnexus.scanner.network

import eu.eventnexus.scanner.data.*
import retrofit2.http.*

/**
 * Supabase API interface
 * Defines all API endpoints for the scanner app
 */
interface SupabaseApi {
    
    /**
     * Verify scanner code
     */
    @POST("/rest/v1/rpc/verify_scanner_code")
    suspend fun verifyScannerCode(
        @Body body: Map<String, String>
    ): List<VerifyCodeResponse>
    
    /**
     * Get event details
     */
    @GET("/rest/v1/events")
    suspend fun getEvent(
        @Query("id") eventIdFilter: String
    ): List<EventResponse>
    
    /**
     * Validate ticket
     */
    @POST("/functions/v1/validate-ticket")
    suspend fun validateTicket(
        @Body body: Map<String, String>
    ): ValidationResponse
    
    /**
     * Record scanner usage
     */
    @POST("/rest/v1/rpc/record_scanner_usage")
    suspend fun recordScannerUsage(
        @Body body: Map<String, String?>
    )
}
