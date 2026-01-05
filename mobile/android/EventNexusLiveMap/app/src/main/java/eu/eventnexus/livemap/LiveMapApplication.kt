package eu.eventnexus.livemap

import android.app.Application
import eu.eventnexus.livemap.data.SupabaseClient

class LiveMapApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        SupabaseClient.initialize(this)
    }
}
