import type { AuthCustomer } from "./auth.types.js";

export function serializeAuthCustomer(customer: AuthCustomer) {
  return {
    id: customer.id.toString(),
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    avatarUrl: customer.avatarUrl,
  };
}
