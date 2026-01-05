package eu.eventnexus.scanner.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import eu.eventnexus.scanner.data.EventInfo
import eu.eventnexus.scanner.data.ScanResult
import eu.eventnexus.scanner.data.TicketInfo
import eu.eventnexus.scanner.network.SupabaseApi
import eu.eventnexus.scanner.network.SupabaseClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.*

/**
 * ViewModel for scanner functionality
 * Manages authentication state, scanning state, and API communication
 */
class ScannerViewModel : ViewModel() {
    
    private val api: SupabaseApi = SupabaseClient.api
    
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()
    
    private val _currentEvent = MutableStateFlow<EventInfo?>(null)
    val currentEvent: StateFlow<EventInfo?> = _currentEvent.asStateFlow()
    
    private val _scannerCodeId = MutableStateFlow<String?>(null)
    val scannerCodeId: StateFlow<String?> = _scannerCodeId.asStateFlow()
    
    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()
    
    private val _scannedCount = MutableStateFlow(0)
    val scannedCount: StateFlow<Int> = _scannedCount.asStateFlow()
    
    private val _isConnected = MutableStateFlow(true)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()
    
    private val _sessionStartTime = MutableStateFlow<Long?>(null)
    private val _sessionDuration = MutableStateFlow("00:00")
    val sessionDuration: StateFlow<String> = _sessionDuration.asStateFlow()
    
    private var scannerCode: String? = null
    
    init {
        // Update session duration every second
        viewModelScope.launch {
            while (true) {
                _sessionStartTime.value?.let { startTime ->
                    val duration = (System.currentTimeMillis() - startTime) / 1000
                    val hours = duration / 3600
                    val minutes = (duration % 3600) / 60
                    val seconds = duration % 60
                    _sessionDuration.value = if (hours > 0) {
                        String.format("%d:%02d:%02d", hours, minutes, seconds)
                    } else {
                        String.format("%02d:%02d", minutes, seconds)
                    }
                }
                kotlinx.coroutines.delay(1000)
            }
        }
    }
    
    /**
     * Authenticate with scanner code
     */
    suspend fun authenticateWithCode(code: String) {
        try {
            val response = api.verifyScannerCode(mapOf("p_code" to code))
            
            if (response.isNotEmpty()) {
                val result = response[0]
                if (result.valid) {
                    scannerCode = code
                    _scannerCodeId.value = result.scanner_code_id
                    _sessionStartTime.value = System.currentTimeMillis()
                    
                    // Fetch event details
                    result.event_id?.let { eventId ->
                        fetchEventDetails(eventId)
                    }
                    
                    _isAuthenticated.value = true
                    
                    // Record usage
                    result.scanner_code_id?.let { recordUsage(it) }
                } else {
                    throw Exception("Invalid scanner code or code expired")
                }
            } else {
                throw Exception("Invalid scanner code")
            }
        } catch (e: Exception) {
            throw Exception("Authentication failed: ${e.message}")
        }
    }
    
    /**
     * Fetch event details
     */
    private suspend fun fetchEventDetails(eventId: String) {
        try {
            val events = api.getEvent(eventId)
            if (events.isNotEmpty()) {
                val event = events[0]
                _currentEvent.value = EventInfo(
                    id = event.id,
                    name = event.name,
                    date = event.date,
                    location = event.location?.get("address") as? String
                )
            }
        } catch (e: Exception) {
            throw Exception("Failed to fetch event details: ${e.message}")
        }
    }
    
    /**
     * Start scanning
     */
    fun startScanning() {
        _isScanning.value = true
    }
    
    /**
     * Stop scanning
     */
    fun stopScanning() {
        _isScanning.value = false
    }
    
    /**
     * Validate ticket
     */
    suspend fun validateTicket(qrCode: String): ScanResult {
        try {
            val response = api.validateTicket(mapOf("qrCode" to qrCode))
            
            if (response.valid) {
                _scannedCount.value += 1
                
                // Record usage
                _scannerCodeId.value?.let { recordUsage(it) }
            }
            
            return ScanResult(
                success = response.valid,
                message = response.message ?: if (response.valid) "Ticket validated successfully" else "Invalid ticket",
                ticketInfo = response.ticket?.let {
                    TicketInfo(
                        holderName = it.holder_name,
                        holderEmail = it.holder_email,
                        ticketType = it.ticket_type
                    )
                }
            )
        } catch (e: Exception) {
            throw Exception("Validation failed: ${e.message}")
        }
    }
    
    /**
     * Record scanner usage
     */
    private suspend fun recordUsage(scannerCodeId: String) {
        try {
            api.recordScannerUsage(
                mapOf(
                    "p_scanner_code_id" to scannerCodeId,
                    "p_location" to null
                )
            )
        } catch (e: Exception) {
            // Silently fail, don't disrupt scanning
            e.printStackTrace()
        }
    }
    
    /**
     * Logout
     */
    fun logout() {
        _isAuthenticated.value = false
        _currentEvent.value = null
        _scannerCodeId.value = null
        scannerCode = null
        _scannedCount.value = 0
        _isScanning.value = false
        _sessionStartTime.value = null
    }
}
