import { LoginDialog } from "./login-dialog";
import { RegisterDialog } from "./register-dialog";
import { DepositDialog } from "./deposit-dialog";

export function AuthDialogs() {
  return (
    <>
      <LoginDialog />
      <RegisterDialog />
      <DepositDialog />
    </>
  );
}
