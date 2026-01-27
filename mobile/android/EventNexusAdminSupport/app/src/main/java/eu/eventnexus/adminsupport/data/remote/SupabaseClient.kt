package eu.eventnexus.adminsupport.data.remote

import eu.eventnexus.adminsupport.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.realtime.createChannel
import io.github.jan.supabase.realtime.postgresChangeFlow
import io.github.jan.supabase.realtime.realtime
import io.ktor.client.engine.android.Android
import kotlinx.coroutines.flow.Flow

object SupabaseClientInstance {
    val client: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Auth)
            install(Postgrest)
            install(Realtime)
            
            httpEngine = Android.create()
        }
    }
}

class SupabaseService {
    private val client = SupabaseClientInstance.client

    suspend fun signIn(email: String, password: String) {
        client.auth.signInWith(io.github.jan.supabase.gotrue.providers.builtin.Email) {
            this.email = email
            this.password = password
        }
    }

    suspend fun signOut() {
        client.auth.signOut()
    }

    fun isSignedIn(): Boolean {
        return client.auth.currentUserOrNull() != null
    }

    fun getCurrentUserId(): String? {
        return client.auth.currentUserOrNull()?.id
    }

    fun getCurrentUserEmail(): String? {
        return client.auth.currentUserOrNull()?.email
    }

    suspend fun updateFcmToken(userId: String, token: String) {
        client.postgrest["users"]
            .update({
                set("fcm_token", token)
            }) {
                filter {
                    eq("id", userId)
                }
            }
    }

    fun subscribeToNewChats(): Flow<Any> {
        val channel = client.realtime.createChannel("admin-chats")
        return channel.postgresChangeFlow<Any>(schema = "public") {
            table = "support_chats"
            filter = "status=eq.open"
        }
    }

    fun subscribeToChatMessages(chatId: String): Flow<Any> {
        val channel = client.realtime.createChannel("chat-$chatId")
        return channel.postgresChangeFlow<Any>(schema = "public") {
            table = "support_chat_messages"
            filter = "chat_id=eq.$chatId"
        }
    }
}
