<template>
  <img v-if="objectUrl" :src="objectUrl" :alt="alt" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { authState } from '@/services/auth'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' }
})

const objectUrl = ref('')

const fetchImage = async () => {
  if (!props.src) return
  
  try {
    const response = await fetch(props.src, {
      headers: {
        Authorization: `Bearer ${authState.token}`
      }
    })
    
    if (!response.ok) throw new Error('Network response was not ok')
    
    const blob = await response.blob()
    objectUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error('Failed to load secure image', error)
  }
}

watch(() => props.src, () => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
  }
  fetchImage()
})

onMounted(fetchImage)

onUnmounted(() => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
  }
})
</script>
