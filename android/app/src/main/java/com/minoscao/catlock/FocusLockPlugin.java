package com.minoscao.catlock;

import android.app.Activity;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FocusLock")
public class FocusLockPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            call.reject("Screen pinning requires Android 5.0 or newer.");
            return;
        }
        try {
            getActivity().startLockTask();
            call.resolve();
        } catch (IllegalStateException exception) {
            call.reject("Screen pinning was not enabled.", exception);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Activity activity = getActivity();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            call.resolve();
            return;
        }
        try {
            activity.stopLockTask();
            call.resolve();
        } catch (IllegalStateException exception) {
            call.resolve();
        }
    }
}
