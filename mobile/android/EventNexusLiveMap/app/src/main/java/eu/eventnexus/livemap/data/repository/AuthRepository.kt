package eu.eventnexus.livemap.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import eu.eventnexus.livemap.data.SupabaseClient
import eu.eventnexus.livemap.data.model.User
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

class AuthRepository {
    private val client = SupabaseClient.client
    private val context = SupabaseClient.getContext()
    
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")
    
    private object PreferencesKeys {
        val USER_ID = stringPreferencesKey("user_id")
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
    }
    
    suspend fun signIn(email: String, password: String): Result<User> = withContext(Dispatchers.IO) {
        try {
            val result = client.auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            
            val userId = result.id ?: throw Exception("No user ID")
            
            // Save session
            context.dataStore.edit { prefs ->
                prefs[PreferencesKeys.USER_ID] = userId
                result.accessToken?.let { prefs[PreferencesKeys.ACCESS_TOKEN] = it }
            }
            
            // Get user profile
            val userResult = client.from("users")
                .select()
                .eq("id", userId)
                .single()
                .execute()
            
            val user = userResult.decodeAs<User>()
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signUp(email: String, password: String, name: String? = null): Result<User> = withContext(Dispatchers.IO) {
        try {
            val result = client.auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            
            val userId = result.id ?: throw Exception("No user ID")
            
            // Create user profile
            client.from("users")
                .insert(mapOf(
                    "id" to userId,
                    "email" to email,
                    "name" to name
                ))
                .execute()
            
            // Save session
            context.dataStore.edit { prefs ->
                prefs[PreferencesKeys.USER_ID] = userId
                result.accessToken?.let { prefs[PreferencesKeys.ACCESS_TOKEN] = it }
            }
            
            val user = User(
                id = userId,
                email = email,
                name = name
            )
            
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signOut(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            client.auth.signOut()
            
            context.dataStore.edit { prefs ->
                prefs.clear()
            }
            
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getCurrentUser(): Result<User?> = withContext(Dispatchers.IO) {
        try {
            val userId = context.dataStore.data
                .map { prefs -> prefs[PreferencesKeys.USER_ID] }
                .first()
            
            if (userId == null) {
                return@withContext Result.success(null)
            }
            
            val result = client.from("users")
                .select()
                .eq("id", userId)
                .single()
                .execute()
            
            val user = result.decodeAs<User>()
            Result.success(user)
        } catch (e: Exception) {
            Result.success(null)
        }
    }
    
    suspend fun isLoggedIn(): Boolean {
        return try {
            val userId = context.dataStore.data
                .map { prefs -> prefs[PreferencesKeys.USER_ID] }
                .first()
            userId != null
        } catch (e: Exception) {
            false
        }
    }
}
