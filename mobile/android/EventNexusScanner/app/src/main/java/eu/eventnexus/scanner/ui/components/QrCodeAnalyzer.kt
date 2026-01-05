package eu.eventnexus.scanner.ui.components

import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage

/**
 * QR Code analyzer using ML Kit
 * Detects QR codes in camera frames and extracts their data
 */
class QrCodeAnalyzer(
    private val onQrCodeScanned: (String) -> Unit
) : ImageAnalysis.Analyzer {
    
    private val scanner = BarcodeScanning.getClient()
    private var lastScannedCode: String? = null
    private var lastScanTime: Long = 0
    private val scanThrottleMs = 3000L // 3 seconds
    
    @androidx.camera.core.ExperimentalGetImage
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    for (barcode in barcodes) {
                        if (barcode.valueType == Barcode.TYPE_TEXT || 
                            barcode.valueType == Barcode.TYPE_URL) {
                            val rawValue = barcode.rawValue
                            if (rawValue != null) {
                                // Throttle duplicate scans
                                val now = System.currentTimeMillis()
                                if (rawValue != lastScannedCode || 
                                    (now - lastScanTime) > scanThrottleMs) {
                                    lastScannedCode = rawValue
                                    lastScanTime = now
                                    onQrCodeScanned(rawValue)
                                }
                            }
                        }
                    }
                }
                .addOnFailureListener { e ->
                    e.printStackTrace()
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }
}
