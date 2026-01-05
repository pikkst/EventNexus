package eu.eventnexus.livemap.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import eu.eventnexus.livemap.data.SupabaseClient
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class PreferencesRepository {
    private val context = SupabaseClient.getContext()
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "radar_prefs")
    
    private object PreferencesKeys {
        val RADAR_ENABLED = booleanPreferencesKey("radar_enabled")
        val DETECTION_RADIUS = floatPreferencesKey("detection_radius")
        val ACTIVE_EVENTS_ENABLED = booleanPreferencesKey("active_events_enabled")
        val UPCOMING_EVENTS_ENABLED = booleanPreferencesKey("upcoming_events_enabled")
        val UPCOMING_WINDOW = floatPreferencesKey("upcoming_window")
        val MIN_TICKETS = floatPreferencesKey("min_tickets")
        val PUSH_NOTIFICATIONS = booleanPreferencesKey("push_notifications")
        val EMAIL_NOTIFICATIONS = booleanPreferencesKey("email_notifications")
        val SELECTED_INTERESTS = stringPreferencesKey("selected_interests")
    }
    
    data class RadarSettings(
        val isRadarEnabled: Boolean = true,
        val detectionRadius: Float = 5f,
        val activeEventsEnabled: Boolean = true,
        val upcomingEventsEnabled: Boolean = true,
        val upcomingWindow: Float = 24f,
        val minTickets: Float = 1f,
        val pushNotificationsEnabled: Boolean = true,
        val emailNotificationsEnabled: Boolean = true,
        val selectedInterests: List<String> = listOf("Concert", "Party")
    )
    
    fun getRadarSettings(): Flow<RadarSettings> = context.dataStore.data.map { prefs ->
        RadarSettings(
            isRadarEnabled = prefs[PreferencesKeys.RADAR_ENABLED] ?: true,
            detectionRadius = prefs[PreferencesKeys.DETECTION_RADIUS] ?: 5f,
            activeEventsEnabled = prefs[PreferencesKeys.ACTIVE_EVENTS_ENABLED] ?: true,
            upcomingEventsEnabled = prefs[PreferencesKeys.UPCOMING_EVENTS_ENABLED] ?: true,
            upcomingWindow = prefs[PreferencesKeys.UPCOMING_WINDOW] ?: 24f,
            minTickets = prefs[PreferencesKeys.MIN_TICKETS] ?: 1f,
            pushNotificationsEnabled = prefs[PreferencesKeys.PUSH_NOTIFICATIONS] ?: true,
            emailNotificationsEnabled = prefs[PreferencesKeys.EMAIL_NOTIFICATIONS] ?: true,
            selectedInterests = (prefs[PreferencesKeys.SELECTED_INTERESTS] ?: "Concert,Party").split(",").filter { it.isNotBlank() }
        )
    }
    
    suspend fun updateRadarSettings(
        isRadarEnabled: Boolean,
        detectionRadius: Float,
        activeEventsEnabled: Boolean,
        upcomingEventsEnabled: Boolean,
        upcomingWindow: Float,
        minTickets: Float,
        pushNotificationsEnabled: Boolean,
        emailNotificationsEnabled: Boolean,
        selectedInterests: List<String>
    ) {
        context.dataStore.edit { prefs ->
            prefs[PreferencesKeys.RADAR_ENABLED] = isRadarEnabled
            prefs[PreferencesKeys.DETECTION_RADIUS] = detectionRadius
            prefs[PreferencesKeys.ACTIVE_EVENTS_ENABLED] = activeEventsEnabled
            prefs[PreferencesKeys.UPCOMING_EVENTS_ENABLED] = upcomingEventsEnabled
            prefs[PreferencesKeys.UPCOMING_WINDOW] = upcomingWindow
            prefs[PreferencesKeys.MIN_TICKETS] = minTickets
            prefs[PreferencesKeys.PUSH_NOTIFICATIONS] = pushNotificationsEnabled
            prefs[PreferencesKeys.EMAIL_NOTIFICATIONS] = emailNotificationsEnabled
            prefs[PreferencesKeys.SELECTED_INTERESTS] = selectedInterests.joinToString(",")
        }
    }
}
