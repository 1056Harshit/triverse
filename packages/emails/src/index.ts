import * as React from "react";
import { render } from "react-email";
import OtpEmail, { type OtpEmailProps } from "../emails/otp.tsx";
import WelcomeEmail, { type WelcomeEmailProps } from "../emails/welcome.tsx";
import RideBookedEmail, { type RideBookedEmailProps } from "../emails/ride-booked.tsx";
import DriverVerifiedEmail, { type DriverVerifiedEmailProps } from "../emails/driver-verified.tsx";
import CampaignEmail, { type CampaignEmailProps } from "../emails/campaign.tsx";
import JoinedEmail, { type JoinedEmailProps } from "../emails/joined.tsx";
import SigninEmail, { type SigninEmailProps } from "../emails/signin.tsx";
import { SERVICES } from "@triverse/shared";

export type EmailTemplate =
  | { template: "otp"; props: OtpEmailProps }
  | { template: "welcome"; props: WelcomeEmailProps }
  | { template: "ride-booked"; props: RideBookedEmailProps }
  | { template: "driver-verified"; props: DriverVerifiedEmailProps }
  | { template: "campaign"; props: CampaignEmailProps }
  | { template: "joined"; props: JoinedEmailProps }
  | { template: "signin"; props: SigninEmailProps };

export interface RenderedEmail { subject: string; html: string; text: string }

export async function renderEmail(e: EmailTemplate): Promise<RenderedEmail> {
  const [subject, element] = build(e);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject, html, text };
}

function build(e: EmailTemplate): [string, React.ReactElement] {
  switch (e.template) {
    case "otp":
      return [`${e.props.code} is your PvtFrnd code`, React.createElement(OtpEmail, e.props)];
    case "welcome":
      return [`Welcome to PvtFrnd ${SERVICES[e.props.service].name}, ${e.props.name.split(" ")[0]}!`, React.createElement(WelcomeEmail, e.props)];
    case "ride-booked":
      return [`Booking ${e.props.bookingId}: ${e.props.from} → ${e.props.to}`, React.createElement(RideBookedEmail, e.props)];
    case "driver-verified":
      return [e.props.status === "verified" ? "You're a verified PvtFrnd driver 🏅" : "Action needed: driver verification", React.createElement(DriverVerifiedEmail, e.props)];
    case "campaign":
      return [e.props.headline, React.createElement(CampaignEmail, e.props)];
    case "joined":
      return [`Welcome to PvtFrnd${e.props.name ? `, ${e.props.name.split(" ")[0]}` : ""}! 🎉`, React.createElement(JoinedEmail, e.props)];
    case "signin":
      return [`Welcome back to PvtFrnd: new sign-in`, React.createElement(SigninEmail, e.props)];
  }
}

export type { JoinedEmailProps, SigninEmailProps, OtpEmailProps, WelcomeEmailProps, RideBookedEmailProps, DriverVerifiedEmailProps, CampaignEmailProps };
