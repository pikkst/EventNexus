package eu.eventnexus.livemap.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import eu.eventnexus.livemap.data.model.Event
import eu.eventnexus.livemap.data.repository.EventRepository
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

@Suppress("DEPRECATION")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    onEventClick: (String) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val eventRepository = remember { EventRepository() }
    
    var events by remember { mutableStateOf<List<Event>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var userLocation by remember { mutableStateOf<GeoPoint?>(null) }
    var hasLocationPermission by remember { mutableStateOf(false) }
    var showFilters by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf<String?>(null) }
    var radiusKm by remember { mutableStateOf(50f) }
    var mapView by remember { mutableStateOf<MapView?>(null) }
    
    // Location permission launcher
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasLocationPermission = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        
        if (hasLocationPermission) {
            scope.launch {
                try {
                    val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
                    val location = fusedLocationClient.lastLocation.await()
                    location?.let {
                        userLocation = GeoPoint(it.latitude, it.longitude)
                        mapView?.controller?.apply {
                            setZoom(12.0)
                            setCenter(GeoPoint(it.latitude, it.longitude))
                        }
                    }
                } catch (e: SecurityException) {
                    error = "Location permission denied"
                }
            }
        }
    }
    
    // Check permission on start
    LaunchedEffect(Unit) {
        hasLocationPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        if (!hasLocationPermission) {
            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        } else {
            try {
                val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
                val location = fusedLocationClient.lastLocation.await()
                location?.let {
                    userLocation = GeoPoint(it.latitude, it.longitude)
                }
            } catch (e: SecurityException) {
                error = "Location permission denied"
            }
        }
    }
    
    // Load events
    fun loadEvents() {
        scope.launch {
            isLoading = true
            error = null
            
            val result = if (searchQuery.isNotBlank()) {
                eventRepository.searchEvents(searchQuery)
            } else {
                eventRepository.getEvents(
                    latitude = userLocation?.latitude,
                    longitude = userLocation?.longitude,
                    radiusKm = radiusKm.toDouble(),
                    category = selectedCategory
                )
            }
            
            result.onSuccess { loadedEvents ->
                events = loadedEvents
            }.onFailure { e ->
                error = e.message ?: "Failed to load events"
            }
            
            isLoading = false
        }
    }
    
    LaunchedEffect(userLocation, selectedCategory, radiusKm) {
        if (userLocation != null) {
            loadEvents()
        }
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("EventNexus Live Map") },
                actions = {
                    IconButton(onClick = { showFilters = !showFilters }) {
                        Icon(Icons.Filled.FilterList, "Filters")
                    }
                    IconButton(onClick = { loadEvents() }) {
                        Icon(Icons.Filled.Refresh, "Refresh")
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            // OpenStreetMap using osmdroid
            AndroidView(
                factory = { ctx ->
                    try {
                        MapView(ctx).apply {
                            setTileSource(TileSourceFactory.MAPNIK)
                            setMultiTouchControls(true)
                            controller.setZoom(12.0)
                            controller.setCenter(
                                userLocation ?: GeoPoint(59.437, 24.7536) // Tallinn default
                            )
                            mapView = this
                        }
                    } catch (e: Exception) {
                        error = "Map initialization failed: ${e.message}"
                        MapView(ctx) // Return empty map on error
                    }
                },
                modifier = Modifier.fillMaxSize(),
                update = { view ->
                    try {
                        // Clear existing markers
                        view.overlays.clear()
                        
                        // Add user location marker
                        userLocation?.let { location ->
                            val marker = Marker(view).apply {
                                position = location
                                title = "Your Location"
                                setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                            }
                            view.overlays.add(marker)
                        }
                        
                        // Add event markers
                        events.forEach { event ->
                            val marker = Marker(view).apply {
                                position = GeoPoint(event.latitude, event.longitude)
                                title = event.name
                                snippet = event.category
                                setOnMarkerClickListener { _, _ ->
                                    onEventClick(event.id)
                                    true
                                }
                            }
                            view.overlays.add(marker)
                        }
                        
                        view.invalidate()
                    } catch (e: Exception) {
                        error = "Map update failed: ${e.message}"
                    }
                }
            )
            
            // Search bar at top
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .align(Alignment.TopCenter)
            ) {
                TextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Search events...") },
                    leadingIcon = { Icon(Icons.Filled.Search, "Search") },
                    trailingIcon = {
                        if (searchQuery.isNotEmpty()) {
                            IconButton(onClick = {
                                searchQuery = ""
                                loadEvents()
                            }) {
                                Icon(Icons.Filled.Clear, "Clear")
                            }
                        }
                    },
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surface
                    )
                )
            }
            
            // Filters sheet
            if (showFilters) {
                ModalBottomSheet(
                    onDismissRequest = { showFilters = false }
                ) {
                    FilterBottomSheet(
                        selectedCategory = selectedCategory,
                        radiusKm = radiusKm,
                        onCategoryChange = { selectedCategory = it },
                        onRadiusChange = { radiusKm = it },
                        onApply = {
                            showFilters = false
                            loadEvents()
                        },
                        onClear = {
                            selectedCategory = null
                            radiusKm = 50f
                            loadEvents()
                        }
                    )
                }
            }
            
            // Loading indicator
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            
            // Error message
            error?.let { errorMsg ->
                Snackbar(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                    action = {
                        TextButton(onClick = { loadEvents() }) {
                            Text("Retry")
                        }
                    }
                ) {
                    Text(errorMsg)
                }
            }
        }
    }
}

@Composable
fun FilterBottomSheet(
    selectedCategory: String?,
    radiusKm: Float,
    onCategoryChange: (String?) -> Unit,
    onRadiusChange: (Float) -> Unit,
    onApply: () -> Unit,
    onClear: () -> Unit
) {
    val categories = listOf(
        "All", "Music", "Sports", "Arts", "Food", "Technology", 
        "Business", "Education", "Health", "Other"
    )
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = "Filters",
            style = MaterialTheme.typography.headlineSmall,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        // Category filter
        Text(
            text = "Category",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f, fill = false)
        ) {
            items(categories) { category ->
                FilterChip(
                    selected = if (category == "All") selectedCategory == null else selectedCategory == category,
                    onClick = {
                        onCategoryChange(if (category == "All") null else category)
                    },
                    label = { Text(category) },
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Radius slider
        Text(
            text = "Radius: ${radiusKm.toInt()} km",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        Slider(
            value = radiusKm,
            onValueChange = onRadiusChange,
            valueRange = 1f..200f,
            steps = 199,
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Action buttons
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = onClear,
                modifier = Modifier.weight(1f)
            ) {
                Text("Clear")
            }
            
            Button(
                onClick = onApply,
                modifier = Modifier.weight(1f)
            ) {
                Text("Apply")
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
    }
}
