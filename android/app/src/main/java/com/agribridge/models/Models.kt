package com.agribridge.models

import com.google.gson.annotations.SerializedName

data class User(
    val id: Int,
    val phone: String,
    val name: String,
    val role: String,
    val location: String?
)

data class Product(
    val id: Int,
    val name: String,
    val category: String,
    val description: String?,
    @SerializedName("retail_price") val retailPrice: Float,
    @SerializedName("bulk_price") val bulkPrice: Float,
    val unit: String,
    @SerializedName("stock_qty") val stockQty: Float,
    @SerializedName("image_url") val imageUrl: String?
)

data class OTPRequest(
    val email: String,
    val role: String = "consumer",
    val name: String = ""
)

data class OTPVerify(
    val email: String,
    val code: String,
    val role: String = "consumer"
)

data class AuthResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String,
    val user: User
)

data class FertilizerRequest(
    @SerializedName("farmer_id") val farmerId: Int,
    val crop: String,
    @SerializedName("soil_type") val soilType: String,
    val ph: Float,
    val nitrogen: Float,
    val phosphorus: Float,
    val potassium: Float,
    @SerializedName("area_acres") val areaAcres: Float
)

data class AIResponse(
    val advice: String?,
    val result: String?,
    val status: String = "success"
)
