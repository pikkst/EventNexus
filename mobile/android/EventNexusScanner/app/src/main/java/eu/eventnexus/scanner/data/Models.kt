package eu.eventnexus.scanner.data

import com.google.gson.annotations.SerializedName

/**
 * Data models for the scanner app
 */

data class ScanResult(
    val success: Boolean,
    val message: String,
    val ticketInfo: TicketInfo?
)

data class TicketInfo(
    val holderName: String,
    val holderEmail: String,
    val ticketType: String
)

data class EventInfo(
    val id: String,
    val name: String,
    val date: String,
    val location: String?
)

// API Response Models

data class VerifyCodeResponse(
    val valid: Boolean,
    @SerializedName("event_id")
    val event_id: String?,
    @SerializedName("event_name")
    val event_name: String?,
    @SerializedName("scanner_code_id")
    val scanner_code_id: String?,
    @SerializedName("organizer_id")
    val organizer_id: String?,
    @SerializedName("expires_at")
    val expires_at: String?
)

data class EventResponse(
    val id: String,
    val name: String,
    val date: String,
    val location: Map<String, Any>?
)

data class ValidationResponse(
    val valid: Boolean,
    val message: String?,
    val ticket: TicketResponse?
)

data class TicketResponse(
    @SerializedName("holder_name")
    val holder_name: String,
    @SerializedName("holder_email")
    val holder_email: String,
    @SerializedName("ticket_type")
    val ticket_type: String
)
