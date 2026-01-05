package eu.eventnexus.scanner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import eu.eventnexus.scanner.ui.EventNexusScannerApp
import eu.eventnexus.scanner.ui.theme.EventNexusScannerTheme

/**
 * Main Activity for EventNexus Scanner App
 * Handles camera permissions and app initialization
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            EventNexusScannerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    EventNexusScannerApp()
                }
            }
        }
    }
}
