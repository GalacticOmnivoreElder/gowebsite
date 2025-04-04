const AUTH_TOKEN = process.env.authStoreKey || "auth-token";

const Token = {
  get: function () {
    if (typeof window !== "undefined") {
      return localStorage.getItem(AUTH_TOKEN);
    }
    return null;
  },

  set: function (token) {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_TOKEN, token);
    }
  },

  clear: function () {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN);
    }
  },
};

export default Token;
