package eu.eventnexus.livemap.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import eu.eventnexus.livemap.data.SupabaseClient
import eu.eventnexus.livemap.data.model.User
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.providers.builtin.IDToken
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

class AuthRepository {
    private val client = SupabaseClient.client
    private val context = SupabaseClient.getContext()
    private val analytics = AnalyticsRepository()
    
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")
    
    private object PreferencesKeys {
        val USER_ID = stringPreferencesKey("user_id")
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
    }
    
    suspend fun signIn(email: String, password: String): Result<User> = withContext(Dispatchers.IO) {
        try {
            analytics.logAuth(AnalyticsRepository.EventType.LOGIN_ATTEMPT, true, email)
            
            client.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            
            analytics.logAuth(AnalyticsRepository.EventType.LOGIN_SUCCESS, true, email)
            handleAuthSuccess()
        } catch (e: Exception) {
            analytics.logAuth(AnalyticsRepository.EventType.LOGIN_FAILURE, false, email)
            
            // Return only the message to avoid leaking headers in UI
            val errorMessage = if (e.message?.contains("Invalid login credentials") == true) {
                "Invalid email or password"
            } else {
                e.message ?: "Login failed"
            }
            Result.failure(Exception(errorMessage))
        }
    }
    
    suspend fun signUp(email: String, password: String, name: String? = null): Result<User> = withContext(Dispatchers.IO) {
        try {
            analytics.logAuth(AnalyticsRepository.EventType.SIGNUP_ATTEMPT, true, email)
            
            client.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            
            analytics.logAuth(AnalyticsRepository.EventType.SIGNUP_SUCCESS, true, email)
            
            // Trigger will create profile automatically
            // Use handleAuthSuccess which will ensure profile exists
            handleAuthSuccess()
        } catch (e: Exception) {
            analytics.logAuth(AnalyticsRepository.EventType.SIGNUP_ATTEMPT, false, email)
            Result.failure(e)
        }
    }
    
    // Google Sign-In with pre-fetched ID Token
    suspend fun signInWithGoogle(idToken: String): Result<User> = withContext(Dispatchers.IO) {
        try {
            analytics.logEvent(AnalyticsRepository.EventType.LOGIN_ATTEMPT, mapOf("method" to "google"))
            
            client.auth.signInWith(IDToken) {
                this.idToken = idToken
                this.provider = Google
            }
            
            analytics.logEvent(AnalyticsRepository.EventType.LOGIN_SUCCESS, mapOf("method" to "google"))
            handleAuthSuccess()
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    private suspend fun handleAuthSuccess(): Result<User> {
        val session = client.auth.currentSessionOrNull()
        val userId = session?.user?.id ?: throw Exception("Authentication failed")
        
        context.dataStore.edit { prefs ->
            prefs[PreferencesKeys.USER_ID] = userId
            session.accessToken.let { prefs[PreferencesKeys.ACCESS_TOKEN] = it }
        }
        
        // Try to get user profile from database
        try {
            val users = client.from("users").select(Columns.ALL) {
                filter {
                    eq("id", userId)
                }
                limit(1)
            }.decodeList<User>()
            
            val user = users.firstOrNull() ?: User(
                id = userId,
                email = session.user?.email ?: "",
                name = session.user?.userMetadata?.get("full_name")?.toString() 
                    ?: session.user?.userMetadata?.get("name")?.toString()
                    ?: session.user?.email?.split("@")?.get(0) ?: "User"
            )
            
            return Result.success(user)
        } catch (e: Exception) {
            // Fallback: return basic user object from session
            return Result.success(User(
                id = userId,
                email = session.user?.email ?: "",
                name = session.user?.userMetadata?.get("full_name")?.toString()
                    ?: session.user?.userMetadata?.get("name")?.toString()
                    ?: session.user?.email?.split("@")?.get(0) ?: "User"
            ))
        }
    }
    
    suspend fun signOut(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            analytics.logEvent(AnalyticsRepository.EventType.LOGOUT)
            client.auth.signOut()
            context.dataStore.edit { prefs -> prefs.clear() }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getCurrentUser(): Result<User?> = withContext(Dispatchers.IO) {
        try {
            val session = client.auth.currentSessionOrNull()
            if (session != null) {
                return@withContext handleAuthSuccess().map { it }
            }
            
            val userId = context.dataStore.data.map { it[PreferencesKeys.USER_ID] }.first()
            if (userId == null) return@withContext Result.success(null)
            
            val users = client.from("users").select(Columns.ALL) {
                filter { eq("id", userId) }
                limit(1)
            }.decodeList<User>()
            
            Result.success(users.firstOrNull())
        } catch (e: Exception) {
            Result.success(null)
        }
    }
    
    suspend fun isLoggedIn(): Boolean {
        return try {
            client.auth.currentSessionOrNull() != null
        } catch (e: Exception) {
            false
        }
    }
}
