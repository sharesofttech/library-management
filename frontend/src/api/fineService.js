import apiClient from "./client";
const data = response => response.data;
const fineService = {
  settings: () => apiClient.get("/settings/fines").then(data),
  saveSettings: overdueFinePerDay => apiClient.patch("/settings/fines", { overdueFinePerDay }).then(data),
  preview: id => apiClient.get(`/borrowings/${id}/fines`).then(data),
  legacyRate: (id, overdueFineRate) => apiClient.patch(`/borrowings/${id}/fine-rate`, { overdueFineRate }).then(data),
  returnBook: (id, condition) => apiClient.patch(`/borrowings/${id}/return`, { condition }).then(data),
  lostBook: id => apiClient.patch(`/borrowings/${id}/lost`).then(data),
  fines: (own, params) => apiClient.get(own ? "/my/fines" : "/fines", { params }).then(data),
  payments: (own, fineId, params) => apiClient.get(own ? "/my/fine-payments" : fineId ? `/fines/${fineId}/payments` : "/fine-payments", { params }).then(data),
  exportPayments: (params, fineId) => apiClient.get(fineId ? `/fines/${fineId}/payments/export` : "/fine-payments/export", { params, responseType: "blob" }),
  pay: (id, amount, paymentMethod) => apiClient.post(`/fines/${id}/payments`, { amount, paymentMethod }).then(data),
};
export default fineService;
