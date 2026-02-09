export const API_ROUTES = {
  auth: {
    register: "/registration",
    login: "/login",
    activate: "/activation",
    checkToken: "/check-token",
    refreshToken: "/tokenref",
  },
  app: {
    getApp: "/get-app",
    getAppData: "/get-app-data",
    updateDefects: "/save-defects",
    uploadPDF: "/upload-pdf",
    rephraseDefectsBlock: "/rephrase-defects-block",
  },
  users: {
    getUserData: "/userdata",
    getAllUsers: "/allusersdata",
    updateFio: "/savefio",
    changePermissions: "/change-permissions",
    changeAccount: "/change-account",
    deactivateAccount: "/deactivate-account",
  },
  config: {
    changeFunctions: "/change-functions",
    getAiSettings: "/ai-settings",
    updateAiSettings: "/ai-settings",
  },
  system: {
    checkResponse: "/check-response-from-server",
    getScripts: "/get-scripts",
  },
};
