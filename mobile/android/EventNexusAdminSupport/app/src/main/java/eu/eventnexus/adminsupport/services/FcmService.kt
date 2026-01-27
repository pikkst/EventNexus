package eu.eventnexus.adminsupport.services

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import eu.eventnexus.adminsupport.AdminSupportApp
import eu.eventnexus.adminsupport.MainActivity
import eu.eventnexus.adminsupport.R
import eu.eventnexus.adminsupport.data.remote.SupabaseService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class FcmService : FirebaseMessagingService() {

    private val supabaseService = SupabaseService()
    private val serviceScope = CoroutineScope(Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token: $token")

        // Update token in Supabase
        serviceScope.launch {
            try {
                val userId = supabaseService.getCurrentUserId()
                if (userId != null) {
                    supabaseService.updateFcmToken(userId, token)
                    Log.d(TAG, "FCM token updated in Supabase")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update FCM token", e)
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "Message received from: ${message.from}")

        // Extract data
        val chatId = message.data["chat_id"]
        val userName = message.data["user_name"] ?: "User"
        val userMessage = message.data["message"] ?: ""
        val title = message.notification?.title ?: "New Support Message"

        // Show notification
        showNotification(
            title = title,
            message = "$userName: $userMessage",
            chatId = chatId
        )
    }

    private fun showNotification(title: String, message: String, chatId: String?) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            chatId?.let { putExtra("CHAT_ID", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, AdminSupportApp.NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    companion object {
        private const val TAG = "FcmService"
    }
}
