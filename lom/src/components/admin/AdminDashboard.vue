<template>
  <div class="admin-page">
    <h2 class="admin-heading">管理后台</h2>
    <n-tabs v-model:value="tab" type="line">
      <n-tab-pane name="users" tab="用户管理">
        <div class="tab-toolbar">
          <n-button type="primary" @click="openCreateUser"><template #icon><n-icon><PersonAdd /></n-icon></template>新建用户</n-button>
        </div>
        <n-data-table :columns="userColumns" :data="users" :loading="uloading" :pagination="{ pageSize: 20 }" :row-key="r => r.id" />
      </n-tab-pane>

      <n-tab-pane name="articles" tab="文章管理">
        <n-data-table :columns="articleColumns" :data="articles" :loading="aloading" :pagination="{ pageSize: 20 }" :row-key="r => r.id" />
      </n-tab-pane>

      <n-tab-pane name="posts" tab="帖子管理">
        <n-data-table :columns="postColumns" :data="posts" :loading="ploading" :pagination="{ pageSize: 20 }" :row-key="r => r.id" />
      </n-tab-pane>
    </n-tabs>

    <!-- 用户弹窗 -->
    <n-modal v-model:show="showUserModal" :title="editingId ? '编辑用户' : '新建用户'" preset="card" style="width:500px">
      <n-form :model="userForm" label-placement="left" label-width="80px">
        <n-form-item label="用户名"><n-input v-model:value="userForm.username" /></n-form-item>
        <n-form-item label="邮箱"><n-input v-model:value="userForm.email" /></n-form-item>
        <n-form-item label="新密码"><n-input v-model:value="userForm.password" type="password" :placeholder="editingId ? '留空不修改' : '必填'" /></n-form-item>
        <n-form-item label="管理员"><n-switch v-model:value="userForm.is_admin" /></n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showUserModal = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="saveUser">{{ editingId ? '保存' : '创建' }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import { useMessage, NButton, NSpace, NTag, NPopconfirm } from 'naive-ui'
import { PersonAdd } from '@vicons/ionicons5'
import { adminApi } from '../../api/admin.js'
import { articleApi } from '../../api/article.js'
import { forumApi } from '../../api/forum.js'
import { formatDate } from '../../utils/date.js'

const message = useMessage()
const tab = ref('users')

// ======== Users ========
const users = ref([]), uloading = ref(false)
const userColumns = [
  { title: 'ID', key: 'id', width: 50 },
  { title: '用户名', key: 'username' },
  { title: '邮箱', key: 'email', ellipsis: { tooltip: true } },
  { title: '金币', key: 'gold_coins', width: 70 },
  { title: '签到', key: 'checkin_streak', width: 60, render: r => r.checkin_streak || 0 },
  { title: '管理员', key: 'is_admin', width: 70, render: r => h(NTag, { type: r.is_admin ? 'error' : 'default', size: 'small', bordered: false }, () => r.is_admin ? '是' : '否') },
  {
    title: '操作', key: 'actions', width: 120,
    render: r => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'small', quaternary: true, onClick: () => openEditUser(r) }, () => '编辑'),
      h(NPopconfirm, { onPositiveClick: () => removeUser(r.id) }, { trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, () => '删除'), default: () => '确认删除？' }),
    ]),
  },
]
const fetchUsers = async () => { uloading.value = true; try { users.value = (await adminApi.getUsers()).data } finally { uloading.value = false } }

const showUserModal = ref(false), editingId = ref(null), saving = ref(false)
const userForm = ref({ username: '', email: '', password: '', is_admin: false })
const openCreateUser = () => { editingId.value = null; userForm.value = { username: '', email: '', password: '', is_admin: false }; showUserModal.value = true }
const openEditUser = r => { editingId.value = r.id; userForm.value = { username: r.username, email: r.email, password: '', is_admin: r.is_admin }; showUserModal.value = true }
const saveUser = async () => {
  saving.value = true
  try {
    const p = { username: userForm.value.username, email: userForm.value.email, is_admin: userForm.value.is_admin }
    if (userForm.value.password) p.password = userForm.value.password
    if (editingId.value) { await adminApi.updateUser(editingId.value, p); message.success('已更新') }
    else { if (!userForm.value.password) { message.warning('请输入密码'); saving.value = false; return }; await adminApi.createUser(p); message.success('已创建') }
    showUserModal.value = false; fetchUsers()
  } catch (e) { message.error(e.response?.data?.message || '失败') }
  finally { saving.value = false }
}
const removeUser = async id => { try { await adminApi.deleteUser(id); message.success('已删除'); fetchUsers() } catch { message.error('删除失败') } }

// ======== Articles ========
const articles = ref([]), aloading = ref(false)
const articleColumns = [
  { title: 'ID', key: 'id', width: 50 },
  { title: '标题', key: 'title', ellipsis: { tooltip: true } },
  { title: '修改时间', key: 'updatedAt', width: 140, render: r => formatDate(r.updatedAt) },
  {
    title: '操作', key: 'actions', width: 80,
    render: r => h(NPopconfirm, { onPositiveClick: () => removeArticle(r.id) }, { trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, () => '删除'), default: () => '确认删除？' }),
  },
]
const fetchArticles = async () => { aloading.value = true; try { articles.value = (await articleApi.getArticles({ pageSize: 200 })).data.articles } finally { aloading.value = false } }
const removeArticle = async id => { try { await articleApi.deleteArticle(id); message.success('已删除'); fetchArticles() } catch { message.error('删除失败') } }

// ======== Posts ========
const posts = ref([]), ploading = ref(false)
const postColumns = [
  { title: 'ID', key: 'id', width: 50 },
  { title: '标题', key: 'title', ellipsis: { tooltip: true } },
  { title: '作者', key: 'user', width: 100, render: r => r.user?.username || '-' },
  { title: '时间', key: 'updatedAt', width: 140, render: r => formatDate(r.updatedAt) },
  {
    title: '操作', key: 'actions', width: 80,
    render: r => h(NPopconfirm, { onPositiveClick: () => removePost(r.id) }, { trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, () => '删除'), default: () => '确认删除？' }),
  },
]
const fetchPosts = async () => { ploading.value = true; try { posts.value = (await forumApi.getPosts({ pageSize: 200 })).data.posts } finally { ploading.value = false } }
const removePost = async id => { try { await forumApi.deletePost(id); message.success('已删除'); fetchPosts() } catch { message.error('删除失败') } }

onMounted(() => { fetchUsers(); fetchArticles(); fetchPosts() })
</script>

<style scoped>
.admin-page { padding: 32px 40px; min-height: 100%; background: linear-gradient(180deg, var(--color-bg-gradient-start), var(--color-bg-dark) 60%); }
.admin-heading { margin: 0 0 20px; font-size: 24px; color: var(--color-text-primary); }
.tab-toolbar { margin: 12px 0 16px; }
</style>
