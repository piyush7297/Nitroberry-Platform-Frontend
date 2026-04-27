const D_PATH = "/dashboard";
const ADMIN_HOME = "/admin";
export enum RoutesEnum {
  DASHBOARD = D_PATH,
  REGISTER = "/register",
  LOGIN = "/login",
  NEW_PASSWORD = "/new-password",
  RESET_PASSWORD = "/reset-password",
  EMAIL_VERIFIED = "/email-verify",
  UPDATE_PROFILE = "/update-profile",
  TRAINER = "/trainer",
  CUSTOMER = "/customer",
  ADMIN = "/admin",
  SUBSCRIPTION_PLAN = `${D_PATH}/subscription-plan`,
  Profile_Aanalytics = `${D_PATH}/profile-analytics`,
  SETTINGS = `${D_PATH}/settings`,
  PrivacyPolicy = `/privacy-policy`,
  TermsAndConditions = `/terms-and-conditions`,
  FMS = `${D_PATH}/fms`,
}

export enum AdminRoutesEnum {
  ADMIN = ADMIN_HOME,
}

export enum ROLES {
  OWNER = 1, // 1
  ADMIN = 2, // 2
  MANAGER = 3, //3
  DOER = 4, // 4
  VIEWER = 5, // 5
}
export enum TaskStatusEnum {
  PENDING = 1,
  COMPLETED = 2,
  MISSED = 3,
  SCHEDULED = 4,
  BLOCK = 5,
}
