import apiClient from "./client";

const multipart = { headers: { "Content-Type": "multipart/form-data" } };
const bookService = {
  getBooks: async (params) => (await apiClient.get("/books", { params })).data,
  getBook: async (id, params) => (await apiClient.get(`/books/${id}`, { params })).data,
  getOptions: async () => (await apiClient.get("/books/options")).data,
  createBook: async (payload) => (await apiClient.post("/books", payload, multipart)).data,
  updateBook: async (id, payload) => (await apiClient.put(`/books/${id}`, payload, multipart)).data,
  deleteBook: async (id) => (await apiClient.delete(`/books/${id}`)).data,
  updateCopy: async (id, copyId, status) => (await apiClient.patch(`/books/${id}/copies/${copyId}`, { status })).data,
};
export const bookImageUrl = (image) => image ? `${apiClient.defaults.baseURL.replace(/\/api\/?$/, "")}${image}` : "";
export default bookService;
