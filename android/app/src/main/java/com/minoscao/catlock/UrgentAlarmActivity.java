package com.minoscao.catlock;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class UrgentAlarmActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON);

        String title = getIntent().getStringExtra(UrgentAlarmReceiver.EXTRA_TITLE);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(42, 42, 42, 42);
        layout.setBackgroundColor(Color.rgb(255, 252, 244));

        TextView eyebrow = new TextView(this);
        eyebrow.setText("小猫的紧急提醒");
        eyebrow.setTextSize(18);
        eyebrow.setTextColor(Color.rgb(127, 119, 100));
        eyebrow.setGravity(Gravity.CENTER);

        TextView message = new TextView(this);
        message.setText(title == null ? "有一件重要的事在等你" : title);
        message.setTextSize(30);
        message.setTextColor(Color.rgb(69, 100, 67));
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, 24, 0, 38);

        Button dismiss = new Button(this);
        dismiss.setText("关闭提醒");
        dismiss.setTextSize(20);
        dismiss.setTextColor(Color.WHITE);
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(95, 129, 89));
        background.setCornerRadius(999);
        dismiss.setBackground(background);
        dismiss.setPadding(48, 18, 48, 18);
        dismiss.setOnClickListener(view -> {
            UrgentAlarmService.stop(this);
            finish();
        });

        layout.addView(eyebrow, new LinearLayout.LayoutParams(-1, -2));
        layout.addView(message, new LinearLayout.LayoutParams(-1, -2));
        layout.addView(dismiss, new LinearLayout.LayoutParams(-2, -2));
        setContentView(layout);
    }
}
