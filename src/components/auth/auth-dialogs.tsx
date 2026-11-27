import { LoginDialog } from "./login-dialog";
import { RegisterDialog } from "./register-dialog";
import { DepositDialog } from "./deposit-dialog";
import { IdentityDialog } from "./identity-dialog";
import { PlayGuard } from "@/components/account/play-guard";

export function AuthDialogs() {
  return (
    <>
      <LoginDialog />
      <RegisterDialog />
      <DepositDialog />
      <IdentityDialog />
      <PlayGuard />
    </>
  );
}
