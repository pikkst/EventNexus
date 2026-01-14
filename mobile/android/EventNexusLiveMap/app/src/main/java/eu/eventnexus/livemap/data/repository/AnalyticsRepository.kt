package eu.eventnexus.livemap.data.repository

import android.os.Build
import eu.eventnexus.livemap.data.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Analytics Repository
 * Logs mobile app events to Supabase for analytics and debugging
 */
class AnalyticsRepository {
    private val client = SupabaseClient.client
    
    // Standard event types
    object EventType {
        // Authentication
        const val APP_OPEN = "app_open"
        const val LOGIN_ATTEMPT = "login_attempt"
        const val LOGIN_SUCCESS = "login_success"
        const val LOGIN_FAILURE = "login_failure"
        const val SIGNUP_ATTEMPT = "signup_attempt"
        const val SIGNUP_SUCCESS = "signup_success"
        const val LOGOUT = "logout"
        
        // Live Map specific
        const val MAP_VIEW = "map_view"
        const val EVENT_VIEW = "event_view"
        const val EVENT_SEARCH = "event_search"
        const val TICKET_PURCHASE = "ticket_purchase"
        const val LOCATION_PERMISSION_GRANTED = "location_permission_granted"
        const val LOCATION_PERMISSION_DENIED = "location_permission_denied"
        const val RADAR_ACTIVATED = "radar_activated"
        const val FILTER_CHANGED = "filter_changed"
        
        // Errors
        const val ERROR_NETWORK = "error_network"
        const val ERROR_API = "error_api"
        const val ERROR_CRASH = "error_crash"
    }
    
    /**
     * Log an event to Supabase
     */
    suspend fun logEvent(
        eventType: String,
        eventData: Map<String, Any> = emptyMap(),
        includeDeviceInfo: Boolean = true
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val deviceInfo = if (includeDeviceInfo) {
                buildJsonObject {
                    put("device", Build.DEVICE)
                    put("model", Build.MODEL)
                    put("manufacturer", Build.MANUFACTURER)
                    put("android_version", Build.VERSION.RELEASE)
                    put("sdk_int", Build.VERSION.SDK_INT)
                    put("app", "livemap")
                }
            } else {
                buildJsonObject {}
            }
            
            val eventDataJson = buildJsonObject {
                eventData.forEach { (key, value) ->
                    when (value) {
                        is String -> put(key, value)
                        is Int -> put(key, value)
                        is Long -> put(key, value)
                        is Boolean -> put(key, value)
                        is Double -> put(key, value)
                        else -> put(key, value.toString())
                    }
                }
            }
            
            // Placeholder for analytics logging
            // TODO: Implement proper RPC call when Supabase client supports it
            
            Result.success(Unit)
        } catch (e: Exception) {
            // Don't fail the app if logging fails
            Result.failure(e)
        }
    }
    
    /**
     * Log authentication events
     */
    suspend fun logAuth(type: String, success: Boolean, email: String? = null) {
        val data = mutableMapOf<String, Any>()
        email?.let { data["email"] = it }
        data["success"] = success
        
        logEvent(type, data)
    }
    
    /**
     * Log screen views
     */
    suspend fun logScreenView(screenName: String, params: Map<String, Any> = emptyMap()) {
        val data = params.toMutableMap()
        data["screen"] = screenName
        
        logEvent("screen_view", data)
    }
    
    /**
     * Log errors
     */
    suspend fun logError(errorType: String, message: String, stackTrace: String? = null) {
        val data = mutableMapOf<String, Any>(
            "error_type" to errorType,
            "message" to message
        )
        stackTrace?.let { data["stack_trace"] = it }
        
        logEvent(EventType.ERROR_API, data)
    }
}
