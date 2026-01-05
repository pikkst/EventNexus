package eu.eventnexus.livemap.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import eu.eventnexus.livemap.BuildConfig
import eu.eventnexus.livemap.data.model.EventDetail
import eu.eventnexus.livemap.data.repository.AuthRepository
import eu.eventnexus.livemap.data.repository.EventRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailScreen(
    eventId: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val eventRepository = remember { EventRepository() }
    val authRepository = remember { AuthRepository() }
    
    var event by remember { mutableStateOf<EventDetail?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var isLoggedIn by remember { mutableStateOf(false) }
    var showLoginDialog by remember { mutableStateOf(false) }
    
    LaunchedEffect(eventId) {
        isLoading = true
        
        // Check login status
        isLoggedIn = authRepository.isLoggedIn()
        
        // Load event details
        eventRepository.getEventById(eventId)
            .onSuccess { loadedEvent ->
                event = loadedEvent
                isLoading = false
            }
            .onFailure { e ->
                error = e.message ?: "Failed to load event"
                isLoading = false
            }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Event Details") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        event?.let { evt ->
                            val shareIntent = Intent().apply {
                                action = Intent.ACTION_SEND
                                putExtra(Intent.EXTRA_TEXT, 
                                    "${evt.name}\n${BuildConfig.WEB_PLATFORM_URL}/events/${evt.id}")
                                type = "text/plain"
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share Event"))
                        }
                    }) {
                        Icon(Icons.Filled.Share, "Share")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
                error != null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = error ?: "Unknown error",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = onBack) {
                            Text("Go Back")
                        }
                    }
                }
                event != null -> {
                    EventDetailContent(
                        event = event!!,
                        isLoggedIn = isLoggedIn,
                        onBuyOnWeb = {
                            val intent = Intent(Intent.ACTION_VIEW, 
                                Uri.parse("${BuildConfig.WEB_PLATFORM_URL}/events/${event!!.id}"))
                            context.startActivity(intent)
                        },
                        onBuyInApp = {
                            if (isLoggedIn) {
                                // Navigate to ticket purchase in app
                                // TODO: Implement in-app purchase
                            } else {
                                showLoginDialog = true
                            }
                        },
                        onViewOnMap = {
                            val geoUri = "geo:${event!!.latitude},${event!!.longitude}?q=${event!!.latitude},${event!!.longitude}(${event!!.name})"
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(geoUri))
                            context.startActivity(intent)
                        }
                    )
                }
            }
            
            // Login required dialog
            if (showLoginDialog) {
                AlertDialog(
                    onDismissRequest = { showLoginDialog = false },
                    title = { Text("Login Required") },
                    text = { Text("Please login to purchase tickets in the app") },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showLoginDialog = false
                                // Navigate to profile/login screen
                            }
                        ) {
                            Text("Login")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showLoginDialog = false }) {
                            Text("Cancel")
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun EventDetailContent(
    event: EventDetail,
    isLoggedIn: Boolean,
    onBuyOnWeb: () -> Unit,
    onBuyInApp: () -> Unit,
    onViewOnMap: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        // Event image
        if (event.imageUrl != null) {
            AsyncImage(
                model = event.imageUrl,
                contentDescription = event.name,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(250.dp),
                contentScale = ContentScale.Crop
            )
        }
        
        Column(modifier = Modifier.padding(16.dp)) {
            // Event name
            Text(
                text = event.name,
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            // Category chip
            AssistChip(
                onClick = { },
                label = { Text(event.category) },
                leadingIcon = { Icon(Icons.Filled.Category, "Category") }
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Event details
            EventDetailRow(
                icon = Icons.Filled.CalendarToday,
                label = "Date",
                value = event.date
            )
            
            event.time?.let {
                EventDetailRow(
                    icon = Icons.Filled.AccessTime,
                    label = "Time",
                    value = it
                )
            }
            
            event.location?.city?.let {
                EventDetailRow(
                    icon = Icons.Filled.LocationOn,
                    label = "Location",
                    value = it
                )
            }
            
            // Calculate available tickets
            val availableTickets = event.maxCapacity?.let { max ->
                val attendees = event.attendeesCount ?: 0
                max - attendees
            }
            
            availableTickets?.let {
                EventDetailRow(
                    icon = Icons.Filled.ConfirmationNumber,
                    label = "Tickets Available",
                    value = it.toString()
                )
            }
            
            if (event.price > 0.0) {
                EventDetailRow(
                    icon = Icons.Filled.Euro,
                    label = "Price",
                    value = "€%.2f".format(event.price)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            Divider()
            Spacer(modifier = Modifier.height(16.dp))
            
            // Description
            event.description?.let { description ->
                Text(
                    text = "Description",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            
            Divider()
            Spacer(modifier = Modifier.height(16.dp))
            
            // Action buttons
            Button(
                onClick = onBuyOnWeb,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Filled.Web, "Web", modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Buy on Website")
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            if (isLoggedIn) {
                Button(
                    onClick = onBuyInApp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.ShoppingCart, "Buy", modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Buy in App")
                }
            } else {
                OutlinedButton(
                    onClick = onBuyInApp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.Login, "Login", modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Login to Buy in App")
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            OutlinedButton(
                onClick = onViewOnMap,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Filled.Map, "Map", modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("View on Map")
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun EventDetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            modifier = Modifier.size(24.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}
