<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, useIonRouter } from '@ionic/vue';
import { onMounted } from 'vue';
import { showAppAlert } from './services/alerts';
import { App } from '@capacitor/app';
import { logoutEmployee, authState } from './services/auth';
import { checkForAppUpdate } from './services/appUpdate';

const ionRouter = useIonRouter();

document.addEventListener('ionBackButton', (ev: any) => {
  ev.detail.register(10, (processNextHandler: () => void) => {
    if (!ionRouter.canGoBack()) {
      if (!!authState.token) {
        void showAppAlert({
          header: 'Keluar Aplikasi',
          message: 'Apakah Anda ingin menutup aplikasi atau logout dari akun?',
          type: 'warning',
          buttons: [
            { text: 'Batal', role: 'cancel' },
            { text: 'Tutup', handler: () => { void App.exitApp(); } },
            { text: 'Logout', handler: async () => { await logoutEmployee(); ionRouter.replace('/login'); } }
          ]
        });
      } else {
        void App.exitApp();
      }
    } else {
      processNextHandler();
    }
  });
});

onMounted(() => {
  void checkForAppUpdate({ silent: true });
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      void checkForAppUpdate({ silent: true });
    }
  });
});
</script>
