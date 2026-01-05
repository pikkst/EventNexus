//
//  LoginView.swift
//  EventNexusScanner
//
//  Scanner code authentication view
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var viewModel: ScannerViewModel
    @Binding var showingCodeInput: Bool
    @State private var scannerCode: String = ""
    @State private var isAuthenticating = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            // Logo and title
            VStack(spacing: 15) {
                Image(systemName: "qrcode.viewfinder")
                    .font(.system(size: 80))
                    .foregroundColor(Color(hex: "6366f1"))
                
                Text("EventNexus")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
                
                Text("Ticket Scanner")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.gray)
            }
            
            Spacer()
            
            // Code input
            VStack(spacing: 20) {
                Text("Enter Scanner Code")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
                
                TextField("", text: $scannerCode)
                    .placeholder(when: scannerCode.isEmpty) {
                        Text("XXXXXXXX").foregroundColor(.gray)
                    }
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .textCase(.uppercase)
                    .autocapitalization(.allCharacters)
                    .disableAutocorrection(true)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 15)
                            .fill(Color.white.opacity(0.1))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 15)
                            .stroke(Color(hex: "6366f1"), lineWidth: 2)
                    )
                    .padding(.horizontal, 40)
                    .onChange(of: scannerCode) { newValue in
                        scannerCode = newValue.uppercased()
                    }
                
                if let error = errorMessage {
                    Text(error)
                        .font(.system(size: 14))
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                
                Button(action: authenticate) {
                    HStack(spacing: 10) {
                        if isAuthenticating {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        }
                        Text(isAuthenticating ? "Authenticating..." : "Connect to Event")
                            .font(.system(size: 18, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 15)
                            .fill(scannerCode.count == 8 ? Color(hex: "6366f1") : Color.gray)
                    )
                    .shadow(color: Color(hex: "6366f1").opacity(0.3), radius: 10, y: 5)
                }
                .disabled(scannerCode.count != 8 || isAuthenticating)
                .padding(.horizontal, 40)
            }
            
            Spacer()
            
            // Info text
            VStack(spacing: 10) {
                Text("Get your scanner code from the")
                    .font(.system(size: 14))
                    .foregroundColor(.gray)
                Text("EventNexus organizer dashboard")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(hex: "6366f1"))
            }
            .padding(.bottom, 30)
        }
        .padding()
    }
    
    private func authenticate() {
        guard !scannerCode.isEmpty else { return }
        
        isAuthenticating = true
        errorMessage = nil
        
        Task {
            do {
                try await viewModel.authenticateWithCode(scannerCode)
                isAuthenticating = false
            } catch {
                isAuthenticating = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content) -> some View {
        
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView(showingCodeInput: .constant(true))
            .environmentObject(ScannerViewModel())
            .preferredColorScheme(.dark)
    }
}
