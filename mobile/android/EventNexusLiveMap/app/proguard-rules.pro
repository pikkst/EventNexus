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
