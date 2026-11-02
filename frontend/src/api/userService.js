import apiClient from "./client";

const userService = {
  getMyRenterListings: async (params) => {
    const response = await apiClient.get("/renter/listings", { params });
    return response.data;
  },

  createRenterListing: async (payload) => {
    const response = await apiClient.post("/renter/listings", payload, { headers: { "Content-Type": "multipart/form-data" } });
    return response.data;
  },

  updateRenterListingHighlights: async (id, highlights) => (await apiClient.patch(`/renter/listings/${id}/highlights`, { highlights })).data,
  updateRenterListingWeight: async (id, weightKg) => (await apiClient.patch(`/renter/listings/${id}/weight`, { weightKg })).data,

  getApprovedRenterListings: async (params) => {
    const response = await apiClient.get("/catalog/renter-listings", { params });
    return response.data;
  },

  getApprovedRenterListing: async (id) => {
    const response = await apiClient.get(`/catalog/renter-listings/${id}`);
    return response.data;
  },

  getRenterCategories: async () => (await apiClient.get("/renter-categories")).data,

  createRentalRequest: async (listingId, payload) => (await apiClient.post(`/renter-listings/${listingId}/requests`, payload)).data,
  getMyRentalRequests: async () => (await apiClient.get("/rental-requests/mine")).data,
  getRentalRequestInbox: async () => (await apiClient.get("/rental-requests/inbox")).data,
  reviewRentalRequest: async (id, decision) => (await apiClient.patch(`/rental-requests/${id}`, { decision })).data,
  updateAdminRentalHandover: async (id, payload) => (await apiClient.patch(`/admin/rental-checkout/${id}/handover`, payload)).data,
  confirmAdminLibraryReceipt: async (id) => (await apiClient.patch(`/admin/rental-checkout/${id}/library-receipt`)).data,
  confirmRentalReceipt: async (id) => (await apiClient.patch(`/rental-requests/${id}/confirm-receipt`)).data,
  createRentalPaymentOrder: async (id, purpose = "checkout") => (await apiClient.post(`/rental-requests/${id}/payment-order`, { purpose })).data,
  verifyRentalPayment: async (id, payload) => (await apiClient.post(`/rental-requests/${id}/verify-payment`, payload)).data,
  getAdminRentalCheckout: async (params) => (await apiClient.get("/admin/rental-checkout", { params })).data,
  getDeliveryRates: async () => (await apiClient.get("/settings/delivery-rates")).data,
  saveDeliveryRates: async (rates) => (await apiClient.put("/settings/delivery-rates", { rates })).data,
  saveAdminRentalQuote: async (id, payload) => (await apiClient.patch(`/admin/rental-checkout/${id}/quote`, payload)).data,
  recordAdminRentalReturn: async (id, payload) => (await apiClient.patch(`/admin/rental-checkout/${id}/return`, payload)).data,
  approveAdminRentalCommission: async (id) => (await apiClient.patch(`/admin/rental-checkout/${id}/commission/approve`)).data,
  recordAdminRentalPayout: async (id, reference) => (await apiClient.patch(`/admin/rental-checkout/${id}/commission/payout`, { reference })).data,

  getMyRoleApplications: async () => (await apiClient.get("/role-applications/mine")).data,
  createRoleApplication: async (requestedRole) => (await apiClient.post("/role-applications", { requestedRole })).data,

  getPendingRenterListings: async (params) => {
    const response = await apiClient.get("/admin/renter-listings", { params });
    return response.data;
  },

  reviewRenterListing: async (id, decision, adminNote = "") => {
    const response = await apiClient.patch(`/admin/renter-listings/${id}`, { decision, adminNote });
    return response.data;
  },

  // Get all users by role ("user" or "librarian")
  getUsersByRole: async (roleName, params) => {
    const response = await apiClient.get(`/users/role/${roleName}`, { params });
    return response.data;
  },

  getApprovedRenters: async (params) => {
    const response = await apiClient.get("/users/renters", { params });
    return response.data;
  },

  getApprovedRenterDetails: async (id) => (await apiClient.get(`/users/renters/${id}`)).data,

  // Get single user by ID
  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  // Create user or librarian
  createUser: async (payload) => {
    const response = await apiClient.post("/users", payload);
    return response.data;
  },

  // Update user
  updateUser: async (id, payload) => {
    const response = await apiClient.put(`/users/${id}`, payload);
    return response.data;
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};

export default userService;
