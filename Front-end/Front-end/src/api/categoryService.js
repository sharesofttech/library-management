import apiClient from "./client";

export const categoryService = {
  getCategories: async (params) => (await apiClient.get("/categories", { params })).data,
  getCategoryById: async (id) => (await apiClient.get(`/categories/${id}`)).data,
  createCategory: async (payload) => (await apiClient.post("/categories", payload)).data,
  updateCategory: async (id, payload) => (await apiClient.put(`/categories/${id}`, payload)).data,
  deleteCategory: async (id) => (await apiClient.delete(`/categories/${id}`)).data,
};

export default categoryService;
