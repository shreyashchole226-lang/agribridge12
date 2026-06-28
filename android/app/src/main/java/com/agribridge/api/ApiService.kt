package com.agribridge.api

import com.agribridge.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @POST("auth/send-email-otp")
    suspend fun sendOTP(@Body request: OTPRequest): Response<Unit>

    @POST("auth/verify-email-otp")
    suspend fun verifyOTP(@Body request: OTPVerify): Response<AuthResponse>

    @GET("products")
    suspend fun getProducts(@Query("category") category: String? = null): Response<List<Product>>

    @POST("ai/fertilizer-advisor")
    suspend fun getFertilizerAdvice(@Body request: FertilizerRequest): Response<AIResponse>
}
