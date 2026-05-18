package com.streamdeck.mobile

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.webkit.JsResult
import android.webkit.JsPromptResult
import android.webkit.WebChromeClient
import android.webkit.WebView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * DialogBlockerModule — Native Android module that patches ALL WebViews
 * in the current activity to auto-dismiss JavaScript alert/confirm/prompt dialogs.
 * 
 * This is necessary because cross-origin iframes (like CineSrc embeds) trigger
 * native Android dialogs that cannot be suppressed from injected JavaScript.
 * The WebChromeClient's onJsAlert/onJsConfirm/onJsPrompt are the only way
 * to intercept these at the native level.
 */
class DialogBlockerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DialogBlockerModule"

    private val handler = Handler(Looper.getMainLooper())
    private val patchedWebViews = mutableSetOf<Int>()

    @ReactMethod
    fun enable(promise: Promise) {
        handler.post {
            try {
                patchAllWebViews()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("DIALOG_BLOCKER_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun patchWebViews() {
        handler.post {
            patchAllWebViews()
        }
    }

    /**
     * Continuously scan and patch WebViews for a duration.
     * This ensures newly created WebViews (e.g., from react-native-webview)
     * get patched even if they're created after the initial call.
     */
    @ReactMethod
    fun enableContinuous(durationMs: Int) {
        val endTime = System.currentTimeMillis() + durationMs
        val runnable = object : Runnable {
            override fun run() {
                patchAllWebViews()
                if (System.currentTimeMillis() < endTime) {
                    handler.postDelayed(this, 500)
                }
            }
        }
        handler.post(runnable)
    }

    private fun patchAllWebViews() {
        android.util.Log.d("DialogBlocker", "=== Scanning Layout Trees for WebViews ===")
        var foundAny = false
        try {
            // Retrieve all root views of all active windows (Activity, Modals, Dialogs, Popups)
            val windowManagerGlobalClass = Class.forName("android.view.WindowManagerGlobal")
            val getInstanceMethod = windowManagerGlobalClass.getMethod("getInstance")
            val windowManagerGlobal = getInstanceMethod.invoke(null)
            val viewsField = windowManagerGlobalClass.getDeclaredField("mViews")
            viewsField.isAccessible = true
            val views = viewsField.get(windowManagerGlobal) as? ArrayList<View>
            if (views != null) {
                // Copy the array to avoid ConcurrentModificationException during scan
                val viewsCopy = ArrayList(views)
                android.util.Log.d("DialogBlocker", "Scanning ${viewsCopy.size} root window views...")
                for (rootView in viewsCopy) {
                    if (findAndPatchWebViews(rootView)) {
                        foundAny = true
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("DialogBlocker", "Reflection on WindowManagerGlobal failed: ${e.message}. Falling back to active activity window.")
            val activity: Activity = reactApplicationContext.currentActivity ?: return
            val rootView = activity.window?.decorView?.rootView ?: return
            if (findAndPatchWebViews(rootView)) {
                foundAny = true
            }
        }
        if (!foundAny) {
            android.util.Log.d("DialogBlocker", "No WebViews found in this scan.")
        }
    }

    private fun findAndPatchWebViews(view: View): Boolean {
        var found = false
        if (view is WebView) {
            found = true
            val viewId = System.identityHashCode(view)
            val currentUrl = view.url ?: "empty/loading"
            val currentClient = getWebChromeClientSafe(view)
            val clientClassName = currentClient?.javaClass?.name ?: "null"
            android.util.Log.d("DialogBlocker", "🔍 Found WebView #$viewId | Class: ${view.javaClass.name} | URL: $currentUrl | Client: $clientClassName")
            
            if (currentClient !is DialogBlockingChromeClient) {
                view.webChromeClient = DialogBlockingChromeClient(currentClient)
                android.util.Log.d("DialogBlocker", "✅ SUCCESS: Patched WebView #$viewId with DialogBlockingChromeClient wrapper")
            } else {
                android.util.Log.d("DialogBlocker", "ℹ️ WebView #$viewId is already wrapped by DialogBlockingChromeClient")
            }
        }
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                if (findAndPatchWebViews(view.getChildAt(i))) {
                    found = true
                }
            }
        }
        return found
    }

    private fun getWebChromeClientSafe(webView: WebView): WebChromeClient? {
        try {
            val client = webView.webChromeClient
            if (client != null) return client
        } catch (t: Throwable) {
            // Fall through to reflection
        }
        return getExistingChromeClient(webView)
    }

    private fun getExistingChromeClient(webView: WebView): WebChromeClient? {
        return try {
            val field = WebView::class.java.getDeclaredField("mProvider")
            field.isAccessible = true
            val provider = field.get(webView)
            val clientField = provider.javaClass.getDeclaredField("mWebChromeClient")
            clientField.isAccessible = true
            clientField.get(provider) as? WebChromeClient
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Custom WebChromeClient that auto-dismisses all JavaScript dialogs
     * while delegating all other functionality to the original client.
     */
    private class DialogBlockingChromeClient(
        private val delegate: WebChromeClient?
    ) : WebChromeClient() {

        override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
            android.util.Log.d("DialogBlocker", "⛔ Auto-dismissed alert from: $url | message: $message")
            result?.confirm()
            return true // Consumed — no native dialog shown
        }

        override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
            android.util.Log.d("DialogBlocker", "⛔ Auto-dismissed confirm from: $url | message: $message")
            result?.confirm()
            return true // Consumed — auto-confirmed, no dialog shown
        }

        override fun onJsPrompt(view: WebView?, url: String?, message: String?, defaultValue: String?, result: JsPromptResult?): Boolean {
            android.util.Log.d("DialogBlocker", "⛔ Auto-dismissed prompt from: $url | message: $message")
            result?.confirm(defaultValue ?: "")
            return true // Consumed — auto-confirmed with default value
        }

        override fun onCreateWindow(view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: android.os.Message?): Boolean {
            android.util.Log.d("DialogBlocker", "⛔ Blocked window.open() popup request from: ${view?.url}")
            return true // Consumed — block the popup window from being created entirely
        }

        override fun onJsBeforeUnload(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
            android.util.Log.d("DialogBlocker", "⛔ Auto-dismissed onJsBeforeUnload from: $url | message: $message")
            result?.confirm() // or result?.cancel() to block the redirect
            return true // Consumed — auto-dismissed, no dialog shown
        }

        // Delegate everything else to the original WebChromeClient
        override fun onProgressChanged(view: WebView?, newProgress: Int) {
            delegate?.onProgressChanged(view, newProgress) ?: super.onProgressChanged(view, newProgress)
        }

        override fun onReceivedTitle(view: WebView?, title: String?) {
            delegate?.onReceivedTitle(view, title) ?: super.onReceivedTitle(view, title)
        }

        override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
            delegate?.onShowCustomView(view, callback) ?: super.onShowCustomView(view, callback)
        }

        override fun onHideCustomView() {
            delegate?.onHideCustomView() ?: super.onHideCustomView()
        }

        override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
            delegate?.onPermissionRequest(request) ?: super.onPermissionRequest(request)
        }

        override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
            return delegate?.onConsoleMessage(consoleMessage) ?: super.onConsoleMessage(consoleMessage)
        }

        override fun getDefaultVideoPoster(): android.graphics.Bitmap? {
            return delegate?.getDefaultVideoPoster() ?: super.getDefaultVideoPoster()
        }

        override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: android.webkit.ValueCallback<Array<android.net.Uri>>?,
            fileChooserParams: FileChooserParams?
        ): Boolean {
            return delegate?.onShowFileChooser(webView, filePathCallback, fileChooserParams)
                ?: super.onShowFileChooser(webView, filePathCallback, fileChooserParams)
        }
    }
}
