import SwiftUI

struct MyTicketsView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel = MyTicketsViewModel()
    @State private var selectedTicket: Ticket?
    
    var body: some View {
        NavigationView {
            Group {
                if !appState.isLoggedIn {
                    LoginPromptView()
                } else if viewModel.isLoading {
                    ProgressView()
                } else if viewModel.tickets.isEmpty {
                    EmptyTicketsView()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(viewModel.tickets) { ticket in
                                TicketCard(ticket: ticket)
                                    .onTapGesture {
                                        selectedTicket = ticket
                                    }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("My Tickets")
            .toolbar {
                if appState.isLoggedIn {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: { viewModel.loadTickets() }) {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                }
            }
            .sheet(item: $selectedTicket) { ticket in
                NavigationView {
                    TicketDetailView(ticketId: ticket.id)
                }
            }
        }
        .onChange(of: appState.isLoggedIn) { isLoggedIn in
            if isLoggedIn {
                viewModel.loadTickets()
            }
        }
        .onAppear {
            if appState.isLoggedIn {
                viewModel.loadTickets()
            }
        }
    }
}

struct TicketCard: View {
    let ticket: Ticket
    
    var body: some View {
        HStack {
            // Event image or icon
            if let imageUrl = ticket.event_image_url, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.gray
                }
                .frame(width: 80, height: 80)
                .cornerRadius(8)
            } else {
                Image(systemName: "ticket.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 60, height: 60)
                    .foregroundColor(Color("EventNexusPrimary"))
                    .frame(width: 80, height: 80)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(ticket.event_name ?? "Event")
                    .font(.headline)
                
                HStack {
                    Image(systemName: "calendar")
                        .font(.caption)
                    Text(ticket.event_date ?? "")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                HStack {
                    Image(systemName: "location")
                        .font(.caption)
                    Text(ticket.event_location ?? "")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
                
                TicketStatusBadge(status: ticket.status)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

struct TicketStatusBadge: View {
    let status: String
    
    var statusColor: Color {
        switch status.lowercased() {
        case "valid": return Color.green
        case "used": return Color.blue
        case "expired": return Color.red
        default: return Color.gray
        }
    }
    
    var body: some View {
        Text(status.capitalized)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(4)
    }
}

struct LoginPromptView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.fill")
                .font(.system(size: 64))
                .foregroundColor(Color("EventNexusPrimary"))
            
            Text("Please Login")
                .font(.title)
            
            Text("Login to view your tickets")
                .foregroundColor(.gray)
        }
    }
}

struct EmptyTicketsView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "ticket.fill")
                .font(.system(size: 64))
                .foregroundColor(Color("EventNexusPrimary"))
            
            Text("No Tickets Yet")
                .font(.title)
            
            Text("Purchase tickets to see them here")
                .foregroundColor(.gray)
        }
    }
}

@MainActor
class MyTicketsViewModel: ObservableObject {
    @Published var tickets: [Ticket] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let repository = TicketRepository.shared
    private let authRepository = AuthRepository.shared
    
    func loadTickets() {
        Task {
            isLoading = true
            error = nil
            
            do {
                if let user = try await authRepository.getCurrentUser() {
                    tickets = try await repository.getUserTickets(user.id)
                }
                isLoading = false
            } catch {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
}
