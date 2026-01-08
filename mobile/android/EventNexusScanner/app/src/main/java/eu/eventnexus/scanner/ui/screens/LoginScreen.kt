package eu.eventnexus.scanner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import eu.eventnexus.scanner.viewmodel.ScannerViewModel
import kotlinx.coroutines.launch

/**
 * Login screen where users enter their scanner code
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    viewModel: ScannerViewModel
) {
    var scannerCode by remember { mutableStateOf("") }
    var isAuthenticating by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0f172a),
                        Color(0xFF1e293b)
                    )
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Spacer(modifier = Modifier.height(60.dp))
            
            // Logo and title
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.QrCodeScanner,
                    contentDescription = null,
                    modifier = Modifier.size(100.dp),
                    tint = Color(0xFF6366f1)
                )
                
                Text(
                    text = "EventNexus",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                
                Text(
                    text = "Ticket Scanner",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.Gray
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Scanner code input
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                Text(
                    text = "Enter Scanner Code",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                
                OutlinedTextField(
                    value = scannerCode,
                    onValueChange = { scannerCode = it.uppercase().take(8) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = LocalTextStyle.current.copy(
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        color = Color.White
                    ),
                    placeholder = {
                        Text(
                            text = "XXXXXXXX",
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Center,
                            color = Color.Gray
                        )
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color(0xFF6366f1),
                        unfocusedBorderColor = Color.Gray,
                        focusedContainerColor = Color.White.copy(alpha = 0.1f),
                        unfocusedContainerColor = Color.White.copy(alpha = 0.1f),
                        cursorColor = Color(0xFF6366f1)
                    ),
                    shape = RoundedCornerShape(15.dp),
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Characters,
                        keyboardType = KeyboardType.Text
                    ),
                    singleLine = true
                )
                
                errorMessage?.let { error ->
                    Text(
                        text = error,
                        color = Color.Red,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center
                    )
                }
                
                Button(
                    onClick = {
                        if (scannerCode.length == 8) {
                            isAuthenticating = true
                            errorMessage = null
                            scope.launch {
                                try {
                                    println("🔐 Starting authentication with code: $scannerCode")
                                    viewModel.authenticateWithCode(scannerCode)
                                    println("✅ Authentication successful!")
                                    isAuthenticating = false
                                } catch (e: Exception) {
                                    println("❌ Authentication failed: ${e.message}")
                                    e.printStackTrace()
                                    isAuthenticating = false
                                    errorMessage = when {
                                        e.message?.contains("Failed to connect") == true -> 
                                            "Connection failed. Check your internet."
                                        e.message?.contains("Invalid scanner code") == true -> 
                                            "Invalid or expired scanner code"
                                        e.message?.contains("Authentication failed") == true -> 
                                            e.message?.substringAfter(": ") ?: "Authentication failed"
                                        else -> "Error: ${e.message ?: "Unknown error"}"
                                    }
                                }
                            }
                        } else {
                            errorMessage = "Scanner code must be 8 characters"
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    enabled = scannerCode.length == 8 && !isAuthenticating,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF6366f1),
                        disabledContainerColor = Color.Gray
                    ),
                    shape = RoundedCornerShape(15.dp)
                ) {
                    if (isAuthenticating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White
                        )
                    } else {
                        Text(
                            text = "Connect to Event",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Info text
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "Get your scanner code from the",
                    fontSize = 14.sp,
                    color = Color.Gray
                )
                Text(
                    text = "EventNexus organizer dashboard",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF6366f1)
                )
            }
            
            Spacer(modifier = Modifier.height(30.dp))
        }
    }
}
