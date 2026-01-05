# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep Supabase classes
-keep class io.github.jan.supabase.** { *; }
-keep class io.ktor.** { *; }

# Keep Google Maps
-keep class com.google.android.gms.maps.** { *; }

# Keep ZXing
-keep class com.google.zxing.** { *; }

# Keep data classes
-keep class eu.eventnexus.livemap.data.** { *; }

-dontwarn org.slf4j.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
# Ktor - ignore Java Management API (not available on Android)
-dontwarn java.lang.management.**
-keep class io.ktor.util.debug.** { *; }

# Keep serialization for Supabase models
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt

# Keep all model classes for serialization
-keep,includedescriptorclasses class eu.eventnexus.livemap.data.model.**$$serializer { *; }
-keepclassmembers class eu.eventnexus.livemap.data.model.** {
    *** Companion;
}
-keepclasseswithmembers class eu.eventnexus.livemap.data.model.** {
    kotlinx.serialization.KSerializer serializer(...);
}