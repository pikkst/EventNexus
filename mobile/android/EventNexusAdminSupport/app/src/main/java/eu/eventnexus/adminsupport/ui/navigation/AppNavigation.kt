package eu.eventnexus.adminsupport.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import eu.eventnexus.adminsupport.ui.screens.ChatListScreen
import eu.eventnexus.adminsupport.ui.screens.ChatScreen
import eu.eventnexus.adminsupport.ui.screens.LoginScreen

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    chatId: String? = null
) {
    NavHost(
        navController = navController,
        startDestination = if (chatId != null) "chat/$chatId" else "login"
    ) {
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("chat_list") {
                        popUpTo("login") { inclusive = true }
                    }
                }
            )
        }

        composable("chat_list") {
            ChatListScreen(
                onChatClick = { chatId ->
                    navController.navigate("chat/$chatId")
                },
                onLogout = {
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = "chat/{chatId}",
            arguments = listOf(navArgument("chatId") { type = NavType.StringType })
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: return@composable
            ChatScreen(
                chatId = chatId,
                onBackClick = { navController.popBackStack() }
            )
        }
    }
}
