package com.hompimplay.hris;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.database.Cursor;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private long downloadId = -1;
    private PluginCall pendingCall;
    private BroadcastReceiver receiver;
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private Runnable progressRunnable;

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", canRequestPackageInstalls());
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "hris-mobile-update.apk");

        if (url == null || url.trim().isEmpty()) {
            call.reject("URL APK tidak valid.");
            return;
        }

        if (!canRequestPackageInstalls()) {
            call.reject("Izin install aplikasi belum diberikan.", "INSTALL_PERMISSION_REQUIRED");
            return;
        }

        try {
            File downloadsDir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (downloadsDir == null) {
                call.reject("Folder download aplikasi tidak tersedia.");
                return;
            }

            File apkFile = new File(downloadsDir, fileName);
            if (apkFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                apkFile.delete();
            }

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Update HRIS Mobile");
            request.setDescription(fileName);
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationUri(Uri.fromFile(apkFile));

            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            downloadId = manager.enqueue(request);
            pendingCall = call;
            startProgressPolling();
            registerReceiver(apkFile);
        } catch (Exception exception) {
            call.reject(exception.getMessage() != null ? exception.getMessage() : "Update aplikasi gagal dimulai.");
        }
    }

    private boolean canRequestPackageInstalls() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void registerReceiver(File apkFile) {
        if (receiver != null) {
            return;
        }

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != downloadId) {
                    return;
                }

                try {
                    context.unregisterReceiver(this);
                } catch (Exception ignored) {
                }
                receiver = null;
                stopProgressPolling();
                DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadId);
                Cursor cursor = manager.query(query);
                boolean success = false;
                if (cursor != null) {
                    if (cursor.moveToFirst()) {
                        int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                        success = statusIndex >= 0 && cursor.getInt(statusIndex) == DownloadManager.STATUS_SUCCESSFUL;
                    }
                    cursor.close();
                }

                if (success && apkFile.exists()) {
                    sendProgress(100, 0, 0, DownloadManager.STATUS_SUCCESSFUL);
                    openInstaller(apkFile);
                } else if (pendingCall != null) {
                    sendProgress(0, 0, 0, DownloadManager.STATUS_FAILED);
                    pendingCall.reject("Download update gagal. Periksa koneksi internet lalu coba lagi.");
                    pendingCall = null;
                    return;
                }

                if (pendingCall != null) {
                    JSObject result = new JSObject();
                    result.put("download_id", downloadId);
                    pendingCall.resolve(result);
                    pendingCall = null;
                }
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }
    }

    private void startProgressPolling() {
        stopProgressPolling();
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadId);
                Cursor cursor = manager.query(query);

                if (cursor != null) {
                    try {
                        if (cursor.moveToFirst()) {
                            int status = getInt(cursor, DownloadManager.COLUMN_STATUS, DownloadManager.STATUS_PENDING);
                            long downloaded = getLong(cursor, DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR, 0);
                            long total = getLong(cursor, DownloadManager.COLUMN_TOTAL_SIZE_BYTES, 0);
                            int progress = total > 0 ? Math.min(99, (int) ((downloaded * 100) / total)) : 0;
                            sendProgress(progress, downloaded, total, status);
                        }
                    } finally {
                        cursor.close();
                    }
                }

                progressHandler.postDelayed(this, 500);
            }
        };
        progressHandler.post(progressRunnable);
    }

    private void stopProgressPolling() {
        if (progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
            progressRunnable = null;
        }
    }

    private void sendProgress(int progress, long downloaded, long total, int status) {
        JSObject data = new JSObject();
        data.put("progress", progress);
        data.put("downloaded", downloaded);
        data.put("total", total);
        data.put("status", status);
        notifyListeners("downloadProgress", data);
    }

    private int getInt(Cursor cursor, String columnName, int fallback) {
        int index = cursor.getColumnIndex(columnName);
        return index >= 0 ? cursor.getInt(index) : fallback;
    }

    private long getLong(Cursor cursor, String columnName, long fallback) {
        int index = cursor.getColumnIndex(columnName);
        return index >= 0 ? cursor.getLong(index) : fallback;
    }

    private void openInstaller(File apkFile) {
        Uri apkUri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getContext().startActivity(intent);
    }
}
