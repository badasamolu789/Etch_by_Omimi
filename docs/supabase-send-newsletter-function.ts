// Supabase Edge Function: send-newsletter
// Deploy with: supabase functions deploy send-newsletter
// This function handles sending newsletters via email providers

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "https://cdn.jsdelivr.net/npm/resend@latest/+esm"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

interface NewsletterRequest {
    subject: string
    message: string
    fromName: string
    recipients: string[]
}

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const body: NewsletterRequest = await req.json()

        // Validate required fields
        if (!body.subject || !body.message || !body.recipients || body.recipients.length === 0) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: subject, message, recipients" }),
                { status: 400, headers: corsHeaders }
            )
        }

        // Send newsletter using Resend
        const results = await Promise.all(
            body.recipients.map((email) =>
                resend.emails.send({
                    from: `${body.fromName} <onboarding@resend.dev>`, // Use Resend's verified domain for testing
                    to: email,
                    subject: body.subject,
                    html: body.message,
                })
            )
        )

        // Count successful sends
        const successful = results.filter((r) => r.data).length
        const failed = results.filter((r) => r.error).length

        return new Response(
            JSON.stringify({
                success: true,
                sent: successful,
                failed: failed,
                total: body.recipients.length,
                message: `Newsletter sent to ${successful} recipients${failed > 0 ? `, ${failed} failed` : ""}`,
            }),
            { status: 200, headers: corsHeaders }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: error.message || "Failed to send newsletter",
                success: false,
            }),
            { status: 500, headers: corsHeaders }
        )
    }
})

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}
