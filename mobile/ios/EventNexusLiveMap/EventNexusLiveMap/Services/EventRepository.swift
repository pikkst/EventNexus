import Foundation

class EventRepository {
    static let shared = EventRepository()
    private let client = SupabaseManager.shared.client
    
    private init() {}
    
    func getEvents(
        latitude: Double? = nil,
        longitude: Double? = nil,
        radiusKm: Double = 50.0,
        category: String? = nil
    ) async throws -> [Event] {
        var query = client.database
            .from("events")
            .select()
        
        // Apply category filter
        if let category = category, category != "All" {
            query = query.eq("category", value: category)
        }
        
        let response = try await query.execute()
        let events = try JSONDecoder().decode([Event].self, from: response.data)
        
        // Filter by radius if location provided
        if let lat = latitude, let lon = longitude {
            return events.filter { event in
                calculateDistance(
                    lat1: lat, lon1: lon,
                    lat2: event.latitude, lon2: event.longitude
                ) <= radiusKm
            }
        }
        
        return events
    }
    
    func getEventById(_ id: String) async throws -> EventDetail {
        let response = try await client.database
            .from("events")
            .select()
            .eq("id", value: id)
            .single()
            .execute()
        
        return try JSONDecoder().decode(EventDetail.self, from: response.data)
    }
    
    func searchEvents(_ query: String) async throws -> [Event] {
        let response = try await client.database
            .from("events")
            .select()
            .ilike("name", pattern: "%\(query)%")
            .execute()
        
        return try JSONDecoder().decode([Event].self, from: response.data)
    }
    
    private func calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
        let earthRadius = 6371.0 // km
        
        let dLat = (lat2 - lat1).degreesToRadians
        let dLon = (lon2 - lon1).degreesToRadians
        
        let a = sin(dLat / 2) * sin(dLat / 2) +
            cos(lat1.degreesToRadians) * cos(lat2.degreesToRadians) *
            sin(dLon / 2) * sin(dLon / 2)
        
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return earthRadius * c
    }
}

extension Double {
    var degreesToRadians: Double { self * .pi / 180 }
}
