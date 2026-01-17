import SwiftUI

struct EventDetailView: View {
    let eventId: String
    @StateObject private var viewModel: EventDetailViewModel
    @EnvironmentObject var appState: AppState
    @Environment(\.openURL) var openURL
    @Environment(\.dismiss) var dismiss
    @State private var showLoginAlert = false
    
    init(eventId: String) {
        self.eventId = eventId
        _viewModel = StateObject(wrappedValue: EventDetailViewModel(eventId: eventId))
    }
    
    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView()
                    .padding()
            } else if let event = viewModel.event {
                VStack(alignment: .leading, spacing: 16) {
                    // Event image
                    if let imageUrl = event.image_url, let url = URL(string: imageUrl) {
                        AsyncImage(url: url) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Color.gray
                        }
                        .frame(height: 250)
                        .clipped()
                    }
                    
                    VStack(alignment: .leading, spacing: 12) {
                        // Event name
                        Text(event.name)
                            .font(.title)
                            .bold()
                        
                        // Category
                        Text(event.category)
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color("EventNexusPrimary").opacity(0.2))
                            .cornerRadius(8)
                        
                        Divider()
                        
                        // Event details
                        DetailRow(icon: "calendar", label: "Date", value: event.date)
                        if let time = event.time {
                            DetailRow(icon: "clock", label: "Time", value: time)
                        }
                        DetailRow(icon: "location", label: "Location", value: event.location)
                        if let organizer = event.organizer_name {
                            DetailRow(icon: "person", label: "Organizer", value: organizer)
                        }
                        if let tickets = event.tickets_available {
                            DetailRow(icon: "ticket", label: "Tickets", value: "\(tickets)")
                        }
                        if let price = event.ticket_price {
                            DetailRow(icon: "eurosign.circle", label: "Price", 
                                    value: String(format: "€%.2f", price))
                        }
                        
                        Divider()
                        
                        // Description
                        if let description = event.description {
                            Text("Description")
                                .font(.headline)
                            Text(description)
                                .font(.body)
                        }
                        
                        Divider()
                        
                        // Action buttons
                        VStack(spacing: 12) {
                            Button(action: {
                                if let url = URL(string: "https://www.eventnexus.eu/events/\(event.id)") {
                                    openURL(url)
                                }
                            }) {
                                HStack {
                                    Image(systemName: "globe")
                                    Text("Buy on Website")
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color("EventNexusPrimary"))
                                .foregroundColor(.white)
                                .cornerRadius(10)
                            }
                            
                            if appState.isLoggedIn {
                                Button(action: {
                                    // TODO: Implement in-app purchase
                                }) {
                                    HStack {
                                        Image(systemName: "cart")
                                        Text("Buy in App")
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color("EventNexusPrimary"))
                                    .foregroundColor(.white)
                                    .cornerRadius(10)
                                }
                            } else {
                                Button(action: {
                                    showLoginAlert = true
                                }) {
                                    HStack {
                                        Image(systemName: "person.fill")
                                        Text("Login to Buy in App")
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.gray)
                                    .foregroundColor(.white)
                                    .cornerRadius(10)
                                }
                            }
                            
                            Button(action: {
                                let coords = "\(event.latitude),\(event.longitude)"
                                if let url = URL(string: "maps://?q=\(coords)") {
                                    openURL(url)
                                }
                            }) {
                                HStack {
                                    Image(systemName: "map")
                                    Text("View on Map")
                                }
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
                    }
                    .padding()
                }
            } else if let error = viewModel.error {
                VStack {
                    Text("Error")
                        .font(.title)
                    Text(error)
                        .foregroundColor(.red)
                    Button("Go Back") {
                        dismiss()
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Event Details")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Login Required", isPresented: $showLoginAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Please login to purchase tickets in the app")
        }
    }
}

struct DetailRow: View {
    let icon: String
    let label: String
    let value: String
    
    var body: some View {
        HStack(alignment: .top) {
            Image(systemName: icon)
                .foregroundColor(Color("EventNexusPrimary"))
                .frame(width: 24)
            VStack(alignment: .leading) {
                Text(label)
                    .font(.caption)
                    .foregroundColor(.gray)
                Text(value)
                    .font(.body)
            }
        }
    }
}

@MainActor
class EventDetailViewModel: ObservableObject {
    @Published var event: EventDetail?
    @Published var isLoading = true
    @Published var error: String?
    
    private let eventId: String
    private let repository = EventRepository.shared
    
    init(eventId: String) {
        self.eventId = eventId
        loadEvent()
    }
    
    func loadEvent() {
        Task {
            isLoading = true
            error = nil
            
            do {
                event = try await repository.getEventById(eventId)
                isLoading = false
            } catch {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
}
