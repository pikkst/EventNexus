//
//  EventNexusScannerApp.swift
//  EventNexusScanner
//
//  Created for EventNexus
//  Copyright © 2026 EventNexus. All rights reserved.
//

import SwiftUI

@main
struct EventNexusScannerApp: App {
    @StateObject private var scannerViewModel = ScannerViewModel()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(scannerViewModel)
        }
    }
}
