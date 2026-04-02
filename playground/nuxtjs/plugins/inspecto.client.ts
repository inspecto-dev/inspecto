export default defineNuxtPlugin(() => {
  if (import.meta.dev) {
    import('@inspecto-dev/core').then(({ mountInspector }) => {
      mountInspector()
    })
  }
})
