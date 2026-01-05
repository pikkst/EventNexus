package eu.eventnexus.livemap

import android.app.Application
import eu.eventnexus.livemap.data.SupabaseClient
import org.osmdroid.config.Configuration

class LiveMapApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize osmdroid configuration
        Configuration.getInstance().load(
            applicationContext,
            applicationContext.getSharedPreferences("osmdroid", MODE_PRIVATE)
        )
        Configuration.getInstance().userAgentValue = packageName
        
        // Initialize Supabase
        SupabaseClient.initialize(this)
    }
}
