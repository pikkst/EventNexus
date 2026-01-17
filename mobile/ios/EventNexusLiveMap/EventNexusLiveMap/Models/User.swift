import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let phone: String?
    let avatar_url: String?
    let role: String?
    let created_at: String?
}

struct AuthResponse: Codable {
    let user: User?
    let error: String?
}
