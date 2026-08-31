package com.minoscao.catlock;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UrgentAlarm")
public class UrgentAlarmPlugin extends Plugin {
    @PluginMethod
    public void schedule(PluginCall call) {
        Integer id = call.getInt("id");
        Long at = call.getLong("at");
        String title = call.getString("title", "紧急提醒");
        if (id == null || at == null) {
            call.reject("Urgent alarm requires an id and a scheduled time.");
            return;
        }
        AlarmManager manager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) {
            Intent settingsIntent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + getContext().getPackageName()));
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settingsIntent);
            call.reject("Exact alarm permission is required.");
            return;
        }
        UrgentAlarmReceiver.schedule(getContext(), id, at, title);
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Integer id = call.getInt("id");
        if (id != null) UrgentAlarmReceiver.cancel(getContext(), id);
        UrgentAlarmService.stop(getContext());
        call.resolve();
    }
}
