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
    private boolean completionHandled = false;

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
            completionHandled = false;
            startProgressPolling(apkFile);
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

                handleDownloadFinished(context, apkFile);
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }
    }

    private void startProgressPolling(File apkFile) {
        stopProgressPolling();
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (completionHandled) {
                    return;
                }

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

                            if (status == DownloadManager.STATUS_SUCCESSFUL || status == DownloadManager.STATUS_FAILED) {
                                handleDownloadFinished(getContext(), apkFile);
                                return;
                            }
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

    private void handleDownloadFinished(Context context, File apkFile) {
        if (completionHandled) {
            return;
        }

        completionHandled = true;
        unregisterReceiverSafely(context);
        stopProgressPolling();

        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(downloadId);
        Cursor cursor = manager.query(query);
        boolean success = false;
        long downloaded = apkFile.exists() ? apkFile.length() : 0;
        long total = downloaded;

        if (cursor != null) {
            try {
                if (cursor.moveToFirst()) {
                    int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                    success = statusIndex >= 0 && cursor.getInt(statusIndex) == DownloadManager.STATUS_SUCCESSFUL;
                    downloaded = getLong(cursor, DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR, downloaded);
                    total = getLong(cursor, DownloadManager.COLUMN_TOTAL_SIZE_BYTES, total);
                }
            } finally {
                cursor.close();
            }
        }

        if (success && apkFile.exists()) {
            sendProgress(100, downloaded, total, DownloadManager.STATUS_SUCCESSFUL);

            try {
                openInstaller(apkFile);
            } catch (Exception exception) {
                if (pendingCall != null) {
                    pendingCall.reject(
                        exception.getMessage() != null
                            ? exception.getMessage()
                            : "APK berhasil didownload, tetapi installer Android tidak dapat dibuka. Buka file APK dari folder download aplikasi."
                    );
                    pendingCall = null;
                }
                return;
            }

            if (pendingCall != null) {
                JSObject result = new JSObject();
                result.put("download_id", downloadId);
                pendingCall.resolve(result);
                pendingCall = null;
            }

            return;
        }

        sendProgress(0, downloaded, total, DownloadManager.STATUS_FAILED);
        if (pendingCall != null) {
            pendingCall.reject("Download update gagal. Periksa koneksi internet lalu coba lagi.");
            pendingCall = null;
        }
    }

    private void unregisterReceiverSafely(Context context) {
        if (receiver == null) {
            return;
        }

        try {
            context.unregisterReceiver(receiver);
        } catch (Exception ignored) {
        }
        receiver = null;
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

        Intent viewIntent = new Intent(Intent.ACTION_VIEW);
        viewIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        try {
            startInstallerIntent(viewIntent);
            return;
        } catch (Exception ignored) {
        }

        Intent installIntent = new Intent(Intent.ACTION_INSTALL_PACKAGE);
        installIntent.setData(apkUri);
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        installIntent.putExtra(Intent.EXTRA_RETURN_RESULT, false);
        startInstallerIntent(installIntent);
    }

    private void startInstallerIntent(Intent intent) {
        if (getActivity() != null) {
            getActivity().startActivity(intent);
            return;
        }

        getContext().startActivity(intent);
    }
}
