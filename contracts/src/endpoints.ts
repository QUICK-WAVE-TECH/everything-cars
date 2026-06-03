export const API = {
  auth: {
    signUp: { method: "POST", path: "/auth/sign-up" },
    signIn: { method: "POST", path: "/auth/sign-in" },
    verify: { method: "POST", path: "/auth/verify" },
    refresh: { method: "POST", path: "/auth/refresh" },
    signOut: { method: "POST", path: "/auth/sign-out" },
    pushStatus: { method: "GET", path: "/auth/push-status/:challengeId" },
  },
  listings: {
    list: { method: "GET", path: "/listings" },
    get: { method: "GET", path: "/listings/:id" },
    create: { method: "POST", path: "/listings" },
    update: { method: "PATCH", path: "/listings/:id" },
    delete: { method: "DELETE", path: "/listings/:id" },
    myListings: { method: "GET", path: "/listings/mine" },
  },
  requests: {
    list: { method: "GET", path: "/requests" },
    get: { method: "GET", path: "/requests/:id" },
    create: { method: "POST", path: "/requests" },
    updateStatus: { method: "PATCH", path: "/requests/:id/status" },
    cancel: { method: "POST", path: "/requests/:id/cancel" },
  },
  payments: {
    createIntent: { method: "POST", path: "/payments/intent" },
    confirm: { method: "POST", path: "/payments/:id/confirm" },
    transactions: { method: "GET", path: "/payments/transactions" },
    transaction: { method: "GET", path: "/payments/transactions/:id" },
  },
  users: {
    me: { method: "GET", path: "/users/me" },
    update: { method: "PATCH", path: "/users/me" },
    profile: { method: "GET", path: "/users/:id" },
  },
} as const;
