package com.agribridge.api

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    // 192.168.1.12 is your computer's local IP address. 
    // Ensure your phone is on the same Wi-Fi as your computer!
    private const val BASE_URL = "http://192.168.1.12:8000/"

    val instance: ApiService by lazy {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        retrofit.create(ApiService::class.java)
    }
}
