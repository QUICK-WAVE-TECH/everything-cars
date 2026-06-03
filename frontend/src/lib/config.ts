export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  appName: process.env.NEXT_PUBLIC_APP_NAME || "EverythingCars",
  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV === "development",
} as const;
