import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

// Replace with your verified domain when ready (e.g. "notificaciones@artrider.com")
// For testing without a domain, you can use "onboarding@resend.dev"
// BUT "onboarding@resend.dev" ONLY ALLOWS sending emails to the email address registered in your Resend account.
export const RESEND_FROM_EMAIL = "onboarding@resend.dev";
