import SwiftUI

@main
struct EventNexusLiveMapApp: App {
    @StateObject private var appState = AppState()
    
    init() {
        SupabaseManager.shared.initialize()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
    }
}

class AppState: ObservableObject {
    @Published var user: User?
    @Published var isLoggedIn: Bool = false
    
    init() {
        checkLoginStatus()
    }
    
    func checkLoginStatus() {
        Task {
            if let currentUser = try? await AuthRepository.shared.getCurrentUser() {
                await MainActor.run {
                    self.user = currentUser
                    self.isLoggedIn = true
                }
            }
        }
    }
    
    func logout() {
        Task {
            try? await AuthRepository.shared.signOut()
            await MainActor.run {
                self.user = nil
                self.isLoggedIn = false
            }
        }
    }
}
