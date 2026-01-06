package eu.eventnexus.livemap

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import eu.eventnexus.livemap.data.SupabaseClient
import eu.eventnexus.livemap.data.repository.AnalyticsRepository
import eu.eventnexus.livemap.ui.navigation.AppNavigation
import eu.eventnexus.livemap.ui.theme.EventNexusTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    
    private val locationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        // Location permission result handled in MapScreen
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log app open event
        CoroutineScope(Dispatchers.IO).launch {
            val analytics = AnalyticsRepository()
            analytics.logEvent(AnalyticsRepository.EventType.APP_OPEN)
        }
        
        // 
        // Initialize Supabase client
        SupabaseClient.initialize(this)
        
        // Request location permissions if not granted
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
        
        setContent {
            EventNexusTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}
