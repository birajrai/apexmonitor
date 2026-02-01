<template>
    <div class="dashboard">
        <div class="header">
            <h1>Admin Dashboard</h1>
            <button @click="logout" class="btn-logout">Logout</button>
        </div>

        <div class="section">
            <h2>Monitors</h2>
            <button @click="showAddMonitor = true" class="btn-primary">Add Monitor</button>

            <div v-if="monitors.length === 0" class="empty-state">No monitors yet. Add one to get started.</div>

            <div v-for="monitor in monitors" :key="monitor._id" class="card">
                <h3>{{ monitor.name }}</h3>
                <p><strong>Type:</strong> {{ monitor.type }}</p>
                <p><strong>Status:</strong> <span :class="'status-' + monitor.lastStatus">{{ monitor.lastStatus ||
                        'unknown' }}</span></p>
                <p><strong>Active:</strong> {{ monitor.isActive ? 'Yes' : 'No' }}</p>
                <p><strong>Interval:</strong> {{ monitor.interval }}s</p>
            </div>
        </div>

        <div class="section">
            <h2>Categories</h2>
            <button @click="showAddCategory = true" class="btn-primary">Add Category</button>

            <div v-if="categories.length === 0" class="empty-state">No categories yet.</div>

            <div v-for="category in categories" :key="category._id" class="card">
                <h3>{{ category.name }}</h3>
                <p>{{ category.description }}</p>
                <p><strong>Public:</strong> {{ category.isPublic ? 'Yes' : 'No' }}</p>
            </div>
        </div>

        <!-- Add Monitor Modal -->
        <div v-if="showAddMonitor" class="modal" @click.self="showAddMonitor = false">
            <div class="modal-content">
                <h2>Add Monitor</h2>
                <form @submit.prevent="addMonitor">
                    <div class="form-group">
                        <label>Name</label>
                        <input v-model="newMonitor.name" required />
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select v-model="newMonitor.type" required>
                            <option value="http">HTTP</option>
                            <option value="tcp">TCP</option>
                        </select>
                    </div>
                    <div class="form-group" v-if="newMonitor.type === 'http'">
                        <label>URL</label>
                        <input v-model="newMonitor.target.url" type="url" required />
                    </div>
                    <div class="form-group" v-if="newMonitor.type === 'tcp'">
                        <label>Host</label>
                        <input v-model="newMonitor.target.host" required />
                    </div>
                    <div class="form-group" v-if="newMonitor.type === 'tcp'">
                        <label>Port</label>
                        <input v-model.number="newMonitor.target.port" type="number" required />
                    </div>
                    <div class="form-group">
                        <label>Interval (seconds)</label>
                        <input v-model.number="newMonitor.interval" type="number" required />
                    </div>
                    <div class="form-group">
                        <label>
                            <input v-model="newMonitor.isActive" type="checkbox" />
                            Active
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Add</button>
                        <button type="button" @click="showAddMonitor = false" class="btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Add Category Modal -->
        <div v-if="showAddCategory" class="modal" @click.self="showAddCategory = false">
            <div class="modal-content">
                <h2>Add Category</h2>
                <form @submit.prevent="addCategory">
                    <div class="form-group">
                        <label>Name</label>
                        <input v-model="newCategory.name" required />
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea v-model="newCategory.description"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Display Order</label>
                        <input v-model.number="newCategory.displayOrder" type="number" />
                    </div>
                    <div class="form-group">
                        <label>
                            <input v-model="newCategory.isPublic" type="checkbox" />
                            Public
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Add</button>
                        <button type="button" @click="showAddCategory = false" class="btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const monitors = ref([])
const categories = ref([])
const showAddMonitor = ref(false)
const showAddCategory = ref(false)

const newMonitor = ref({
    name: "",
    type: "http",
    target: { url: "", host: "", port: 80 },
    interval: 60,
    isActive: true,
})

const newCategory = ref({
    name: "",
    description: "",
    displayOrder: 0,
    isPublic: true,
})

async function fetchData() {
    const token = localStorage.getItem("token")
    if (!token) {
        router.push("/admin/login")
        return
    }

    try {
        const headers = { Authorization: `Bearer ${token}` }

        const [monitorsRes, categoriesRes] = await Promise.all([
            fetch("/api/admin/monitors", { headers }),
            fetch("/api/admin/categories", { headers }),
        ])

        if (!monitorsRes.ok || !categoriesRes.ok) {
            throw new Error("Failed to fetch data")
        }

        monitors.value = await monitorsRes.json()
        categories.value = await categoriesRes.json()
    } catch (error) {
        console.error("Error fetching data:", error)
        localStorage.removeItem("token")
        router.push("/admin/login")
    }
}

async function addMonitor() {
    const token = localStorage.getItem("token")
    try {
        const response = await fetch("/api/admin/monitors", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newMonitor.value),
        })

        if (!response.ok) throw new Error("Failed to add monitor")

        showAddMonitor.value = false
        newMonitor.value = {
            name: "",
            type: "http",
            target: { url: "", host: "", port: 80 },
            interval: 60,
            isActive: true,
        }
        await fetchData()
    } catch (error) {
        console.error("Error adding monitor:", error)
        alert("Failed to add monitor")
    }
}

async function addCategory() {
    const token = localStorage.getItem("token")
    try {
        const response = await fetch("/api/admin/categories", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(newCategory.value),
        })

        if (!response.ok) throw new Error("Failed to add category")

        showAddCategory.value = false
        newCategory.value = {
            name: "",
            description: "",
            displayOrder: 0,
            isPublic: true,
        }
        await fetchData()
    } catch (error) {
        console.error("Error adding category:", error)
        alert("Failed to add category")
    }
}

function logout() {
    localStorage.removeItem("token")
    router.push("/admin/login")
}

onMounted(fetchData)
</script>

<style scoped>
.dashboard {
    min-height: 100vh;
    background: #0b0f19;
    color: #e5e7eb;
    padding: 24px;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
}

h1 {
    font-size: 32px;
    font-weight: 700;
}

h2 {
    font-size: 24px;
    margin-bottom: 16px;
}

.section {
    margin-bottom: 48px;
}

.card {
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
}

.card h3 {
    margin-bottom: 8px;
    font-size: 18px;
}

.card p {
    margin: 4px 0;
    color: #d1d5db;
}

.empty-state {
    color: #9ca3af;
    padding: 24px;
    text-align: center;
}

.status-up {
    color: #22c55e;
    font-weight: 600;
}

.status-down {
    color: #ef4444;
    font-weight: 600;
}

.btn-primary {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 16px;
}

.btn-primary:hover {
    background: #2563eb;
}

.btn-secondary {
    background: #374151;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
}

.btn-secondary:hover {
    background: #4b5563;
}

.btn-logout {
    background: #ef4444;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
}

.btn-logout:hover {
    background: #dc2626;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="url"],
.form-group input[type="number"],
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 8px 12px;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #e5e7eb;
    font-size: 14px;
}

.form-group input[type="checkbox"] {
    margin-right: 8px;
}

.form-group textarea {
    min-height: 80px;
    resize: vertical;
}

.form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

.form-actions button {
    flex: 1;
}
</style>
