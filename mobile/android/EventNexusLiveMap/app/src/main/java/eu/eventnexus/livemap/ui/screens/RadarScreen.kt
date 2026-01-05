package eu.eventnexus.livemap.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import eu.eventnexus.livemap.data.repository.PreferencesRepository
import kotlinx.coroutines.launch

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RadarScreen() {
    val scope = rememberCoroutineScope()
    val preferencesRepository = remember { PreferencesRepository() }
    
    // State backed by repository
    var isRadarEnabled by remember { mutableStateOf(true) }
    var detectionRadius by remember { mutableStateOf(5f) }
    var activeEventsEnabled by remember { mutableStateOf(true) }
    var upcomingEventsEnabled by remember { mutableStateOf(true) }
    var upcomingWindow by remember { mutableStateOf(24f) }
    var minTickets by remember { mutableStateOf(1f) }
    var pushNotificationsEnabled by remember { mutableStateOf(true) }
    var emailNotificationsEnabled by remember { mutableStateOf(true) }
    
    val interests = listOf("Concert", "Festival", "Workshop", "Party", "Conference", "Meetup", "Sports")
    val selectedInterests = remember { mutableStateListOf("Concert", "Party") }
    
    // Load preferences
    LaunchedEffect(Unit) {
        preferencesRepository.getRadarSettings().collect { settings ->
            isRadarEnabled = settings.isRadarEnabled
            detectionRadius = settings.detectionRadius
            activeEventsEnabled = settings.activeEventsEnabled
            upcomingEventsEnabled = settings.upcomingEventsEnabled
            upcomingWindow = settings.upcomingWindow
            minTickets = settings.minTickets
            pushNotificationsEnabled = settings.pushNotificationsEnabled
            emailNotificationsEnabled = settings.emailNotificationsEnabled
            
            selectedInterests.clear()
            selectedInterests.addAll(settings.selectedInterests)
        }
    }
    
    // Save preferences helper
    fun saveSettings() {
        scope.launch {
            preferencesRepository.updateRadarSettings(
                isRadarEnabled = isRadarEnabled,
                detectionRadius = detectionRadius,
                activeEventsEnabled = activeEventsEnabled,
                upcomingEventsEnabled = upcomingEventsEnabled,
                upcomingWindow = upcomingWindow,
                minTickets = minTickets,
                pushNotificationsEnabled = pushNotificationsEnabled,
                emailNotificationsEnabled = emailNotificationsEnabled,
                selectedInterests = selectedInterests.toList()
            )
        }
    }

    Scaffold(
        containerColor = Color(0xFF020617) // Dark background like screenshot
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Manage your Nexus Radar preferences and app notifications.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            // Nexus Radar Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    // Header with Toggle
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            // Icon placeholder
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFF1E293B),
                                modifier = Modifier.size(48.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("📡", fontSize = 24.sp) 
                                }
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text(
                                    text = "Nexus Radar",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "REAL-TIME EVENT DETECTION",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.Gray
                                )
                            }
                        }
                        Switch(
                            checked = isRadarEnabled,
                            onCheckedChange = { 
                                isRadarEnabled = it
                                saveSettings()
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color(0xFF6366F1),
                                uncheckedBorderColor = Color.Gray,
                                uncheckedThumbColor = Color.Gray,
                                uncheckedTrackColor = Color.Transparent
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Detection Radius
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("DETECTION RADIUS", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        Text("${detectionRadius.toInt()} km", style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = detectionRadius,
                        onValueChange = { detectionRadius = it },
                        onValueChangeFinished = { saveSettings() },
                        valueRange = 1f..50f,
                        colors = SliderDefaults.colors(
                            thumbColor = Color(0xFF6366F1),
                            activeTrackColor = Color(0xFF6366F1),
                            inactiveTrackColor = Color(0xFF1E293B)
                        )
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("HIGH PRECISION (1KM)", style = MaterialTheme.typography.labelSmall, color = Color.DarkGray, fontSize = 10.sp)
                        Text("WIDE REACH (50KM)", style = MaterialTheme.typography.labelSmall, color = Color.DarkGray, fontSize = 10.sp)
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // My Interests
                    Text("MY INTERESTS", style = MaterialTheme.typography.labelSmall, color = Color.Gray, modifier = Modifier.padding(bottom = 12.dp))
                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        interests.forEach { interest ->
                            val isSelected = selectedInterests.contains(interest)
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    if (isSelected) selectedInterests.remove(interest)
                                    else selectedInterests.add(interest)
                                    saveSettings()
                                },
                                label = { Text(interest) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFF1E293B),
                                    selectedLabelColor = Color.White,
                                    containerColor = Color.Transparent,
                                    labelColor = Color.Gray,
                                    disabledContainerColor = Color.Transparent
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = isSelected,
                                    borderColor = if (isSelected) Color(0xFF6366F1) else Color(0xFF1E293B),
                                    borderWidth = 1.dp
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Smart Notifications
                    Text("SMART NOTIFICATIONS", style = MaterialTheme.typography.labelSmall, color = Color.Gray, modifier = Modifier.padding(bottom = 12.dp))
                    
                    // Active Events
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF020617)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(modifier = Modifier.weight(1f)) {
                                Text("🎉", modifier = Modifier.padding(end = 12.dp))
                                Column {
                                    Text("Active Events", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text("Get notified about events happening RIGHT NOW", color = Color.Gray, fontSize = 12.sp, lineHeight = 16.sp)
                                }
                            }
                            Switch(
                                checked = activeEventsEnabled,
                                onCheckedChange = { 
                                    activeEventsEnabled = it
                                    saveSettings()
                                },
                                colors = SwitchDefaults.colors(checkedTrackColor = Color(0xFF6366F1)),
                                modifier = Modifier.scale(0.8f)
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))

                    // Upcoming Events
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF020617)),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(modifier = Modifier.weight(1f)) {
                                Text("🗓️", modifier = Modifier.padding(end = 12.dp))
                                Column {
                                    Text("Upcoming Events", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    Text("Alerts for events starting soon in your area", color = Color.Gray, fontSize = 12.sp, lineHeight = 16.sp)
                                }
                            }
                            Switch(
                                checked = upcomingEventsEnabled,
                                onCheckedChange = { 
                                    upcomingEventsEnabled = it
                                    saveSettings()
                                },
                                colors = SwitchDefaults.colors(checkedTrackColor = Color(0xFF6366F1)),
                                modifier = Modifier.scale(0.8f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Upcoming Window
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("UPCOMING WINDOW", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        Text("${upcomingWindow.toInt()}h", style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = upcomingWindow,
                        onValueChange = { upcomingWindow = it },
                        onValueChangeFinished = { saveSettings() },
                        valueRange = 1f..72f,
                        colors = SliderDefaults.colors(thumbColor = Color(0xFF6366F1), activeTrackColor = Color(0xFF6366F1))
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("1 HOUR", style = MaterialTheme.typography.labelSmall, color = Color.DarkGray, fontSize = 10.sp)
                        Text("72 HOURS (3 DAYS)", style = MaterialTheme.typography.labelSmall, color = Color.DarkGray, fontSize = 10.sp)
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))

                    // Min Tickets
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("MIN. TICKETS AVAILABLE", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        Text("${minTickets.toInt()}", style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Slider(
                        value = minTickets,
                        onValueChange = { minTickets = it },
                        onValueChangeFinished = { saveSettings() },
                        valueRange = 1f..50f,
                        colors = SliderDefaults.colors(thumbColor = Color(0xFF6366F1), activeTrackColor = Color(0xFF6366F1))
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("ANY (1+)", style = MaterialTheme.typography.labelSmall, color = Color.DarkGray, fontSize = 10.sp)
                        Text("SELECTIVE (20+)", style = MaterialTheme.typography.labelSmall, color = Color.DarkGray, fontSize = 10.sp)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Info Cards
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                // How does radar work
                Card(
                    modifier = Modifier.weight(1f),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF6366F1)),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("How does Radar work?", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "As you move, Nexus pings you when events matching your interests are nearby.",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Surface(
                            color = Color.White.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("📍", fontSize = 12.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("LOCATION IS SECURELY ENCRYPTED", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            // Notification Channels
            Text(
                text = "Notification Channels",
                style = MaterialTheme.typography.titleMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    // Push Notifications
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF6366F1),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("📱", color = Color.White)
                                }
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text("Push Notifications", color = Color.White, fontWeight = FontWeight.Bold)
                                Text("Receive alerts directly on your device", color = Color.Gray, fontSize = 12.sp)
                            }
                        }
                        Switch(
                            checked = pushNotificationsEnabled,
                            onCheckedChange = { 
                                pushNotificationsEnabled = it
                                saveSettings()
                            },
                            colors = SwitchDefaults.colors(checkedTrackColor = Color(0xFF6366F1))
                        )
                    }
                    
                    Divider(color = Color(0xFF1E293B), modifier = Modifier.padding(vertical = 16.dp))
                    
                    // Email Notifications
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF6366F1),
                                modifier = Modifier.size(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("📧", color = Color.White)
                                }
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column {
                                Text("Email Notifications", color = Color.White, fontWeight = FontWeight.Bold)
                                Text("Weekly summaries and updates", color = Color.Gray, fontSize = 12.sp)
                            }
                        }
                        Switch(
                            checked = emailNotificationsEnabled,
                            onCheckedChange = { 
                                emailNotificationsEnabled = it
                                saveSettings()
                            },
                            colors = SwitchDefaults.colors(checkedTrackColor = Color(0xFF6366F1))
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(100.dp)) // Bottom padding for navigation
        }
    }
}

// Helper for modifiers
fun Modifier.scale(scale: Float): Modifier = this.then(
    Modifier.graphicsLayer(scaleX = scale, scaleY = scale)
)
