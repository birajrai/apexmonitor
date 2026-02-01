<template>
  <form @submit.prevent="login">
    <input v-model="email" />
    <input v-model="password" type="password" />
    <button>Login</button>
  </form>
</template>

<script setup>
import { ref } from "vue"
const email = ref("")
const password = ref("")
async function login() {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.value, password: password.value })
  })
  localStorage.token = (await r.json()).token
}
</script>
