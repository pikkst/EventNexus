package eu.eventnexus.scanner.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import eu.eventnexus.scanner.ui.screens.LoginScreen
import eu.eventnexus.scanner.ui.screens.ScannerScreen
import eu.eventnexus.scanner.viewmodel.ScannerViewModel

/**
 * Main app composable
 * Routes between login and scanner screens based on authentication state
 */
@Composable
fun EventNexusScannerApp() {
    val context = LocalContext.current
    val viewModel: ScannerViewModel = viewModel(
        factory = object : ViewModelProvider.Factory {
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                @Suppress("UNCHECKED_CAST")
                return ScannerViewModel(context.applicationContext as android.app.Application) as T
            }
        }
    )
    
    val isAuthenticated by viewModel.isAuthenticated.collectAsState()
    
    if (isAuthenticated) {
        ScannerScreen(viewModel = viewModel)
    } else {
        LoginScreen(viewModel = viewModel)
    }
}
