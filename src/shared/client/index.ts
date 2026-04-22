import { ILoginRequest } from "../interfaces";
import { API_ENDPOINTS } from "@/api/endpoints";
import { HttpClient } from "./http-client";
const { LOGIN, REGISTER, UPDATE_PROFILE } = API_ENDPOINTS;
class Client {
  Auth = {
    Signup: (payload: any) => HttpClient.post(REGISTER, payload),
    Login: (payload: ILoginRequest) => HttpClient.post(LOGIN, payload),
    updateProfile: (payload: any) => HttpClient.post(UPDATE_PROFILE, payload),
    forgotPassword: (payload: any) =>
      HttpClient.post("/auth/forgot-password", payload),
    resetPassword: (payload: any) =>
      HttpClient.post("/auth/reset-password", payload),
  };
  APP = {
    // Create user
    createUsers: (payload: any) => HttpClient.post("users", payload),

    // Update user by ID
    updateUser: (id: string, payload: any) =>
      HttpClient.patch(`users/${id}`, payload),

    // Change password for a user by ID
    changePassword: (id: string, payload: any) =>
      HttpClient.post(`users/${id}/password`, payload),

    // Delete user by ID
    deleteUser: (id: string) => HttpClient.delete(`users/${id}`),

    // Get user list
    getUsers: (
      page = 1,
      pageSize = 10,
      sortBy = "createdAt",
      sortOrder = "asc",
    ) =>
      HttpClient.get(
        `users?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      ),

    // Delete group by ID
    deleteGroup: (id: string) => HttpClient.delete(`groups/${id}`),

    // Create group
    createGroup: (payload: any) => HttpClient.post("groups", payload),
  };
}

const ClientInstance = new Client();
export default ClientInstance;
