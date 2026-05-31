<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted } from 'vue';
import { requestStartupAppPermissions } from './services/appPermissions';

onMounted(() => {
  requestStartupAppPermissions();
});
</script>
