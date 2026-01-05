import Foundation

struct Event: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let category: String
    let date: String
    let time: String?
    let location: String
    let latitude: Double
    let longitude: Double
    let organizer_id: String
    let organizer_name: String?
    let image_url: String?
    let tickets_available: Int?
    let ticket_price: Double?
    let created_at: String?
}

struct EventDetail: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let category: String
    let date: String
    let time: String?
    let location: String
    let latitude: Double
    let longitude: Double
    let organizer_id: String
    let organizer_name: String?
    let image_url: String?
    let tickets_available: Int?
    let ticket_price: Double?
    let ticket_types: [TicketType]?
    let created_at: String?
    let updated_at: String?
}

struct TicketType: Codable, Identifiable {
    let id: String
    let name: String
    let price: Double
    let available: Int
}
