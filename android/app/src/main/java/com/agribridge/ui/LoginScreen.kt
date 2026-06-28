package com.agribridge.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onLoginSuccess: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var selectedRole by remember { mutableStateOf("consumer") }
    var isOtpSent by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "AGRIBRIDGE",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Secure Commerce · AI Farm Management",
            fontSize = 14.sp,
            color = Color.Gray,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        if (!isOtpSent) {
            // Role Selection
            Row(modifier = Modifier.padding(bottom = 16.dp)) {
                Button(
                    onClick = { selectedRole = "farmer" },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (selectedRole == "farmer") MaterialTheme.colorScheme.primary else Color.LightGray
                    ),
                    modifier = Modifier.weight(1f).padding(end = 4.dp)
                ) {
                    Text("Farmer")
                }
                Button(
                    onClick = { selectedRole = "consumer" },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (selectedRole == "consumer") MaterialTheme.colorScheme.primary else Color.LightGray
                    ),
                    modifier = Modifier.weight(1f).padding(start = 4.dp)
                ) {
                    Text("Consumer")
                }
            }

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email Address") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
            )

            Button(
                onClick = { isOtpSent = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                enabled = email.isNotEmpty()
            ) {
                Text("Send OTP")
            }
        } else {
            Text(
                text = "Enter 6-digit OTP sent to $email",
                fontSize = 14.sp,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            OutlinedTextField(
                value = otp,
                onValueChange = { otp = it },
                label = { Text("OTP") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )

            Button(
                onClick = { onLoginSuccess(selectedRole, email) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                enabled = otp.length == 6
            ) {
                Text("Verify & Login")
            }

            TextButton(onClick = { isOtpSent = false }) {
                Text("Change Email")
            }
        }
    }
}
