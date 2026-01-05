package eu.eventnexus.livemap.data.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    val name: String? = null,
    val phone: String? = null,
    val avatar_url: String? = null,
    val role: String = "user",
    val created_at: String? = null
)

@Serializable
data class AuthRequest(
    val email: String,
    val password: String
)

@Serializable
data class AuthResponse(
    val user: User? = null,
    val session: Session? = null,
    val error: String? = null
)

@Serializable
data class Session(
    val access_token: String,
    val refresh_token: String,
    val expires_in: Long,
    val user: User
)
