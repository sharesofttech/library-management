import apiClient from "./client";

const authorService = {
  getAuthors: async (params) => (await apiClient.get("/authors", { params })).data,
  getAuthorById: async (id) => (await apiClient.get(`/authors/${id}`)).data,
  createAuthor: async (payload) => (await apiClient.post("/authors", payload)).data,
  updateAuthor: async (id, payload) => (await apiClient.put(`/authors/${id}`, payload)).data,
  deleteAuthor: async (id) => (await apiClient.delete(`/authors/${id}`)).data,
};

export default authorService;
