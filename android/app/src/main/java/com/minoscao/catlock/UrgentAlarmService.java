package com.minoscao.catlock;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.core.app.NotificationCompat;

public class UrgentAlarmService extends Service {
    private static final String CHANNEL_ID = "catlock_urgent_alarm";
    private static final int NOTIFICATION_ID = 91001;
    private Ringtone ringtone;
    private Vibrator vibrator;

    public static void stop(Context context) {
        context.stopService(new Intent(context, UrgentAlarmService.class));
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title = intent == null ? "紧急提醒" : intent.getStringExtra(UrgentAlarmReceiver.EXTRA_TITLE);
        startForeground(NOTIFICATION_ID, notification(title == null ? "紧急提醒" : title));
        startAlert();
        return START_NOT_STICKY;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    private Notification notification(String title) {
        Intent fullScreenIntent = new Intent(this, UrgentAlarmActivity.class)
            .putExtra(UrgentAlarmReceiver.EXTRA_TITLE, title)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 0, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("小猫的紧急提醒")
            .setContentText(title)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullScreenPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "紧急提醒", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("需要手动关闭的紧急提醒");
        channel.setSound(alarmUri, attributes);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 700, 350, 700 });
        ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
    }

    private void startAlert() {
        Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        ringtone = RingtoneManager.getRingtone(this, alarmUri);
        if (ringtone != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) ringtone.setLooping(true);
            ringtone.play();
        }
        vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(new long[] { 0, 700, 350, 700 }, 0));
            } else {
                vibrator.vibrate(new long[] { 0, 700, 350, 700 }, 0);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (ringtone != null && ringtone.isPlaying()) ringtone.stop();
        if (vibrator != null) vibrator.cancel();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
