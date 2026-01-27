package eu.eventnexus.adminsupport.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Message
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import eu.eventnexus.adminsupport.data.models.SupportChat
import eu.eventnexus.adminsupport.data.remote.SupabaseService
import eu.eventnexus.adminsupport.data.repository.ChatRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatListScreen(
    onChatClick: (String) -> Unit,
    onLogout: () -> Unit
) {
    var chats by remember { mutableStateOf<List<SupportChat>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val supabaseService = remember { SupabaseService() }
    val chatRepository = remember { ChatRepository() }
    val scope = rememberCoroutineScope()

    // Auto-refresh every 10 seconds
    LaunchedEffect(Unit) {
        while (true) {
            try {
                val adminId = supabaseService.getCurrentUserId()
                if (adminId != null) {
                    chats = chatRepository.getOpenChats(adminId)
                    errorMessage = null
                }
            } catch (e: Exception) {
                errorMessage = "Failed to load chats: ${e.message}"
            } finally {
                isLoading = false
            }
            delay(10000) // Refresh every 10 seconds
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Support Chats") },
                actions = {
                    IconButton(onClick = {
                        scope.launch {
                            supabaseService.signOut()
                            onLogout()
                        }
                    }) {
                        Icon(Icons.Default.Logout, contentDescription = "Logout")
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
                errorMessage != null -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = errorMessage ?: "",
                            color = MaterialTheme.colorScheme.error
                        )
                        Button(
                            onClick = {
                                scope.launch {
                                    isLoading = true
                                    errorMessage = null
                                    try {
                                        val adminId = supabaseService.getCurrentUserId()
                                        if (adminId != null) {
                                            chats = chatRepository.getOpenChats(adminId)
                                        }
                                    } catch (e: Exception) {
                                        errorMessage = "Failed to load chats"
                                    } finally {
                                        isLoading = false
                                    }
                                }
                            },
                            modifier = Modifier.padding(top = 16.dp)
                        ) {
                            Text("Retry")
                        }
                    }
                }
                chats.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Message,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "No active chats",
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier.padding(top = 16.dp)
                        )
                    }
                }
                else -> {
                    LazyColumn {
                        items(chats) { chat ->
                            ChatListItem(
                                chat = chat,
                                onClick = { onChatClick(chat.id) }
                            )
                            Divider()
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChatListItem(
    chat: SupportChat,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = chat.userName ?: chat.userEmail ?: "Anonymous",
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (chat.unreadCount > 0) {
                        Badge {
                            Text(chat.unreadCount.toString())
                        }
                    }
                }

                Text(
                    text = chat.lastMessage ?: "No messages yet",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 4.dp)
                )

                Text(
                    text = formatTime(chat.lastMessageAt ?: chat.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )

                // Status badge
                Surface(
                    color = when (chat.status) {
                        "open" -> MaterialTheme.colorScheme.errorContainer
                        "assigned" -> MaterialTheme.colorScheme.primaryContainer
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    },
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Text(
                        text = chat.status.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

private fun formatTime(timestamp: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = sdf.parse(timestamp.substringBefore('.'))
        val now = Calendar.getInstance()
        val messageTime = Calendar.getInstance().apply { time = date }

        when {
            now.get(Calendar.DAY_OF_YEAR) == messageTime.get(Calendar.DAY_OF_YEAR) -> {
                SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
            }
            now.get(Calendar.DAY_OF_YEAR) - messageTime.get(Calendar.DAY_OF_YEAR) == 1 -> {
                "Yesterday"
            }
            else -> {
                SimpleDateFormat("dd MMM", Locale.getDefault()).format(date)
            }
        }
    } catch (e: Exception) {
        ""
    }
}
