import Foundation

struct Ticket: Codable, Identifiable {
    let id: String
    let event_id: String
    let user_id: String
    let ticket_type: String
    let price: Double
    let qr_code: String
    let status: String // "valid", "used", "expired"
    let purchased_at: String
    let used_at: String?
    
    // Event details (joined)
    let event_name: String?
    let event_date: String?
    let event_time: String?
    let event_location: String?
    let event_image_url: String?
}

enum TicketStatus: String {
    case valid = "valid"
    case used = "used"
    case expired = "expired"
}
