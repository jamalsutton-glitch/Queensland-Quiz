const crypto = require("crypto");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);

    const firstName = data.first_name;
    const email = data.email;
    const quizResult = data.quiz_result || "Queensland";

    if (!email || !firstName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing first name or email" }),
      };
    }

    const apiKey = process.env.MAILCHIMP_API_KEY;
    const server = process.env.MAILCHIMP_SERVER_PREFIX;
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

    const subscriberHash = crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
    const memberUrl = `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;

    await fetch(memberUrl, {
      method: "PUT",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: "subscribed",
        merge_fields: { FNAME: firstName },
      }),
    });

    const tagUrl = `${memberUrl}/tags`;

    await fetch(tagUrl, {
      method: "POST",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tags: [{ name: "Queensland Quiz", status: "active" }],
      }),
    });

   const sheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK;

console.log("Google Sheet webhook exists:", !!sheetWebhook);

if (sheetWebhook) {
  const sheetResponse = await fetch(sheetWebhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName,
      email,
      result: quizResult,
      q1: data.q1 || "",
      q2: data.q2 || "",
      q3: data.q3 || "",
      q4: data.q4 || "",
      q5: data.q5 || "",
      q6: data.q6 || "",
      q7: data.q7 || "",
      consent: "Yes",
    }),
  });

  const sheetText = await sheetResponse.text();

  console.log("Google Sheet status:", sheetResponse.status);
  console.log("Google Sheet response:", sheetText);
}

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, quizResult }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
