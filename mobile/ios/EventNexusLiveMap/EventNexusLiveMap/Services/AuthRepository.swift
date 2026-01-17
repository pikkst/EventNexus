import Foundation

class AuthRepository {
    static let shared = AuthRepository()
    private let client = SupabaseManager.shared.client
    private let userDefaults = UserDefaults.standard
    
    private let userIdKey = "user_id"
    private let accessTokenKey = "access_token"
    
    private init() {}
    
    func signIn(email: String, password: String) async throws -> User {
        let session = try await client.auth.signIn(email: email, password: password)
        
        // Save session
        userDefaults.set(session.user.id.uuidString, forKey: userIdKey)
        userDefaults.set(session.accessToken, forKey: accessTokenKey)
        
        // Get user profile
        let response = try await client.database
            .from("users")
            .select()
            .eq("id", value: session.user.id.uuidString)
            .single()
            .execute()
        
        return try JSONDecoder().decode(User.self, from: response.data)
    }
    
    func signUp(email: String, password: String, name: String?) async throws -> User {
        let session = try await client.auth.signUp(email: email, password: password)
        
        let userId = session.user.id.uuidString
        
        // Create user profile
        let userData: [String: Any] = [
            "id": userId,
            "email": email,
            "name": name ?? ""
        ]
        
        try await client.database
            .from("users")
            .insert(userData)
            .execute()
        
        // Save session
        userDefaults.set(userId, forKey: userIdKey)
        userDefaults.set(session.accessToken, forKey: accessTokenKey)
        
        return User(
            id: userId,
            email: email,
            name: name,
            phone: nil,
            avatar_url: nil,
            role: "user",
            created_at: nil
        )
    }
    
    func signOut() async throws {
        try await client.auth.signOut()
        
        userDefaults.removeObject(forKey: userIdKey)
        userDefaults.removeObject(forKey: accessTokenKey)
    }
    
    func getCurrentUser() async throws -> User? {
        guard let userId = userDefaults.string(forKey: userIdKey) else {
            return nil
        }
        
        let response = try await client.database
            .from("users")
            .select()
            .eq("id", value: userId)
            .single()
            .execute()
        
        return try JSONDecoder().decode(User.self, from: response.data)
    }
    
    func isLoggedIn() -> Bool {
        return userDefaults.string(forKey: userIdKey) != nil
    }
}
