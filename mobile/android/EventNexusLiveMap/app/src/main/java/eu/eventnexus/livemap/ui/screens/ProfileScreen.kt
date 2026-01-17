package eu.eventnexus.livemap.ui.screens

import android.content.Context
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import eu.eventnexus.livemap.R
import eu.eventnexus.livemap.data.model.User
import eu.eventnexus.livemap.data.repository.AuthRepository
import io.github.jan.supabase.compose.auth.ui.ProviderButtonContent
import io.github.jan.supabase.gotrue.providers.Google
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen() {
    val scope = rememberCoroutineScope()
    val authRepository = remember { AuthRepository() }
    val context = LocalContext.current
    
    var user by remember { mutableStateOf<User?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var isLoggedIn by remember { mutableStateOf(false) }
    var showLoginDialog by remember { mutableStateOf(false) }
    var showRegisterDialog by remember { mutableStateOf(false) }
    
    fun loadUser() {
        scope.launch {
            isLoading = true
            val result = authRepository.getCurrentUser()
            user = result.getOrNull()
            isLoggedIn = user != null
            isLoading = false
        }
    }
    
    LaunchedEffect(Unit) {
        loadUser()
    }
    
    Scaffold(
        containerColor = Color(0xFF020617) // Dark background
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                isLoading -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = Color(0xFF6366f1)
                    )
                }
                !isLoggedIn -> {
                    // Show Login Dialog directly if not logged in
                    LoginDialogContent(
                        onDismiss = { /* Cannot dismiss without login for now or maybe just show empty state */ },
                        onSuccess = { loadUser() },
                        onRegisterClick = { showRegisterDialog = true },
                        authRepository = authRepository
                    )
                }
                user != null -> {
                    ProfileContent(
                        user = user!!,
                        onLogout = {
                            scope.launch {
                                authRepository.signOut()
                                loadUser()
                            }
                        }
                    )
                }
            }
            
            // Register dialog
            if (showRegisterDialog) {
                RegisterDialog(
                    onDismiss = { showRegisterDialog = false },
                    onSuccess = {
                        showRegisterDialog = false
                        loadUser()
                    },
                    authRepository = authRepository
                )
            }
        }
    }
}

