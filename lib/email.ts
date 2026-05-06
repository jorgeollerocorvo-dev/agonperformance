import { Resend } from "resend";
import { formatBookingTime } from "./timezone-utils";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const COACH_EMAIL = "jorge.ollero.corvo@gmail.com";
export const COACH_NAME = "Jorge Ollero";
export const COACH_PHONE = process.env.COACH_PHONE || "+34 XXX XXX XXX";
export const COACH_INSTAGRAM = process.env.COACH_INSTAGRAM || "@agoncoachjorge";

export async function sendWelcomeEmail(
  clientEmail: string,
  clientName: string
) {
  if (!resend) {
    console.warn("Resend API key not configured, skipping email");
    return { id: "mock" };
  }
  try {
    const result = await resend.emails.send({
      from: "noreply@agonperformance.com",
      to: clientEmail,
      subject: "Welcome to Agon Performance! 🎯",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E75B6; text-align: center;">Welcome to Agon Performance! 🎯</h2>

          <p style="color: #333; line-height: 1.6;">Hi ${clientName},</p>

          <p style="color: #333; line-height: 1.6;">
            Thank you for signing up with Agon Performance! We're excited to have you as part of our community.
          </p>

          <p style="color: #333; line-height: 1.6;">
            Your account is now active, and you can start exploring your personalized training program.
            Your coach, <strong>${COACH_NAME}</strong>, is ready to help you achieve your fitness goals.
          </p>

          <h3 style="color: #2E75B6; margin-top: 30px;">Get in Touch</h3>
          <p style="color: #666; background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <strong>Email:</strong> <a href="mailto:${COACH_EMAIL}" style="color: #2E75B6; text-decoration: none;">${COACH_EMAIL}</a><br>
            <strong>Phone:</strong> <a href="tel:${COACH_PHONE}" style="color: #2E75B6; text-decoration: none;">${COACH_PHONE}</a><br>
            <strong>Instagram:</strong> <a href="https://instagram.com/${COACH_INSTAGRAM.replace('@', '')}" style="color: #2E75B6; text-decoration: none;">${COACH_INSTAGRAM}</a>
          </p>

          <p style="color: #666; margin-top: 30px; font-size: 14px;">
            If you have any questions or need support, don't hesitate to reach out. We're here to help!
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated message from Agon Performance. Please do not reply to this email.
          </p>
        </div>
      `,
    });
    return result;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    throw error;
  }
}

export async function sendNewClientNotification(
  clientName: string,
  clientEmail: string,
  clientPhone?: string,
  source?: string
) {
  if (!resend) {
    console.warn("Resend API key not configured, skipping email");
    return { id: "mock" };
  }
  try {
    const result = await resend.emails.send({
      from: "noreply@agonperformance.com",
      to: COACH_EMAIL,
      subject: `New Client Signup: ${clientName} 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E75B6;">New Client Signup!</h2>

          <p style="color: #333; line-height: 1.6;">
            A new client has signed up for Agon Performance:
          </p>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Name:</strong> ${clientName}</p>
            <p><strong>Email:</strong> <a href="mailto:${clientEmail}" style="color: #2E75B6; text-decoration: none;">${clientEmail}</a></p>
            ${clientPhone ? `<p><strong>Phone:</strong> <a href="tel:${clientPhone}" style="color: #2E75B6; text-decoration: none;">${clientPhone}</a></p>` : ""}
            ${source ? `<p><strong>Source:</strong> ${source}</p>` : ""}
            <p><strong>Signup Time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p style="color: #333;">
            The client can now log in to the platform and view their personalized program.
          </p>
        </div>
      `,
    });
    return result;
  } catch (error) {
    console.error("Failed to send new client notification:", error);
    throw error;
  }
}

export async function sendConsultationConfirmation(
  clientEmail: string,
  clientName: string,
  startTime: Date,
  googleMeetUrl?: string
) {
  if (!resend) {
    console.warn("Resend API key not configured, skipping email");
    return { id: "mock" };
  }
  try {
    const formattedTime = formatBookingTime(startTime);

    const result = await resend.emails.send({
      from: "noreply@agonperformance.com",
      to: clientEmail,
      subject: "Your Consultation is Booked! 🎯",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E75B6; text-align: center;">Your Consultation is Confirmed! ✅</h2>

          <p style="color: #333; line-height: 1.6;">Hi ${clientName},</p>

          <p style="color: #333; line-height: 1.6;">
            Thank you for booking a free consultation with Agon Performance! We're excited to learn about your fitness goals.
          </p>

          <div style="background: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="color: #155724; font-weight: bold; margin: 0 0 10px 0;">📅 Consultation Details</p>
            <p style="color: #155724; margin: 5px 0;"><strong>Date & Time:</strong> ${formattedTime}</p>
            <p style="color: #155724; margin: 5px 0;"><strong>Duration:</strong> 15-20 minutes</p>
            <p style="color: #155724; margin: 5px 0;"><strong>Format:</strong> Video Call (Google Meet)</p>
            ${googleMeetUrl ? `<p style="color: #155724; margin: 5px 0;"><strong><a href="${googleMeetUrl}" style="color: #155724; text-decoration: underline;">Join Video Call</a></strong></p>` : ""}
          </div>

          <p style="color: #333; line-height: 1.6;">
            During our consultation, ${COACH_NAME} will:
          </p>
          <ul style="color: #333; line-height: 1.8;">
            <li>Understand your fitness goals and current situation</li>
            <li>Discuss your training experience and any limitations</li>
            <li>Explain how Agon Performance can help you achieve your goals</li>
            <li>Answer any questions you may have</li>
          </ul>

          <p style="color: #666; margin-top: 30px;">
            <strong>Need to reschedule?</strong> Please contact us as soon as possible:
          </p>
          <p style="color: #666; background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <strong>Email:</strong> <a href="mailto:${COACH_EMAIL}" style="color: #2E75B6; text-decoration: none;">${COACH_EMAIL}</a><br>
            <strong>Phone:</strong> <a href="tel:${COACH_PHONE}" style="color: #2E75B6; text-decoration: none;">${COACH_PHONE}</a>
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated message from Agon Performance.
          </p>
        </div>
      `,
    });
    return result;
  } catch (error) {
    console.error("Failed to send consultation confirmation:", error);
    throw error;
  }
}

export async function sendConsultationNotificationToCoach(
  clientName: string,
  clientEmail: string,
  clientPhone: string | undefined,
  startTime: Date,
  googleMeetUrl?: string
) {
  if (!resend) {
    console.warn("Resend API key not configured, skipping email");
    return { id: "mock" };
  }
  try {
    const formattedTime = formatBookingTime(startTime);

    const result = await resend.emails.send({
      from: "noreply@agonperformance.com",
      to: COACH_EMAIL,
      subject: `New Consultation Booked: ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E75B6;">New Consultation Booking</h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Email:</strong> <a href="mailto:${clientEmail}" style="color: #2E75B6;">${clientEmail}</a></p>
            ${clientPhone ? `<p><strong>Phone:</strong> <a href="tel:${clientPhone}" style="color: #2E75B6;">${clientPhone}</a></p>` : ""}
            <p><strong>Consultation Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> 15-20 minutes</p>
            ${googleMeetUrl ? `<p><strong><a href="${googleMeetUrl}" style="color: #2E75B6; text-decoration: underline;">Join Google Meet</a></strong></p>` : ""}
          </div>

          <p style="color: #333;">
            The client will receive a confirmation email with the meeting details.
          </p>
        </div>
      `,
    });
    return result;
  } catch (error) {
    console.error("Failed to send consultation notification:", error);
    throw error;
  }
}
