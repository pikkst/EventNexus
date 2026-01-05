package eu.eventnexus.livemap.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Radar
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import eu.eventnexus.livemap.ui.screens.MapScreen
import eu.eventnexus.livemap.ui.screens.MyTicketsScreen
import eu.eventnexus.livemap.ui.screens.ProfileScreen
import eu.eventnexus.livemap.ui.screens.EventDetailScreen
import eu.eventnexus.livemap.ui.screens.TicketDetailScreen
import eu.eventnexus.livemap.ui.screens.RadarScreen

sealed class Screen(val route: String, val title: String) {
    object Map : Screen("map", "Map")
    object Radar : Screen("radar", "Radar")
    object MyTickets : Screen("my_tickets", "Tickets")
    object Profile : Screen("profile", "Profile")
    object EventDetail : Screen("event/{eventId}", "Event Details")
    object TicketDetail : Screen("ticket/{ticketId}", "Ticket")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    
    val bottomNavItems = listOf(
        BottomNavItem(Screen.Map.route, "Map", Icons.Filled.Map),
        BottomNavItem(Screen.Radar.route, "Radar", Icons.Filled.Radar),
        BottomNavItem(Screen.MyTickets.route, "Tickets", Icons.Filled.ConfirmationNumber),
        BottomNavItem(Screen.Profile.route, "Profile", Icons.Filled.AccountCircle)
    )
    
    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface
            ) {
                bottomNavItems.forEach { item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Map.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.Map.route) {
                MapScreen(
                    onEventClick = { eventId ->
                        navController.navigate("event/$eventId")
                    }
                )
            }
            
            composable(Screen.Radar.route) {
                RadarScreen()
            }
            
            composable(Screen.MyTickets.route) {
                MyTicketsScreen(
                    onTicketClick = { ticketId ->
                        navController.navigate("ticket/$ticketId")
                    }
                )
            }
            
            composable(Screen.Profile.route) {
                ProfileScreen()
            }
            
            composable("event/{eventId}") { backStackEntry ->
                val eventId = backStackEntry.arguments?.getString("eventId") ?: return@composable
                EventDetailScreen(
                    eventId = eventId,
                    onBack = { navController.popBackStack() }
                )
            }
            
            composable("ticket/{ticketId}") { backStackEntry ->
                val ticketId = backStackEntry.arguments?.getString("ticketId") ?: return@composable
                TicketDetailScreen(
                    ticketId = ticketId,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector
)
