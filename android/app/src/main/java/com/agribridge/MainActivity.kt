package com.agribridge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.*
import com.agribridge.ui.*
import com.agribridge.ui.farmer.FarmerDashboard
import com.agribridge.ui.consumer.MarketplaceScreen
import com.agribridge.ui.ai.AIHubScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AgriBridgeTheme {
                MainNavigation()
            }
        }
    }
}

@Composable
fun MainNavigation() {
    val navController = rememberNavController()
    var userRole by remember { mutableStateOf<String?>(null) }

    if (userRole == null) {
        LoginScreen { role, email ->
            userRole = role
        }
    } else {
        Scaffold(
            bottomBar = {
                NavigationBar {
                    val navBackStackEntry by navController.currentBackStackEntryAsState()
                    val currentDestination = navBackStackEntry?.destination

                    if (userRole == "farmer") {
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.Dashboard, contentDescription = null) },
                            label = { Text("Dashboard") },
                            selected = currentDestination?.route == "dashboard",
                            onClick = { navController.navigate("dashboard") }
                        )
                    } else {
                        NavigationBarItem(
                            icon = { Icon(Icons.Default.Storefront, contentDescription = null) },
                            label = { Text("Market") },
                            selected = currentDestination?.route == "market",
                            onClick = { navController.navigate("market") }
                        )
                    }
                    NavigationBarItem(
                        icon = { Icon(Icons.Default.AutoAwesome, contentDescription = null) },
                        label = { Text("AI Hub") },
                        selected = currentDestination?.route == "ai_hub",
                        onClick = { navController.navigate("ai_hub") }
                    )
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = if (userRole == "farmer") "dashboard" else "market",
                modifier = Modifier.padding(innerPadding)
            ) {
                composable("dashboard") { FarmerDashboard() }
                composable("market") { MarketplaceScreen() }
                composable("ai_hub") { AIHubScreen() }
            }
        }
    }
}
