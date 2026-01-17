import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var appState: AppState
    @State private var showLoginSheet = false
    @State private var showRegisterSheet = false
    
    var body: some View {
        NavigationView {
            Group {
                if appState.isLoggedIn, let user = appState.user {
                    ProfileContent(user: user)
                } else {
                    LoginPromptContent(
                        onLogin: { showLoginSheet = true },
                        onRegister: { showRegisterSheet = true }
                    )
                }
            }
            .navigationTitle("Profile")
            .sheet(isPresented: $showLoginSheet) {
                LoginView()
            }
            .sheet(isPresented: $showRegisterSheet) {
                RegisterView()
            }
        }
    }
}

struct ProfileContent: View {
    let user: User
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // User info card
                VStack(spacing: 16) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 80))
                        .foregroundColor(Color("EventNexusPrimary"))
                    
                    Text(user.name ?? "User")
                        .font(.title)
                    
                    Text(user.email)
                        .foregroundColor(.gray)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.white)
                .cornerRadius(12)
                .shadow(radius: 2)
                
                // Account info
                VStack(alignment: .leading, spacing: 12) {
                    Text("Account")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    if let phone = user.phone {
                        InfoRow(icon: "phone.fill", title: "Phone", value: phone)
                    }
                    
                    if let role = user.role {
                        InfoRow(icon: "shield.fill", title: "Role", value: role)
                    }
                    
                    if let createdAt = user.created_at {
                        let date = String(createdAt.prefix(10))
                        InfoRow(icon: "calendar", title: "Member Since", value: date)
                    }
                }
                
                Divider()
                    .padding()
                
                // Logout button
                Button(action: {
                    appState.logout()
                }) {
                    HStack {
                        Image(systemName: "arrow.right.square")
                        Text("Logout")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                .padding(.horizontal)
            }
            .padding()
        }
    }
}

struct LoginPromptContent: View {
    let onLogin: () -> Void
    let onRegister: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 120))
                .foregroundColor(Color("EventNexusPrimary"))
            
            Text("Welcome to EventNexus")
                .font(.title)
            
            Text("Login or create an account to purchase tickets and manage your events")
                .multilineTextAlignment(.center)
                .foregroundColor(.gray)
                .padding(.horizontal)
            
            VStack(spacing: 12) {
                Button(action: onLogin) {
                    Text("Login")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color("EventNexusPrimary"))
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                
                Button(action: onRegister) {
                    Text("Create Account")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white)
                        .foregroundColor(Color("EventNexusPrimary"))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color("EventNexusPrimary"), lineWidth: 2)
                        )
                }
            }
            .padding(.horizontal)
        }
        .padding()
    }
}

struct InfoRow: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(Color("EventNexusPrimary"))
                .frame(width: 24)
            
            VStack(alignment: .leading) {
                Text(title)
                    .font(.caption)
                    .foregroundColor(.gray)
                Text(value)
                    .font(.body)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(8)
        .shadow(radius: 1)
        .padding(.horizontal)
    }
}

struct LoginView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = LoginViewModel()
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Email", text: $viewModel.email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    
                    SecureField("Password", text: $viewModel.password)
                }
                
                if let error = viewModel.error {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }
                
                Section {
                    Button(action: {
                        viewModel.login { user in
                            appState.user = user
                            appState.isLoggedIn = true
                            dismiss()
                        }
                    }) {
                        if viewModel.isLoading {
                            ProgressView()
                        } else {
                            Text("Login")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(viewModel.isLoading || !viewModel.isValid)
                }
            }
            .navigationTitle("Login")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct RegisterView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = RegisterViewModel()
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Name", text: $viewModel.name)
                    TextField("Email", text: $viewModel.email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                    SecureField("Password", text: $viewModel.password)
                    SecureField("Confirm Password", text: $viewModel.confirmPassword)
                }
                
                if let error = viewModel.error {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }
                
                Section {
                    Button(action: {
                        viewModel.register { user in
                            appState.user = user
                            appState.isLoggedIn = true
                            dismiss()
                        }
                    }) {
                        if viewModel.isLoading {
                            ProgressView()
                        } else {
                            Text("Create Account")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(viewModel.isLoading || !viewModel.isValid)
                }
            }
            .navigationTitle("Create Account")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

@MainActor
class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var error: String?
    
    var isValid: Bool {
        !email.isEmpty && !password.isEmpty
    }
    
    func login(completion: @escaping (User) -> Void) {
        Task {
            isLoading = true
            error = nil
            
            do {
                let user = try await AuthRepository.shared.signIn(email: email, password: password)
                completion(user)
            } catch {
                self.error = error.localizedDescription
            }
            
            isLoading = false
        }
    }
}

@MainActor
class RegisterViewModel: ObservableObject {
    @Published var name = ""
    @Published var email = ""
    @Published var password = ""
    @Published var confirmPassword = ""
    @Published var isLoading = false
    @Published var error: String?
    
    var isValid: Bool {
        !name.isEmpty && !email.isEmpty && !password.isEmpty && 
        password == confirmPassword
    }
    
    func register(completion: @escaping (User) -> Void) {
        guard password == confirmPassword else {
            error = "Passwords do not match"
            return
        }
        
        Task {
            isLoading = true
            error = nil
            
            do {
                let user = try await AuthRepository.shared.signUp(
                    email: email,
                    password: password,
                    name: name
                )
                completion(user)
            } catch {
                self.error = error.localizedDescription
            }
            
            isLoading = false
        }
    }
}
