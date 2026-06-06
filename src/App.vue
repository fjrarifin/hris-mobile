<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, useBackButton, useIonRouter } from '@ionic/vue';
import { onMounted } from 'vue';
import { requestStartupAppPermissions } from './services/appPermissions';
import { showAppAlert } from './services/alerts';
import { App } from '@capacitor/app';
import { logoutEmployee, authState } from './services/auth';

const ionRouter = useIonRouter();

useBackButton(10, (processNextHandler) => {
  if (!ionRouter.canGoBack()) {
    if (authState.isAuthenticated) {
      void showAppAlert({
        header: 'Keluar Aplikasi',
        message: 'Apakah Anda ingin menutup aplikasi atau logout dari akun?',
        type: 'warning',
        buttons: [
          { text: 'Batal', role: 'cancel' },
          { text: 'Tutup', handler: () => { void App.exitApp(); } },
          { text: 'Logout', handler: () => { void logoutEmployee(); } }
        ]
      });
    } else {
      void App.exitApp();
    }
  } else {
    processNextHandler();
  }
});

onMounted(() => {
  requestStartupAppPermissions();
});
</script>
