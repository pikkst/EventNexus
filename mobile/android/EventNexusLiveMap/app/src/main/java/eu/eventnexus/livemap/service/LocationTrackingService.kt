package eu.eventnexus.livemap.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import eu.eventnexus.livemap.MainActivity
import eu.eventnexus.livemap.R
import eu.eventnexus.livemap.data.SupabaseClient
import eu.eventnexus.livemap.data.model.Event
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.*
import kotlin.math.*

class LocationTrackingService : Service() {
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var currentLocation: Location? = null
    private var trackingRadius = 5000.0 // 5km default
    
    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { location ->
                currentLocation = location
                checkNearbyEvents(location)
            }
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createForegroundNotification())
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            trackingRadius = it.getDoubleExtra("radius", 5000.0)
        }
        startLocationUpdates()
        return START_STICKY
    }
    
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            30000L // 30 seconds
        ).apply {
            setMinUpdateIntervalMillis(15000L) // 15 seconds minimum
            setMaxUpdateDelayMillis(60000L) // 1 minute maximum
        }.build()
        
        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            stopSelf()
        }
    }
    
    private fun checkNearbyEvents(location: Location) {
        serviceScope.launch {
            try {
                val events = SupabaseClient.client
                    .from("events")
                    .select(Columns.ALL)
                    .decodeList<Event>()
                
                events.forEach { event ->
                    val distance = calculateDistance(
                        location.latitude,
                        location.longitude,
                        event.latitude,
                        event.longitude
                    )
                    
                    if (distance <= trackingRadius) {
                        sendEventNotification(event, distance)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val earthRadius = 6371000.0 // meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return earthRadius * c
    }
    
    private fun sendEventNotification(event: Event, distanceMeters: Double) {
        val distanceKm = (distanceMeters / 1000).roundToInt()
        
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("event_id", event.id)
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            event.id.hashCode(),
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        val notification = NotificationCompat.Builder(this, EVENT_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentTitle("🎉 ${event.name}")
            .setContentText("📍 ${distanceKm}km away - ${event.category}")
            .setStyle(NotificationCompat.BigTextStyle()
                .bigText("${event.description}\n\n📍 Distance: ${distanceKm}km"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(event.id.hashCode(), notification)
    }
    
    private fun createForegroundNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setContentTitle("EventNexus Live Map")
            .setContentText("Tracking nearby events...")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                SERVICE_CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            )
            
            val eventChannel = NotificationChannel(
                EVENT_CHANNEL_ID,
                "Nearby Events",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for events near you"
                enableVibration(true)
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
            manager.createNotificationChannel(eventChannel)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    companion object {
        private const val NOTIFICATION_ID = 1
        private const val SERVICE_CHANNEL_ID = "location_tracking_channel"
        private const val EVENT_CHANNEL_ID = "nearby_events_channel"
    }
}
