package com.streamdeck.mobile

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.app.PictureInPictureParams
import android.util.Rational
import android.os.Build
import android.content.res.Configuration
import com.facebook.react.bridge.ReactApplicationContext

class MainActivity : ReactActivity() {
  companion object {
    var isPiPAllowed = false
  }

  override fun onUserLeaveHint() {
    if (isPiPAllowed && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val params = PictureInPictureParams.Builder()
        .setAspectRatio(Rational(16, 9))
        .build()
      enterPictureInPictureMode(params)
    }
  }

  override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    try {
      val reactContext = reactNativeHost.reactInstanceManager.currentReactContext
      if (reactContext != null && reactContext is ReactApplicationContext) {
        PiPModule.emitEvent(reactContext, isInPictureInPictureMode)
      }
    } catch (e: Exception) {
      // Ignore if bridge is not ready
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "StreamDeckMobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
