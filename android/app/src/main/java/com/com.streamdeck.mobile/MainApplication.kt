package com.streamdeck.mobile

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.modules.network.OkHttpClientFactory
import okhttp3.OkHttpClient
import okhttp3.Dns
import okhttp3.Interceptor
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import java.net.InetAddress
import java.net.Inet4Address
import java.net.UnknownHostException

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(PiPPackage())
          add(DialogBlockerPackage())
        },
    )
  }

  override fun onCreate() {
    android.util.Log.d("MainApplication", "onCreate() called!")
    super.onCreate()
    
    // Custom OkHttpClientFactory to prefer IPv4 over IPv6 and resolve local/emulator network issues
    OkHttpClientProvider.setOkHttpClientFactory(object : OkHttpClientFactory {
      override fun createNewNetworkModuleClient(): OkHttpClient {
        return OkHttpClientProvider.createClientBuilder()
          .dns(object : Dns {
            @Throws(UnknownHostException::class)
            override fun lookup(hostname: String): List<InetAddress> {
              android.util.Log.d("IPv4Dns", "Lookup: $hostname")
              val addresses = Dns.SYSTEM.lookup(hostname)
              val ipv4Only = addresses.filter { it is Inet4Address }
              android.util.Log.d("IPv4Dns", "Lookup result for $hostname: $addresses | filtered: $ipv4Only")
              return if (ipv4Only.isNotEmpty()) ipv4Only else addresses
            }
          })
          .addInterceptor(object : Interceptor {
            override fun intercept(chain: Interceptor.Chain): Response {
              val originalRequest = chain.request()
              // IMPORTANT: Only intercept API calls, NOT image CDN calls.
              // Applying gzip decompression to image.tmdb.org binary JPEG data
              // corrupts them by treating raw bytes as UTF-8 strings.
              val isTmdbApi = originalRequest.url.host == "api.tmdb.org"
              
              val request = if (isTmdbApi) {
                originalRequest.newBuilder()
                  .header("Accept-Encoding", "gzip")
                  .build()
              } else {
                originalRequest
              }
              
              android.util.Log.d("OkHttpInterceptor", "Request: ${request.url}")
              try {
                val response = chain.proceed(request)
                android.util.Log.d("OkHttpInterceptor", "Response: ${response.code} for ${request.url}")
                
                if (isTmdbApi) {
                  val body = response.body
                  if (body != null) {
                    try {
                      val bytes = body.bytes()
                      val contentEncoding = response.header("Content-Encoding")
                      val isGzipped = contentEncoding != null && contentEncoding.contains("gzip", ignoreCase = true)
                      
                      val decompressedString = if (isGzipped) {
                        val bis = java.io.ByteArrayInputStream(bytes)
                        val gis = java.util.zip.GZIPInputStream(bis)
                        val reader = java.io.InputStreamReader(gis, "UTF-8")
                        val bufferedReader = java.io.BufferedReader(reader)
                        val sb = java.lang.StringBuilder()
                        var line: String? = bufferedReader.readLine()
                        while (line != null) {
                          sb.append(line).append("\n")
                          line = bufferedReader.readLine()
                        }
                        bufferedReader.close()
                        sb.toString()
                      } else {
                        String(bytes, java.nio.charset.StandardCharsets.UTF_8)
                      }
                      
                      android.util.Log.d("OkHttpInterceptor", "TMDB Body length: ${decompressedString.length} for ${request.url}")
                      
                      return response.newBuilder()
                        .removeHeader("Content-Encoding")
                        .removeHeader("Content-Length")
                        .body(decompressedString.toResponseBody(body.contentType()))
                        .build()
                    } catch (e: Exception) {
                      android.util.Log.e("OkHttpInterceptor", "TMDB Body read error for ${request.url}", e)
                      throw e
                    }
                  }
                }
                return response
              } catch (e: Exception) {
                android.util.Log.e("OkHttpInterceptor", "Error for ${request.url}", e)
                throw e
              }
            }
          })
          .build()
      }
    })

    loadReactNative(this)
  }
}
