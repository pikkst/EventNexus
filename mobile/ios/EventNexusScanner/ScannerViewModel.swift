//
//  ScannerViewModel.swift
//  EventNexusScanner
//
//  Main view model handling scanner state and API communication
//

import SwiftUI
import Combine

struct ScanResult {
    let success: Bool
    let message: String
    let ticketInfo: TicketInfo?
}

struct TicketInfo {
    let holderName: String
    let holderEmail: String
    let ticketType: String
}

struct EventInfo: Codable {
    let id: String
    let name: String
    let date: String
    let location: String?
}

class ScannerViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentEvent: EventInfo?
    @Published var scannerCodeId: String?
    @Published var scannedCount = 0
    @Published var isConnected = true
    @Published var sessionStartTime: Date?
    
    private var scannerCode: String?
    private var supabaseUrl = "https://anlivujgkjmajkcgbaxw.supabase.co"
    private var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubGl2dWpna2ptYWprY2diYXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTY0OTQsImV4cCI6MjA4MTU3MjQ5NH0.5SzkZg_PMqgdMClS1ftg4ZT_Ddyq1zOi-ZOLe1yuRgY"
    
    var sessionDuration: String {
        guard let startTime = sessionStartTime else { return "00:00" }
        let duration = Int(Date().timeIntervalSince(startTime))
        let hours = duration / 3600
        let minutes = (duration % 3600) / 60
        return hours > 0 ? String(format: "%d:%02d", hours, minutes) : String(format: "%02d:%02d", minutes, duration % 60)
    }
    
    // Authenticate with scanner code
    func authenticateWithCode(_ code: String) async throws {
        guard !code.isEmpty else {
            throw ScannerError.invalidCode
        }
        
        // Call verify_scanner_code RPC
        let url = URL(string: "\(supabaseUrl)/rest/v1/rpc/verify_scanner_code")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        
        let body = ["p_code": code]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ScannerError.networkError
        }
        
        guard httpResponse.statusCode == 200 else {
            throw ScannerError.authenticationFailed
        }
        
        // Parse response
        let results = try JSONDecoder().decode([VerifyCodeResponse].self, from: data)
        
        guard let result = results.first, result.valid else {
            throw ScannerError.invalidCode
        }
        
        // Store authentication details
        self.scannerCode = code
        self.scannerCodeId = result.scanner_code_id
        
        // Fetch event details
        if let eventId = result.event_id {
            try await fetchEventDetails(eventId: eventId)
        }
        
        await MainActor.run {
            self.isAuthenticated = true
            self.sessionStartTime = Date()
        }
        
        // Record scanner usage
        if let scannerCodeId = self.scannerCodeId {
            await recordUsage(scannerCodeId: scannerCodeId)
        }
    }
    
    // Fetch event details
    private func fetchEventDetails(eventId: String) async throws {
        let url = URL(string: "\(supabaseUrl)/rest/v1/events?id=eq.\(eventId)&select=*")!
        var request = URLRequest(url: url)
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw ScannerError.networkError
        }
        
        let events = try JSONDecoder().decode([EventResponse].self, from: data)
        
        if let event = events.first {
            await MainActor.run {
                self.currentEvent = EventInfo(
                    id: event.id,
                    name: event.name,
                    date: event.date,
                    location: event.location?["address"] as? String
                )
            }
        }
    }
    
    // Validate ticket
    func validateTicket(qrCode: String) async throws -> ScanResult {
        guard let eventId = currentEvent?.id else {
            throw ScannerError.notAuthenticated
        }
        
        // Call validate-ticket Edge Function
        let url = URL(string: "\(supabaseUrl)/functions/v1/validate-ticket")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        
        let body = ["qrCode": qrCode]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ScannerError.networkError
        }
        
        guard httpResponse.statusCode == 200 else {
            throw ScannerError.validationFailed
        }
        
        let result = try JSONDecoder().decode(ValidationResponse.self, from: data)
        
        if result.valid {
            await MainActor.run {
                self.scannedCount += 1
            }
            
            // Record usage
            if let scannerCodeId = self.scannerCodeId {
                await recordUsage(scannerCodeId: scannerCodeId)
            }
        }
        
        return ScanResult(
            success: result.valid,
            message: result.message ?? (result.valid ? "Ticket validated successfully" : "Invalid ticket"),
            ticketInfo: result.ticket != nil ? TicketInfo(
                holderName: result.ticket?.holder_name ?? "Unknown",
                holderEmail: result.ticket?.holder_email ?? "",
                ticketType: result.ticket?.ticket_type ?? "General"
            ) : nil
        )
    }
    
    // Record scanner usage
    private func recordUsage(scannerCodeId: String) async {
        let url = URL(string: "\(supabaseUrl)/rest/v1/rpc/record_scanner_usage")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(supabaseAnonKey)", forHTTPHeaderField: "Authorization")
        
        let body = ["p_scanner_code_id": scannerCodeId, "p_location": nil] as [String : Any?]
        if let jsonData = try? JSONSerialization.data(withJSONObject: body) {
            request.httpBody = jsonData
            
            do {
                _ = try await URLSession.shared.data(for: request)
            } catch {
                print("Failed to record usage: \(error)")
            }
        }
    }
    
    // Logout
    func logout() {
        isAuthenticated = false
        currentEvent = nil
        scannerCode = nil
        scannerCodeId = nil
        scannedCount = 0
        sessionStartTime = nil
    }
}

// MARK: - Response Models

struct VerifyCodeResponse: Codable {
    let valid: Bool
    let event_id: String?
    let event_name: String?
    let scanner_code_id: String?
    let organizer_id: String?
    let expires_at: String?
}

struct EventResponse: Codable {
    let id: String
    let name: String
    let date: String
    let location: [String: Any]?
    
    enum CodingKeys: String, CodingKey {
        case id, name, date, location
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        date = try container.decode(String.self, forKey: .date)
        
        if let locationData = try? container.decode([String: AnyCodable].self, forKey: .location) {
            location = locationData.mapValues { $0.value }
        } else {
            location = nil
        }
    }
}

struct ValidationResponse: Codable {
    let valid: Bool
    let message: String?
    let ticket: TicketResponse?
}

struct TicketResponse: Codable {
    let holder_name: String
    let holder_email: String
    let ticket_type: String
}

// Helper for any JSON value
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let string = try? container.decode(String.self) {
            value = string
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else {
            value = ""
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        if let string = value as? String {
            try container.encode(string)
        } else if let int = value as? Int {
            try container.encode(int)
        } else if let double = value as? Double {
            try container.encode(double)
        } else if let bool = value as? Bool {
            try container.encode(bool)
        }
    }
}

// MARK: - Errors

enum ScannerError: LocalizedError {
    case invalidCode
    case authenticationFailed
    case notAuthenticated
    case networkError
    case validationFailed
    
    var errorDescription: String? {
        switch self {
        case .invalidCode:
            return "Invalid scanner code. Please check and try again."
        case .authenticationFailed:
            return "Authentication failed. The scanner code may be expired or inactive."
        case .notAuthenticated:
            return "Please authenticate first."
        case .networkError:
            return "Network error. Please check your connection."
        case .validationFailed:
            return "Failed to validate ticket."
        }
    }
}
