package eu.eventnexus.adminsupport.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import eu.eventnexus.adminsupport.data.models.ChatMessage
import eu.eventnexus.adminsupport.data.remote.SupabaseService
import eu.eventnexus.adminsupport.data.repository.ChatRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    chatId: String,
    onBackClick: () -> Unit
) {
    var messages by remember { mutableStateOf<List<ChatMessage>>(emptyList()) }
    var messageText by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSending by remember { mutableStateOf(false) }
    var showAiSuggestion by remember { mutableStateOf(false) }
    var aiSuggestion by remember { mutableStateOf<String?>(null) }

    val supabaseService = remember { SupabaseService() }
    val chatRepository = remember { ChatRepository() }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    // Load messages and auto-refresh
    LaunchedEffect(chatId) {
        while (true) {
            try {
                messages = chatRepository.getChatMessages(chatId)
                val adminId = supabaseService.getCurrentUserId()
                if (adminId != null) {
                    chatRepository.markMessagesAsRead(chatId, adminId)
                }
            } catch (e: Exception) {
                // Handle error silently
            } finally {
                isLoading = false
            }
            delay(3000) // Refresh every 3 seconds
        }
    }

    // Auto-scroll to bottom on new messages
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Support Chat") },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            scope.launch {
                                try {
                                    chatRepository.resolveChat(chatId)
                                    onBackClick()
                                } catch (e: Exception) {
                                    // Handle error
                                }
                            }
                        }
                    ) {
                        Icon(Icons.Default.Check, contentDescription = "Resolve")
                    }
                }
            )
        },
        bottomBar = {
            Column {
                // AI Suggestion
                if (showAiSuggestion && aiSuggestion != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "AI Suggestion",
                                    style = MaterialTheme.typography.labelMedium
                                )
                                TextButton(onClick = { showAiSuggestion = false }) {
                                    Text("Dismiss")
                                }
                            }
                            Text(
                                text = aiSuggestion ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                            Button(
                                onClick = {
                                    messageText = aiSuggestion ?: ""
                                    showAiSuggestion = false
                                },
                                modifier = Modifier.align(Alignment.End)
                            ) {
                                Text("Use This")
                            }
                        }
                    }
                }

                // Message input
                Surface(
                    tonalElevation = 3.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        verticalAlignment = Alignment.Bottom
                    ) {
                        IconButton(
                            onClick = {
                                scope.launch {
                                    try {
                                        val lastUserMessage = messages
                                            .lastOrNull { it.senderType == "user" }
                                            ?.message
                                        if (lastUserMessage != null) {
                                            aiSuggestion = chatRepository.getAiSuggestion(
                                                chatId,
                                                lastUserMessage
                                            )
                                            showAiSuggestion = true
                                        }
                                    } catch (e: Exception) {
                                        // Handle error
                                    }
                                }
                            }
                        ) {
                            Icon(Icons.Default.SmartToy, contentDescription = "AI Suggestion")
                        }

                        OutlinedTextField(
                            value = messageText,
                            onValueChange = { messageText = it },
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 4.dp),
                            placeholder = { Text("Type a message...") },
                            maxLines = 4
                        )

                        IconButton(
                            onClick = {
                                scope.launch {
                                    if (messageText.isNotBlank()) {
                                        isSending = true
                                        try {
                                            val adminId = supabaseService.getCurrentUserId()
                                            if (adminId != null) {
                                                chatRepository.sendMessage(
                                                    chatId,
                                                    adminId,
                                                    messageText.trim()
                                                )
                                                messageText = ""
                                                showAiSuggestion = false
                                            }
                                        } catch (e: Exception) {
                                            // Handle error
                                        } finally {
                                            isSending = false
                                        }
                                    }
                                }
                            },
                            enabled = messageText.isNotBlank() && !isSending
                        ) {
                            if (isSending) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp)
                                )
                            } else {
                                Icon(Icons.Default.Send, contentDescription = "Send")
                            }
                        }
                    }
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(8.dp)
                ) {
                    items(messages) { message ->
                        MessageBubble(message)
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun MessageBubble(message: ChatMessage) {
    val isAdmin = message.senderType == "admin"
    val isAi = message.senderType == "ai"

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isAdmin) Arrangement.End else Arrangement.Start
    ) {
        Card(
            modifier = Modifier.widthIn(max = 280.dp),
            colors = CardDefaults.cardColors(
                containerColor = when {
                    isAdmin -> MaterialTheme.colorScheme.primaryContainer
                    isAi -> MaterialTheme.colorScheme.tertiaryContainer
                    else -> MaterialTheme.colorScheme.surfaceVariant
                }
            ),
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isAdmin) 16.dp else 4.dp,
                bottomEnd = if (isAdmin) 4.dp else 16.dp
            )
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = message.message,
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = formatMessageTime(message.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}

private fun formatMessageTime(timestamp: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val date = sdf.parse(timestamp.substringBefore('.'))
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
    } catch (e: Exception) {
        ""
    }
}
