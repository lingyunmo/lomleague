import client from './client.js'

export const adminApi = {
  getUsers() {
    return client.get('/user/admin/users')
  },
  createUser(data) {
    return client.post('/user/admin/users', data)
  },
  updateUser(id, data) {
    return client.put(`/user/admin/users/${id}`, data)
  },
  deleteUser(id) {
    return client.delete(`/user/admin/users/${id}`)
  },
}
