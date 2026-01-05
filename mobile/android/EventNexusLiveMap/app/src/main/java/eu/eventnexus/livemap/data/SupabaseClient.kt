package eu.eventnexus.livemap.data

import android.content.Context
import eu.eventnexus.livemap.BuildConfig
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.providers.Google
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

object SupabaseClient {
    private lateinit var context: Context
    
    val client by lazy {
        createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Auth) {
                // Initialize Google provider
                // This will allow us to use Google Sign-In through Supabase
                // The webClientId should be configured in your Supabase dashboard
            }
            install(Postgrest)
            install(Realtime)
            install(Storage)
            install(Functions)
        }
    }
    
    fun initialize(appContext: Context) {
        context = appContext.applicationContext
    }
    
    fun getContext(): Context = context
}
