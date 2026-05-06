package com.streamdeck.mobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class PiPModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    init {
        instance = this
    }

    @ReactMethod
    fun isPiPActive(promise: com.facebook.react.bridge.Promise) {
        promise.resolve(isInPiPState)
    }

    companion object {
        private var instance: PiPModule? = null
        private var isInPiPState: Boolean = false

        fun emitEvent(reactContext: ReactApplicationContext?, isInPiP: Boolean) {
            isInPiPState = isInPiP
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onPiPModeChanged", isInPiP)
        }
    }
    override fun getName(): String {
        return "PiPModule"
    }

    @ReactMethod
    fun setPiPEnabled(enabled: Boolean) {
        MainActivity.isPiPAllowed = enabled
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN NativeEventEmitter
    }
}