@Composable
fun LoginDialogContent(
    onDismiss: () -> Unit,
    onSuccess: () -> Unit,
    onRegisterClick: () -> Unit,
    authRepository: AuthRepository
) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
            .wrapContentHeight(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                text = "Welcome Back",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            
            Text(
                text = "Join the global Nexus network.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray,
                modifier = Modifier.padding(bottom = 24.dp)
            )
            
            // Email Input
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email Address") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    focusedBorderColor = Color(0xFF6366F1),
                    unfocusedBorderColor = Color(0xFF1E293B),
                    containerColor = Color(0xFF020617),
                    focusedLabelColor = Color(0xFF6366F1),
                    unfocusedLabelColor = Color.Gray,
                    cursorColor = Color(0xFF6366F1),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Password Input
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    focusedBorderColor = Color(0xFF6366F1),
                    unfocusedBorderColor = Color(0xFF1E293B),
                    containerColor = Color(0xFF020617),
                    focusedLabelColor = Color(0xFF6366F1),
                    unfocusedLabelColor = Color.Gray,
                    cursorColor = Color(0xFF6366F1),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp)
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Sign In Button
            Button(
                onClick = {
                    scope.launch {
                        isLoading = true
                        error = null
                        authRepository.signIn(email, password)
                            .onSuccess { onSuccess() }
                            .onFailure { e ->
                                error = e.message ?: "Login failed"
                                isLoading = false
                            }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                } else {
                    Text("SIGN IN", fontWeight = FontWeight.Bold)
                }
            }
            
            error?.let {
                Text(
                    text = it,
                    color = Color.Red,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Divider
            Row(verticalAlignment = Alignment.CenterVertically) {
                Divider(modifier = Modifier.weight(1f), color = Color(0xFF1E293B))
                Text(
                    text = "OR CONTINUE WITH",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.Gray,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                Divider(modifier = Modifier.weight(1f), color = Color(0xFF1E293B))
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Google Button
            OutlinedButton(
                onClick = {
                    // Start Google Sign In flow
                    scope.launch {
                        // In a real app, this would launch the Google Sign-In intent
                        // For now, we'll just show a placeholder error or implement if keys are present
                         // authRepository.signInWithGoogle() // Requires detailed setup
                         error = "Google Sign-In requires configuration in Supabase Console"
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = Color(0xFF020617),
                    contentColor = Color.White
                ),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
            ) {
                Icon(
                    // Using a default icon, ideally use Google logo resource
                    imageVector = Icons.Default.AccountCircle, 
                    contentDescription = "Google",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Google", fontWeight = FontWeight.Bold)
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Sign Up Link
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Don't have an account? ", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                TextButton(onClick = onRegisterClick) {
                    Text("Sign Up", color = Color(0xFF6366F1), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun RegisterDialog(
    onDismiss: () -> Unit,
    onSuccess: () -> Unit,
    authRepository: AuthRepository
) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    
    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Create Account",
                    style = MaterialTheme.typography.headlineMedium,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Full Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFF020617),
                        unfocusedContainerColor = Color(0xFF020617),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedIndicatorColor = Color(0xFF6366F1),
                        unfocusedIndicatorColor = Color(0xFF1E293B)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFF020617),
                        unfocusedContainerColor = Color(0xFF020617),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedIndicatorColor = Color(0xFF6366F1),
                        unfocusedIndicatorColor = Color(0xFF1E293B)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFF020617),
                        unfocusedContainerColor = Color(0xFF020617),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedIndicatorColor = Color(0xFF6366F1),
                        unfocusedIndicatorColor = Color(0xFF1E293B)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = { Text("Confirm Password") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color(0xFF020617),
                        unfocusedContainerColor = Color(0xFF020617),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedIndicatorColor = Color(0xFF6366F1),
                        unfocusedIndicatorColor = Color(0xFF1E293B)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
                
                error?.let {
                    Text(
                        text = it,
                        color = Color.Red,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = {
                        if (password != confirmPassword) {
                            error = "Passwords do not match"
                            return@Button
                        }
                        
                        scope.launch {
                            isLoading = true
                            error = null
                            authRepository.signUp(email, password, name)
                                .onSuccess { onSuccess() }
                                .onFailure { e ->
                                    error = e.message ?: "Registration failed"
                                    isLoading = false
                                }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1))
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    } else {
                        Text("Sign Up", fontWeight = FontWeight.Bold)
                    }
                }
                
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.padding(top = 8.dp)
                ) {
                    Text("Cancel", color = Color.Gray)
                }
            }
        }
    }
}

@Composable
fun ProfileContent(
    user: User,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // User Avatar
        if (user.avatar_url != null) {
            AsyncImage(
                model = user.avatar_url,
                contentDescription = "Avatar",
                modifier = Modifier
                    .size(100.dp)
                    .clip(RoundedCornerShape(50.dp)),
                contentScale = ContentScale.Crop
            )
        } else {
            Surface(
                modifier = Modifier.size(100.dp),
                shape = RoundedCornerShape(50.dp),
                color = Color(0xFF6366F1)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = user.name?.take(1)?.uppercase() ?: user.email.take(1).uppercase(),
                        fontSize = 40.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = user.name ?: "Nexus User",
            style = MaterialTheme.typography.headlineSmall,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )
        
        Text(
            text = user.email,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        // Account Info Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                ProfileOption(Icons.Filled.Badge, "Role", user.role.replaceFirstChar { it.uppercase() })
                Divider(color = Color(0xFF1E293B), modifier = Modifier.padding(vertical = 12.dp))
                ProfileOption(Icons.Filled.CalendarToday, "Member Since", user.created_at?.take(10) ?: "Recently")
                Divider(color = Color(0xFF1E293B), modifier = Modifier.padding(vertical = 12.dp))
                ProfileOption(Icons.Filled.Phone, "Phone", user.phone ?: "Not added")
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)) // Red for logout
        ) {
            Icon(Icons.Filled.Logout, "Logout", tint = Color.White)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Sign Out", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun ProfileOption(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            shape = RoundedCornerShape(8.dp),
            color = Color(0xFF1E293B),
            modifier = Modifier.size(40.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = title, tint = Color(0xFF6366F1), modifier = Modifier.size(20.dp))
            }
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(title, style = MaterialTheme.typography.labelMedium, color = Color.Gray)
            Text(value, style = MaterialTheme.typography.bodyLarge, color = Color.White)
        }
    }
}
