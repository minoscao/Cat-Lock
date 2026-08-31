package com.minoscao.catlock;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class UrgentAlarmReceiver extends BroadcastReceiver {
    static final String EXTRA_ID = "urgent_alarm_id";
    static final String EXTRA_TITLE = "urgent_alarm_title";

    static PendingIntent pendingIntent(Context context, int id, String title) {
        Intent intent = new Intent(context, UrgentAlarmReceiver.class)
            .putExtra(EXTRA_ID, id)
            .putExtra(EXTRA_TITLE, title);
        return PendingIntent.getBroadcast(context, id, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void schedule(Context context, int id, long at, String title) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pendingIntent = pendingIntent(context, id, title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pendingIntent);
        } else {
            manager.setExact(AlarmManager.RTC_WAKEUP, at, pendingIntent);
        }
    }

    static void cancel(Context context, int id) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        manager.cancel(pendingIntent(context, id, ""));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        Intent serviceIntent = new Intent(context, UrgentAlarmService.class)
            .putExtra(EXTRA_ID, intent.getIntExtra(EXTRA_ID, 0))
            .putExtra(EXTRA_TITLE, intent.getStringExtra(EXTRA_TITLE));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(serviceIntent);
        else context.startService(serviceIntent);
    }
}
