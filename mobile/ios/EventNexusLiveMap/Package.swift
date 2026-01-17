// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "EventNexusLiveMap",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "EventNexusLiveMap",
            targets: ["EventNexusLiveMap"])
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "EventNexusLiveMap",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift")
            ]
        )
    ]
)
