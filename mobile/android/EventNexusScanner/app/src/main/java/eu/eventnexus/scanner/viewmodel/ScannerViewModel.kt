package eu.eventnexus.scanner.viewmodel

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
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
class ScannerViewModel(application: Application) : AndroidViewModel(application) {
    
    private val api: SupabaseApi = SupabaseClient.api
    private val prefs = application.getSharedPreferences("scanner_prefs", Context.MODE_PRIVATE)
    
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
        // Restore saved session if exists
        restoreSession()
        
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
     * Restore saved session from SharedPreferences
     */
    private fun restoreSession() {
        val savedCode = prefs.getString("scanner_code", null)
        val savedCodeId = prefs.getString("scanner_code_id", null)
        val savedEventId = prefs.getString("event_id", null)
        val savedEventName = prefs.getString("event_name", null)
        val savedEventDate = prefs.getString("event_date", null)
        val savedEventLocation = prefs.getString("event_location", null)
        val savedSessionStart = prefs.getLong("session_start", 0)
        val savedScannedCount = prefs.getInt("scanned_count", 0)
        
        if (!savedCode.isNullOrEmpty() && !savedCodeId.isNullOrEmpty()) {
            scannerCode = savedCode
            _scannerCodeId.value = savedCodeId
            _scannedCount.value = savedScannedCount
            
            if (savedSessionStart > 0) {
                _sessionStartTime.value = savedSessionStart
            }
            
            if (!savedEventId.isNullOrEmpty() && !savedEventName.isNullOrEmpty()) {
                _currentEvent.value = EventInfo(
                    id = savedEventId,
                    name = savedEventName,
                    date = savedEventDate,
                    location = savedEventLocation
                )
            }
            
            _isAuthenticated.value = true
        }
    }
    
    /**
     * Save session to SharedPreferences
     */
    private fun saveSession() {
        prefs.edit().apply {
            putString("scanner_code", scannerCode)
            putString("scanner_code_id", _scannerCodeId.value)
            putString("event_id", _currentEvent.value?.id)
            putString("event_name", _currentEvent.value?.name)
            putString("event_date", _currentEvent.value?.date)
            putString("event_location", _currentEvent.value?.location)
            putLong("session_start", _sessionStartTime.value ?: 0)
            putInt("scanned_count", _scannedCount.value)
            apply()
        }
    }
    
    /**
     * Clear saved session
     */
    private fun clearSession() {
        prefs.edit().clear().apply()
    }
    
    /**
     * Authenticate with scanner code
     */
    suspend fun authenticateWithCode(code: String) {
        try {
            println("🔍 Calling API with code: $code")
            val response = api.verifyScannerCode(mapOf("p_code" to code))
            println("📡 API Response: $response")
            
            if (response.isNotEmpty()) {
                val result = response[0]
                println("📊 Result valid: ${result.valid}, event_id: ${result.event_id}, scanner_code_id: ${result.scanner_code_id}")
                
                if (result.valid) {
                    scannerCode = code
                    _scannerCodeId.value = result.scanner_code_id
                    _sessionStartTime.value = System.currentTimeMillis()
                    
                    // Fetch event details
                    result.event_id?.let { eventId ->
                        println("🎉 Fetching event details for: $eventId")
                        fetchEventDetails(eventId)
                    }
                    
                    _isAuthenticated.value = true
                    println("✅ Authentication successful, saving session...")
                    
                    // Save session to SharedPreferences
                    saveSession()
                    
                    // Record usage
                    result.scanner_code_id?.let { 
                        println("📝 Recording usage for scanner code: $it")
                        recordUsage(it) 
                    }
                } else {
                    println("❌ Scanner code invalid or expired")
                    throw Exception("Invalid scanner code or code expired")
                }
            } else {
                println("❌ Empty response from API")
                throw Exception("Invalid scanner code")
            }
        } catch (e: retrofit2.HttpException) {
            println("🌐 HTTP Error: ${e.code()} - ${e.message()}")
            throw Exception("Failed to connect to server: ${e.message()}")
        } catch (e: java.net.UnknownHostException) {
            println("🌐 Network Error: No internet connection")
            throw Exception("Failed to connect: Check your internet connection")
        } catch (e: Exception) {
            println("💥 Exception: ${e.javaClass.simpleName} - ${e.message}")
            e.printStackTrace()
            throw Exception("Authentication failed: ${e.message}")
        }
    }
    
    /**
     * Fetch event details
     */
    private suspend fun fetchEventDetails(eventId: String) {
        try {
            println("📥 Fetching event: $eventId")
            // Supabase REST API requires 'eq.' prefix for equality filter
            val events = api.getEvent("eq.$eventId")
            println("📦 Events response: ${events.size} events")
            
            if (events.isNotEmpty()) {
                val event = events[0]
                println("🎫 Event: ${event.name}, Date: ${event.date}")
                _currentEvent.value = EventInfo(
                    id = event.id,
                    name = event.name,
                    date = event.date,
                    location = event.location?.get("address") as? String
                )
                println("✅ Event details saved")
            } else {
                println("⚠️ No event found for ID: $eventId")
            }
        } catch (e: Exception) {
            println("❌ Failed to fetch event: ${e.message}")
            e.printStackTrace()
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
        clearSession()
    }
}
