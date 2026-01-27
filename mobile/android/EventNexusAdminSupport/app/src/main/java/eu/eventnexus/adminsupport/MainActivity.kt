package eu.eventnexus.adminsupport

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import eu.eventnexus.adminsupport.data.remote.SupabaseService
import eu.eventnexus.adminsupport.ui.theme.EventNexusAdminSupportTheme
import eu.eventnexus.adminsupport.ui.navigation.AppNavigation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val supabaseService = SupabaseService()
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            Log.d(TAG, "Notification permission granted")
            setupFcm()
        } else {
            Log.w(TAG, "Notification permission denied")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request notification permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            when {
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED -> {
                    setupFcm()
                }
                else -> {
                    requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                }
            }
        } else {
            setupFcm()
        }

        setContent {
            EventNexusAdminSupportTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation(
                        chatId = intent.getStringExtra("CHAT_ID")
                    )
                }
            }
        }
    }

    private fun setupFcm() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w(TAG, "Fetching FCM token failed", task.exception)
                return@addOnCompleteListener
            }

            val token = task.result
            Log.d(TAG, "FCM Token: $token")

            // Update token in Supabase
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val userId = supabaseService.getCurrentUserId()
                    if (userId != null) {
                        supabaseService.updateFcmToken(userId, token)
                        Log.d(TAG, "FCM token synced to Supabase")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to sync FCM token", e)
                }
            }
        }
    }

    companion object {
        private const val TAG = "MainActivity"
    }
}
