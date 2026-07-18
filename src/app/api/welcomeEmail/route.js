import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";

export async function POST(request) {
  try {
    const { name, email, username } = await request.json();

    console.log("=== WELCOME EMAIL API CALLED ===");
    console.log("Request data:", { name, email, username });
    console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
    console.log(
      "RESEND_API_KEY length:",
      process.env.RESEND_API_KEY?.length || 0
    );

    // Create professional HTML email template
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Galactic Omnivore</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1a1a1a;
            border: 2px solid #CA2280;
        }
        .header {
            background: linear-gradient(135deg, #CA2280 0%, #9d1a66 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .tagline {
            font-size: 16px;
            color: #f0f0f0;
            margin: 0;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-title {
            font-size: 28px;
            font-weight: bold;
            color: #CA2280;
            margin-bottom: 20px;
            text-align: center;
        }
        .username {
            color: #CA2280;
            font-weight: bold;
        }
        .message {
            font-size: 16px;
            margin-bottom: 30px;
            color: #e0e0e0;
        }
        .features {
            background-color: #2a2a2a;
            border: 1px solid #CA2280;
            padding: 25px;
            margin: 30px 0;
        }
        .features h3 {
            color: #CA2280;
            font-size: 20px;
            margin-bottom: 15px;
            text-align: center;
        }
        .feature-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .feature-list li {
            padding: 8px 0;
            border-bottom: 1px solid #3a3a3a;
            color: #e0e0e0;
        }
        .feature-list li:last-child {
            border-bottom: none;
        }
        .feature-list li:before {
            content: "▶";
            color: #CA2280;
            margin-right: 10px;
        }
        .cta-section {
            text-align: center;
            margin: 40px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #CA2280 0%, #9d1a66 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 15px 30px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            border: 2px solid #CA2280;
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            background: #ffffff;
            color: #CA2280;
        }
        .footer {
            background-color: #0a0a0a;
            padding: 30px 20px;
            text-align: center;
            border-top: 2px solid #CA2280;
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            color: #CA2280;
            text-decoration: none;
            margin: 0 10px;
            font-weight: bold;
        }
        .footer-text {
            font-size: 14px;
            color: #888;
            margin: 10px 0;
        }
        .pixel-border {
            border: 2px solid #CA2280;
            background-color: #1a1a1a;
            padding: 20px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Galactic Omnivore</div>
            <p class="tagline">The Ultimate Game Dev Community in Macedonia</p>
        </div>
        
        <div class="content">
            <h1 class="welcome-title">🎮 Welcome to the Galaxy! 🚀</h1>
            
            <div class="message">
                <p>Hey <span class="username">${username || name}</span>,</p>
                
                <p>Welcome to <strong>Galactic Omnivore</strong> - Macedonia's premier game development community! We're absolutely thrilled to have you join our cosmic family of creators, innovators, and gaming enthusiasts.</p>
                
                <p>You've just taken the first step into a universe where creativity meets collaboration, and where your game development dreams can become reality.</p>
            </div>
            
            <div class="features">
                <h3>🌟 What Awaits You</h3>
                <ul class="feature-list">
                    <li>Connect with fellow game developers and form your dream team</li>
                    <li>Access exclusive resources, tutorials, and industry insights</li>
                    <li>Participate in game jams, challenges, and community events</li>
                    <li>Showcase your projects and get valuable feedback</li>
                    <li>Learn from experienced developers and mentors</li>
                    <li>Join our Discord community for real-time collaboration</li>
                </ul>
            </div>
            
            <div class="cta-section">
                <a href="https://galacticomnivore.com/dashboard" class="cta-button">
                    Explore Your Dashboard
                </a>
            </div>
            
            <div class="pixel-border">
                <p style="margin: 0; text-align: center; color: #CA2280; font-weight: bold;">
                    🎯 Pro Tip: Complete your profile and introduce yourself in our Discord to get the most out of your membership!
                </p>
            </div>
            
            <div class="message">
                <p>Ready to start your galactic journey? Your adventure in game development begins now!</p>
                
                <p>If you have any questions or need assistance, don't hesitate to reach out to our community team.</p>
                
                <p style="margin-top: 30px;">
                    <strong>Welcome aboard, space traveler!</strong><br>
                    The Galactic Omnivore Team 🌌
                </p>
            </div>
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="https://discord.gg/ZbSShxu6K4">Discord</a> |
                <a href="https://www.facebook.com/profile.php?id=100088917386120">Facebook</a> |
                <a href="https://twitter.com/GalacticOmnivor">Twitter</a> |
                <a href="https://www.instagram.com/galacticomnivore/">Instagram</a> |
                <a href="https://www.youtube.com/@galacticomnivore">YouTube</a>
            </div>
            <p class="footer-text">
                Galactic Omnivore - Macedonia's Game Dev Community<br>
                <a href="https://galacticomnivore.com" style="color: #CA2280;">galacticomnivore.com</a>
            </p>
            <p class="footer-text">
                You're receiving this email because you signed up for Galactic Omnivore.<br>
                <a href="#" style="color: #888; font-size: 12px;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;

    // Create plain text version
    const textContent = `
Welcome to Galactic Omnivore!

Hey ${username || name},

Welcome to Galactic Omnivore - Macedonia's premier game development community! We're absolutely thrilled to have you join our cosmic family of creators, innovators, and gaming enthusiasts.

You've just taken the first step into a universe where creativity meets collaboration, and where your game development dreams can become reality.

What Awaits You:
• Connect with fellow game developers and form your dream team
• Access exclusive resources, tutorials, and industry insights
• Participate in game jams, challenges, and community events
• Showcase your projects and get valuable feedback
• Learn from experienced developers and mentors
• Join our Discord community for real-time collaboration

Ready to start your galactic journey? Visit your dashboard at: https://galacticomnivore.com/dashboard

Pro Tip: Complete your profile and introduce yourself in our Discord to get the most out of your membership!

If you have any questions or need assistance, don't hesitate to reach out to our community team.

Welcome aboard, space traveler!
The Galactic Omnivore Team

---
Galactic Omnivore - Macedonia's Game Dev Community
galacticomnivore.com

Join our Discord: https://discord.gg/ZbSShxu6K4
    `;

    // Send email
    console.log("=== SENDING EMAIL ===");
    console.log("Email config:", {
      from: "galacticomnivore@galacticomnivore.com",
      to: email,
      subject:
        "🎮 Welcome to Galactic Omnivore - Your Game Dev Journey Begins!",
      hasHtml: !!htmlContent,
      hasText: !!textContent,
      htmlLength: htmlContent.length,
      textLength: textContent.length,
    });

    const emailResult = await getResend().emails.send({
      from: "galacticomnivore@galacticomnivore.com",
      to: email,
      subject:
        "🎮 Welcome to Galactic Omnivore - Your Game Dev Journey Begins!",
      html: htmlContent,
      text: textContent,
    });

    console.log("=== RESEND API RESPONSE ===");
    console.log("Full response:", JSON.stringify(emailResult, null, 2));
    console.log("Email ID:", emailResult.data?.id);
    console.log("Success:", !!emailResult.data?.id);

    return NextResponse.json({
      success: true,
      emailId: emailResult.data?.id,
      resendResponse: emailResult,
    });
  } catch (error) {
    console.error("=== ERROR SENDING WELCOME EMAIL ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error object:", JSON.stringify(error, null, 2));

    return NextResponse.json(
      {
        error: "Failed to send welcome email",
        details: error.message,
        type: error.constructor.name,
      },
      { status: 500 }
    );
  }
}
