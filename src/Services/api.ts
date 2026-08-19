import axios from "axios";

const api = axios.create({
  baseURL: "https://localhost:7070/api",
  withCredentials: true,
});

export default api;