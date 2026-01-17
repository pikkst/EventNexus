import SwiftUI
import CoreImage.CIFilterBuiltins

struct TicketDetailView: View {
    let ticketId: String
    @StateObject private var viewModel: TicketDetailViewModel
    @Environment(\.dismiss) var dismiss
    @State private var showQRCode = false
    
    init(ticketId: String) {
        self.ticketId = ticketId
        _viewModel = StateObject(wrappedValue: TicketDetailViewModel(ticketId: ticketId))
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else if let ticket = viewModel.ticket {
                if showQRCode {
                    QRCodeView(ticket: ticket, onClose: { showQRCode = false })
                } else {
                    TicketDetailContent(
                        ticket: ticket,
                        onShowQR: { showQRCode = true }
                    )
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
        .navigationTitle("Ticket")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct TicketDetailContent: View {
    let ticket: Ticket
    let onShowQR: () -> Void
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Event image
                if let imageUrl = ticket.event_image_url, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.gray
                    }
                    .frame(height: 200)
                    .clipped()
                }
                
                VStack(alignment: .leading, spacing: 12) {
                    Text(ticket.event_name ?? "Event")
                        .font(.title)
                        .bold()
                    
                    TicketStatusBadge(status: ticket.status)
                    
                    Divider()
                    
                    // Ticket details
                    Text("Ticket Details")
                        .font(.headline)
                    
                    DetailRow(label: "Ticket ID", value: String(ticket.id.prefix(8)))
                    DetailRow(label: "Type", value: ticket.ticket_type)
                    DetailRow(label: "Price", value: String(format: "€%.2f", ticket.price))
                    DetailRow(label: "Purchased", value: ticket.purchased_at)
                    if let usedAt = ticket.used_at {
                        DetailRow(label: "Used", value: usedAt)
                    }
                    
                    Divider()
                    
                    // Event details
                    Text("Event Details")
                        .font(.headline)
                    
                    if let date = ticket.event_date {
                        DetailRow(label: "Date", value: date)
                    }
                    if let time = ticket.event_time {
                        DetailRow(label: "Time", value: time)
                    }
                    if let location = ticket.event_location {
                        DetailRow(label: "Location", value: location)
                    }
                    
                    // Show QR button
                    if ticket.status == "valid" {
                        Button(action: onShowQR) {
                            HStack {
                                Image(systemName: "qrcode")
                                Text("Show QR Code")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color("EventNexusPrimary"))
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                        .padding(.top)
                        
                        Text("Show this QR code at the event entrance")
                            .font(.caption)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                    } else {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text(ticket.status == "used" ?
                                "This ticket has already been used" :
                                "This ticket has expired")
                                .foregroundColor(.red)
                        }
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(10)
                    }
                }
                .padding()
            }
        }
    }
}

struct QRCodeView: View {
    let ticket: Ticket
    let onClose: () -> Void
    @State private var brightness: CGFloat = 1.0
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 16) {
                Text(ticket.event_name ?? "Event Ticket")
                    .font(.title2)
                    .bold()
                
                Text("Ticket #\(String(ticket.id.prefix(8)))")
                    .foregroundColor(.gray)
                
                if let qrImage = generateQRCode(from: ticket.qr_code) {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: 300, maxHeight: 300)
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(radius: 8)
                }
                
                Text("Please increase screen brightness for better scanning")
                    .font(.caption)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
            }
            .padding()
            .background(Color.white)
            .cornerRadius(16)
            .shadow(radius: 10)
            .padding()
            
            Button(action: onClose) {
                Text("Close")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .foregroundColor(.primary)
                    .cornerRadius(10)
            }
            .padding(.horizontal)
            
            Spacer()
        }
        .background(Color.black.opacity(0.5))
        .onAppear {
            UIScreen.main.brightness = 1.0
        }
        .onDisappear {
            UIScreen.main.brightness = brightness
        }
    }
}

struct DetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.gray)
            Spacer()
            Text(value)
        }
        .padding(.vertical, 4)
    }
}

@MainActor
class TicketDetailViewModel: ObservableObject {
    @Published var ticket: Ticket?
    @Published var isLoading = true
    @Published var error: String?
    
    private let ticketId: String
    private let repository = TicketRepository.shared
    
    init(ticketId: String) {
        self.ticketId = ticketId
        loadTicket()
    }
    
    func loadTicket() {
        Task {
            isLoading = true
            error = nil
            
            do {
                ticket = try await repository.getTicketById(ticketId)
                isLoading = false
            } catch {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
}

func generateQRCode(from string: String) -> UIImage? {
    let context = CIContext()
    let filter = CIFilter.qrCodeGenerator()
    
    filter.message = Data(string.utf8)
    filter.correctionLevel = "M"
    
    guard let outputImage = filter.outputImage else { return nil }
    
    let transform = CGAffineTransform(scaleX: 10, y: 10)
    let scaledImage = outputImage.transformed(by: transform)
    
    guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else {
        return nil
    }
    
    return UIImage(cgImage: cgImage)
}
