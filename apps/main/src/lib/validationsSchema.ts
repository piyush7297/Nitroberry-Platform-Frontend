import * as Yup from "yup";

export const loginSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address.")
    .required("Email address is required."),
  password: Yup.string().required("Password is required."),
});

export const registerSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address.")
    .required("Email address is required."),

  firstName: Yup.string().required("FirstName is required."),

  password: Yup.string()
    .min(6, "Password must be at least 6 characters long.")
    .required("Password is required."),

  terms: Yup.boolean().oneOf(
    [true],
    "You must agree to the terms and conditions before proceeding.",
  ),
});

// Example validation schemas
export const validationSchemas: Record<string, any> = {
  createUser: Yup.object().shape({
    firstName: Yup.string().required("First Name is required"),
    lastName: Yup.string().required("Last Name is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    password: Yup.string()
      .min(6, "Password must be at least 6 chars")
      .required("Password is required"),
    roleId: Yup.number().required("Role is required"),
    locationId: Yup.number().required("Location is required"),
  }),
  editUser: Yup.object().shape({
    firstName: Yup.string().required("First Name is required"),
    lastName: Yup.string().required("Last Name is required"),
    // email: Yup.string().email("Invalid email").required("Email is required"),
    // roleId: Yup.number().required("Role is required"),
  }),
  changePassword: Yup.object().shape({
    password: Yup.string()
      .min(6, "Min 6 chars")
      .required("New Password is required"),
    confirmPassword: Yup.string()
      .required("Confirm Password is required")
      .oneOf([Yup.ref("password"), ""], "Passwords must match"),
  }),
  createGroup: Yup.object().shape({
    name: Yup.string().required("Group Name is required"),
    description: Yup.string().required("Description is required"),
    userIds: Yup.array()
      .of(Yup.mixed())
      .min(1, "Select at least one member")
      .required("Select at least one member"),
  }),
  // editGroup: Yup.object().shape({
  //   groupName: Yup.string().required("Group Name is required"),
  //   description: Yup.string().required("Description is required"),
  // }),
};
