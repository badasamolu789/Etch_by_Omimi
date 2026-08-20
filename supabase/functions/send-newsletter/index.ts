import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://cdn.jsdelivr.net/npm/resend@latest/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");

if (!resendApiKey) {
  console.error("RESEND_API_KEY is not configured");
}

const resend = new Resend(resendApiKey);

interface NewsletterRequest {
  subject: string;
  message: string;
  fromName?: string;
  recipients: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY is not configured on the server",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body: NewsletterRequest = await req.json();

    if (
      !body.subject ||
      !body.message ||
      !Array.isArray(body.recipients) ||
      body.recipients.length === 0
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Missing required fields: subject, message, and recipients",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const fromName = body.fromName || "ETCH Newsletter";

    const results = await Promise.all(
      body.recipients.map(async (email) => {
        try {
          const result = await resend.emails.send({
            from: `${fromName} <newsletter@etchbyomimi.com>`,
            to: email,
            subject: body.subject,
            html: body.message,
          });

          return {
            email,
            success: !!result.data,
            error: result.error || null,
          };
        } catch (error) {
          return {
            email,
            success: false,
            error: error instanceof Error
              ? error.message
              : "Unknown error",
          };
        }
      })
    );

    const successful = results.filter((result) => result.success);
    const failed = results.filter((result) => !result.success);

    return new Response(
      JSON.stringify({
        success: failed.length === 0,
        sent: successful.length,
        failed: failed.length,
        total: body.recipients.length,
        failures: failed,
        message:
          failed.length === 0
            ? `Newsletter sent successfully to ${successful.length} recipients`
            : `Newsletter sent to ${successful.length} recipients, ${failed.length} failed`,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Newsletter error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send newsletter",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});