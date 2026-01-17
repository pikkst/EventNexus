import SwiftUI
import MapKit

struct MapView: View {
    @StateObject private var viewModel = MapViewModel()
    @State private var showFilters = false
    @State private var selectedEvent: Event?
    
    var body: some View {
        NavigationView {
            ZStack {
                // Map
                Map(coordinateRegion: $viewModel.region,
                    showsUserLocation: true,
                    annotationItems: viewModel.events) { event in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(
                        latitude: event.latitude,
                        longitude: event.longitude
                    )) {
                        EventMarker(event: event)
                            .onTapGesture {
                                selectedEvent = event
                            }
                    }
                }
                .ignoresSafeArea(edges: .top)
                
                VStack {
                    // Search bar
                    HStack {
                        TextField("Search events...", text: $viewModel.searchQuery)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .background(Color.white)
                        
                        Button(action: { showFilters.toggle() }) {
                            Image(systemName: "line.3.horizontal.decrease.circle")
                                .font(.title2)
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Color("EventNexusPrimary"))
                                .clipShape(Circle())
                        }
                        
                        Button(action: { viewModel.loadEvents() }) {
                            Image(systemName: "arrow.clockwise")
                                .font(.title2)
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Color("EventNexusPrimary"))
                                .clipShape(Circle())
                        }
                    }
                    .padding()
                    
                    Spacer()
                    
                    // Loading indicator
                    if viewModel.isLoading {
                        ProgressView()
                            .padding()
                            .background(Color.white)
                            .cornerRadius(10)
                    }
                }
                
                // Error message
                if let error = viewModel.error {
                    VStack {
                        Spacer()
                        HStack {
                            Text(error)
                                .foregroundColor(.white)
                            Button("Retry") {
                                viewModel.loadEvents()
                            }
                            .foregroundColor(.white)
                        }
                        .padding()
                        .background(Color.red)
                        .cornerRadius(10)
                        .padding()
                    }
                }
            }
            .navigationTitle("EventNexus Live Map")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showFilters) {
                FilterView(
                    selectedCategory: $viewModel.selectedCategory,
                    radiusKm: $viewModel.radiusKm,
                    onApply: {
                        showFilters = false
                        viewModel.loadEvents()
                    }
                )
            }
            .sheet(item: $selectedEvent) { event in
                NavigationView {
                    EventDetailView(eventId: event.id)
                }
            }
        }
        .onAppear {
            viewModel.requestLocationPermission()
        }
    }
}

struct EventMarker: View {
    let event: Event
    
    var body: some View {
        VStack {
            Image(systemName: "mappin.circle.fill")
                .font(.title)
                .foregroundColor(Color("EventNexusPrimary"))
            Text(event.name)
                .font(.caption)
                .foregroundColor(.black)
                .padding(4)
                .background(Color.white)
                .cornerRadius(4)
        }
    }
}

@MainActor
class MapViewModel: ObservableObject {
    @Published var events: [Event] = []
    @Published var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 59.437, longitude: 24.7536),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
    @Published var isLoading = false
    @Published var error: String?
    @Published var searchQuery = "" {
        didSet {
            if searchQuery.isEmpty {
                loadEvents()
            }
        }
    }
    @Published var selectedCategory: String?
    @Published var radiusKm: Double = 50.0
    
    private let locationManager = CLLocationManager()
    private let eventRepository = EventRepository.shared
    
    init() {
        loadEvents()
    }
    
    func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
        
        if let location = locationManager.location {
            region.center = location.coordinate
        }
    }
    
    func loadEvents() {
        Task {
            isLoading = true
            error = nil
            
            do {
                let location = locationManager.location?.coordinate
                
                if !searchQuery.isEmpty {
                    events = try await eventRepository.searchEvents(searchQuery)
                } else {
                    events = try await eventRepository.getEvents(
                        latitude: location?.latitude,
                        longitude: location?.longitude,
                        radiusKm: radiusKm,
                        category: selectedCategory
                    )
                }
                
                isLoading = false
            } catch {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }
}

struct FilterView: View {
    @Binding var selectedCategory: String?
    @Binding var radiusKm: Double
    let onApply: () -> Void
    
    @Environment(\.dismiss) var dismiss
    
    let categories = ["All", "Music", "Sports", "Arts", "Food", "Technology", 
                     "Business", "Education", "Health", "Other"]
    
    var body: some View {
        NavigationView {
            Form {
                Section("Category") {
                    ForEach(categories, id: \.self) { category in
                        Button(action: {
                            selectedCategory = category == "All" ? nil : category
                        }) {
                            HStack {
                                Text(category)
                                Spacer()
                                if (category == "All" && selectedCategory == nil) ||
                                   (category == selectedCategory) {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(Color("EventNexusPrimary"))
                                }
                            }
                        }
                        .foregroundColor(.primary)
                    }
                }
                
                Section("Radius: \(Int(radiusKm)) km") {
                    Slider(value: $radiusKm, in: 1...200, step: 1)
                }
                
                Section {
                    Button("Clear Filters") {
                        selectedCategory = nil
                        radiusKm = 50.0
                    }
                    
                    Button("Apply") {
                        onApply()
                    }
                    .foregroundColor(Color("EventNexusPrimary"))
                }
            }
            .navigationTitle("Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}
