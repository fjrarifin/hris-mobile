let startupPermissionRequestStarted = false

function requestGeolocationPermission() {
  if (!navigator.geolocation) {
    return
  }

  navigator.geolocation.getCurrentPosition(
    () => undefined,
    (error) => {
      console.warn('Geolocation permission request failed:', error)
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    },
  )
}

async function requestCameraPermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return
  }

  try {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
      },
      audio: false,
    })

    mediaStream.getTracks().forEach((track) => track.stop())
  } catch (error) {
    console.warn('Camera permission request failed:', error)
  }
}

export function requestStartupAppPermissions() {
  if (startupPermissionRequestStarted) {
    return
  }

  startupPermissionRequestStarted = true
  requestGeolocationPermission()
  void requestCameraPermission()
}
