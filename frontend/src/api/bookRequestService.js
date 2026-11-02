
import apiClient from "./client";

const bookRequestService = {
  createRequest: async (bookId) => {
    const { data } = await apiClient.post("/book-requests", {
      bookId,
    });
    return data;
  },

  getMyRequests: async (params) => {
    const { data } = await apiClient.get("/book-requests/my", { params });
    return data;
  },

  getAllRequests: async (status = "All", params = {}) => {
    const { data } = await apiClient.get("/book-requests", {
      params: { ...params, ...(status === "All" ? {} : { status }) },
    });
    return data;
  },

  getPendingCount: async () => {
    const { data } = await apiClient.get(
      "/book-requests/pending-count"
    );
    return data;
  },

  updateStatus: async (requestId, status) => {
    const { data } = await apiClient.patch(
      `/book-requests/${requestId}/status`,
      { status }
    );
    return data;
  },

  cancelRequest: async (requestId) => {
    const { data } = await apiClient.patch(
      `/book-requests/${requestId}/cancel`
    );
    return data;
  },
};

export default bookRequestService;
