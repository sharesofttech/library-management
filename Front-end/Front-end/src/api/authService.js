import apiClient from "./client";

export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post("/login", credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post("/register", userData);
    return response.data;
  },

  startRegistrationVerification: async (contact) => {
    const response = await apiClient.post("/registration-verification/start", contact);
    return response.data;
  },

  verifyRegistrationCode: async (verificationId, channel, code) => {
    const response = await apiClient.post("/registration-verification/verify", { verificationId, channel, code });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post("/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (token, passwords) => {
    const response = await apiClient.post(`/reset-password/${token}`, passwords);
    return response.data;
  },
};

export default authService;
