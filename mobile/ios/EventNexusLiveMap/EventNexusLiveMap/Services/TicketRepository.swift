import Foundation

class TicketRepository {
    static let shared = TicketRepository()
    private let client = SupabaseManager.shared.client
    
    private init() {}
    
    func getUserTickets(_ userId: String) async throws -> [Ticket] {
        let response = try await client.database
            .from("tickets")
            .select()
            .eq("user_id", value: userId)
            .execute()
        
        return try JSONDecoder().decode([Ticket].self, from: response.data)
    }
    
    func getTicketById(_ id: String) async throws -> Ticket {
        let response = try await client.database
            .from("tickets")
            .select()
            .eq("id", value: id)
            .single()
            .execute()
        
        return try JSONDecoder().decode(Ticket.self, from: response.data)
    }
    
    func purchaseTicket(eventId: String, ticketTypeId: String, userId: String) async throws -> Ticket {
        let data: [String: Any] = [
            "event_id": eventId,
            "user_id": userId,
            "ticket_type_id": ticketTypeId,
            "status": "valid"
        ]
        
        let response = try await client.database
            .from("tickets")
            .insert(data)
            .single()
            .execute()
        
        return try JSONDecoder().decode(Ticket.self, from: response.data)
    }
}
