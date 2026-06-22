<template>
  <n-dialog-provider>
  <n-message-provider>
  <n-config-provider :theme="darkTheme" :theme-overrides="{ common: { fontWeightStrong: '600' } }">
    <Navbar/>
    <router-view />
    <Footer/>
  </n-config-provider>
  </n-message-provider>
  </n-dialog-provider>
</template>

<script setup>
import { NConfigProvider, darkTheme } from 'naive-ui';
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
</script>