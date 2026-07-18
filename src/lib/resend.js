import { Resend } from "resend";

let resend;

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  return resend;
}
