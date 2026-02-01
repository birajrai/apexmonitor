<template>
  <div class="dark">
    <h1>Status</h1>
    <div v-if="!monitors.length" class="muted">No monitors available.</div>
    <div v-for="m in monitors" :key="m._id" class="monitor-card">
      <div class="title">{{ m.name }}</div>
      <div class="row">Type: {{ m.type }}</div>
      <div class="row">Target: {{ getTarget(m) }}</div>
      <div class="row">Interval: {{ m.interval }}s</div>
      <div class="row">Status: <span :class="statusClass(m)">{{ m.lastStatus }}</span></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"

const monitors = ref([])

function getTarget(m) {
  if (m.type === 'http' && m.target?.url) return m.target.url
  if (m.type === 'tcp' && m.target?.host) return `${m.target.host}:${m.target.port}`
  return JSON.stringify(m.target)
}

function statusClass(m) {
  const status = (m.lastStatus || "").toLowerCase()
  if (status === "up" || status === "ok" || status === "healthy") return "status up"
  if (status === "down" || status === "error") return "status down"
  return "status unknown"
}

onMounted(async () => {
  try {
    const res = await fetch("/api/public/status")
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data?.monitors?.length) {
      throw new Error("No monitors found")
    }
    monitors.value = data.monitors
  } catch (error) {
    console.error("Failed to fetch monitors:", error)
    monitors.value = []
  }
})
</script>

<style scoped>
.dark {
  background: #0b0f19;
  color: #e5e7eb;
  min-height: 100vh;
  padding: 24px;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

.muted {
  color: #9ca3af;
  margin-top: 12px;
}

.monitor-card {
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #111827;
  border: 1px solid #1f2937;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.row {
  margin-top: 4px;
  color: #d1d5db;
}

.status {
  font-weight: 600;
}

.status.up {
  color: #22c55e;
}

.status.down {
  color: #ef4444;
}

.status.unknown {
  color: #f59e0b;
}
</style>
