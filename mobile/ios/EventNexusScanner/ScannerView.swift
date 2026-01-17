//
//  ScannerView.swift
//  EventNexusScanner
//
//  QR Code scanning view with real-time validation
//

import SwiftUI
import AVFoundation

struct ScannerView: View {
    @EnvironmentObject var viewModel: ScannerViewModel
    @State private var isScanning = false
    @State private var showingResult = false
    @State private var scanResult: ScanResult?
    
    var body: some View {
        ZStack {
            // Camera view
            if isScanning {
                CameraPreview(
                    onQRCodeScanned: { code in
                        handleQRCode(code)
                    }
                )
                .ignoresSafeArea()
                
                // Scanning overlay
                VStack {
                    // Top bar with event info
                    HStack {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(viewModel.currentEvent?.name ?? "Event")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                            Text("Scan tickets to check-in")
                                .font(.system(size: 14))
                                .foregroundColor(.white.opacity(0.8))
                        }
                        
                        Spacer()
                        
                        Button(action: {
                            viewModel.logout()
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 28))
                                .foregroundColor(.white)
                        }
                    }
                    .padding()
                    .background(Color.black.opacity(0.7))
                    
                    Spacer()
                    
                    // Scanner frame
                    ScannerFrame()
                    
                    Spacer()
                    
                    // Stats bar
                    HStack(spacing: 30) {
                        StatView(
                            icon: "checkmark.circle.fill",
                            value: "\(viewModel.scannedCount)",
                            label: "Scanned"
                        )
                        
                        StatView(
                            icon: "clock.fill",
                            value: viewModel.sessionDuration,
                            label: "Duration"
                        )
                        
                        StatView(
                            icon: "antenna.radiowaves.left.and.right",
                            value: viewModel.isConnected ? "Live" : "Offline",
                            label: "Status"
                        )
                    }
                    .padding()
                    .background(Color.black.opacity(0.7))
                }
            } else {
                // Start scanning button
                VStack(spacing: 30) {
                    Spacer()
                    
                    if let event = viewModel.currentEvent {
                        VStack(spacing: 15) {
                            Image(systemName: "qrcode.viewfinder")
                                .font(.system(size: 80))
                                .foregroundColor(Color(hex: "6366f1"))
                            
                            Text("Ready to Scan")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.white)
                            
                            Text(event.name)
                                .font(.system(size: 18))
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 40)
                        }
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        isScanning = true
                    }) {
                        Text("Start Scanning")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 15)
                                    .fill(Color(hex: "6366f1"))
                            )
                            .shadow(color: Color(hex: "6366f1").opacity(0.3), radius: 10, y: 5)
                    }
                    .padding(.horizontal, 40)
                    .padding(.bottom, 50)
                }
            }
            
            // Result overlay
            if showingResult, let result = scanResult {
                ScanResultOverlay(result: result) {
                    showingResult = false
                    scanResult = nil
                }
                .transition(.scale)
            }
        }
        .animation(.spring(), value: showingResult)
    }
    
    private func handleQRCode(_ code: String) {
        Task {
            do {
                let result = try await viewModel.validateTicket(qrCode: code)
                scanResult = result
                showingResult = true
                
                // Auto-dismiss after 3 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    if showingResult {
                        showingResult = false
                        scanResult = nil
                    }
                }
            } catch {
                scanResult = ScanResult(
                    success: false,
                    message: error.localizedDescription,
                    ticketInfo: nil
                )
                showingResult = true
            }
        }
    }
}

struct ScannerFrame: View {
    var body: some View {
        ZStack {
            Rectangle()
                .stroke(Color(hex: "6366f1"), lineWidth: 4)
                .frame(width: 280, height: 280)
            
            // Corner decorations
            ForEach(0..<4) { index in
                CornerDecoration()
                    .rotationEffect(.degrees(Double(index) * 90))
                    .offset(
                        x: index % 2 == 0 ? -140 : 140,
                        y: index < 2 ? -140 : 140
                    )
            }
        }
    }
}

struct CornerDecoration: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Rectangle()
                .fill(Color(hex: "6366f1"))
                .frame(width: 30, height: 4)
            Rectangle()
                .fill(Color(hex: "6366f1"))
                .frame(width: 4, height: 30)
        }
    }
}

struct StatView: View {
    let icon: String
    let value: String
    let label: String
    
    var body: some View {
        VStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(Color(hex: "6366f1"))
            Text(value)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.gray)
        }
    }
}

struct ScanResultOverlay: View {
    let result: ScanResult
    let onDismiss: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: result.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(result.success ? .green : .red)
            
            Text(result.success ? "Valid Ticket" : "Invalid Ticket")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)
            
            Text(result.message)
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            if let ticketInfo = result.ticketInfo {
                VStack(alignment: .leading, spacing: 10) {
                    InfoRow(label: "Name", value: ticketInfo.holderName)
                    InfoRow(label: "Email", value: ticketInfo.holderEmail)
                    InfoRow(label: "Type", value: ticketInfo.ticketType)
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 15)
                        .fill(Color.white.opacity(0.1))
                )
                .padding(.horizontal, 40)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.9))
        .onTapGesture {
            onDismiss()
        }
    }
}

struct InfoRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label + ":")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .font(.system(size: 14))
                .foregroundColor(.white)
        }
    }
}

struct ScannerView_Previews: PreviewProvider {
    static var previews: some View {
        ScannerView()
            .environmentObject(ScannerViewModel())
            .preferredColorScheme(.dark)
    }
}
