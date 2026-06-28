package com.agribridge.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val AgriGreenPrimary = Color(0xFF22C55E)
private val AgriGreenDark = Color(0xFF05120A)
private val AgriGreenSurface = Color(0xFFF0FDF4)

private val LightColorScheme = lightColorScheme(
    primary = AgriGreenPrimary,
    onPrimary = Color.White,
    secondary = Color(0xFF16A34A),
    background = Color.White,
    surface = AgriGreenSurface,
    onSurface = AgriGreenDark
)

@Composable
fun AgriBridgeTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography(),
        content = content
    )
}
