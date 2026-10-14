export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/mailchimp-signup") {
      return handleMailchimpSignup(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleMailchimpSignup(request, env) {

  try {
    const data = await request.json();

    const firstName = String(data.first_name || "").trim();
    const email = String(data.email || "").trim();
    const phone = String(data.phone || "").trim();
    const quizResult = String(data.quiz_result || "Queensland").trim();
    const consent = String(data.consent || "no").toLowerCase() === "yes";
    const travelProfessional = String(data.travel_professional || "no").toLowerCase() === "yes";
    const abtaNumber = String(data.abta_number || "").trim();

    if (!email || !firstName) {
      return Response.json(
        { error: "Missing first name or email" },
        { status: 400 }
      );
    }

    if (travelProfessional && !abtaNumber) {
      return Response.json(
        { error: "ABTA number is required for travel professionals" },
        { status: 400 }
      );
    }

    const apiKey = env.MAILCHIMP_API_KEY;
    const server = env.MAILCHIMP_SERVER_PREFIX;
    const audienceId = env.MAILCHIMP_AUDIENCE_ID;

    if (!apiKey || !server || !audienceId) {
      return Response.json(
        { error: "Mailchimp environment variables are not configured" },
        { status: 500 }
      );
    }

    const subscriberHash = await md5(email.toLowerCase());
    const memberUrl = `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;

    const mergeFields = {
      FNAME: firstName
    };

    // These merge-field tags must exist in the Mailchimp audience before Mailchimp
    // will accept them. Adjust the tags here if Marketing uses different field names.
    if (phone) mergeFields.PHONE = phone;
    mergeFields.TRAVELPRO = travelProfessional ? "Yes" : "No";
    if (abtaNumber) mergeFields.ABTA = abtaNumber;
    mergeFields.QUIZRESULT = quizResult;

    const mailchimpResponse = await fetch(memberUrl, {
      method: "PUT",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email_address: email,
        status_if_new: consent ? "subscribed" : "pending",
        status: consent ? "subscribed" : undefined,
        merge_fields: mergeFields
      })
    });

    const mailchimpBody = await mailchimpResponse.text();

    if (!mailchimpResponse.ok) {
      return Response.json(
        { error: `Mailchimp request failed: ${mailchimpBody}` },
        { status: 502 }
      );
    }

    const tagUrl = `${memberUrl}/tags`;
    await fetch(tagUrl, {
      method: "POST",
      headers: {
        Authorization: `apikey ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tags: [
          { name: "Queensland Quiz", status: "active" },
          { name: `Queensland Quiz Result - ${quizResult}`, status: "active" },
          ...(travelProfessional
            ? [{ name: "Travel Professional", status: "active" }]
            : [])
        ]
      })
    });

    const sheetWebhook = env.GOOGLE_SHEET_WEBHOOK;

    if (sheetWebhook) {
      const sheetResponse = await fetch(sheetWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          email,
          phone,
          result: quizResult,
          q1: data.q1 || "",
          q2: data.q2 || "",
          q3: data.q3 || "",
          q4: data.q4 || "",
          q5: data.q5 || "",
          q6: data.q6 || "",
          q7: data.q7 || "",
          q8: data.q8 || "",
          consent: consent ? "Yes" : "No",
          travelProfessional: travelProfessional ? "Yes" : "No",
          abtaNumber
        })
      });

      if (!sheetResponse.ok) {
        console.log("Google Sheet webhook failed:", sheetResponse.status, await sheetResponse.text());
      }
    }

    return Response.json({
      success: true,
      quizResult,
      subscribedToMarketing: consent
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

function md5(input) {
  function cmn(q, a, b, x, s, t) {
    a = (((a + q) | 0) + ((x + t) | 0)) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a,b,c,d,x,s,t){ return cmn((b & c) | (~b & d),a,b,x,s,t); }
  function gg(a,b,c,d,x,s,t){ return cmn((b & d) | (c & ~d),a,b,x,s,t); }
  function hh(a,b,c,d,x,s,t){ return cmn(b ^ c ^ d,a,b,x,s,t); }
  function ii(a,b,c,d,x,s,t){ return cmn(c ^ (b | ~d),a,b,x,s,t); }

  const utf8 = unescape(encodeURIComponent(input));
  const n = utf8.length;
  const words = [];
  for (let i = 0; i < n; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (utf8.charCodeAt(i) << ((i % 4) * 8));
  }
  words[n >> 2] = (words[n >> 2] || 0) | (0x80 << ((n % 4) * 8));
  words[(((n + 8) >> 6) + 1) * 16 - 2] = n * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;

  for (let i = 0; i < words.length; i += 16) {
    const oa=a, ob=b, oc=c, od=d;
    a=ff(a,b,c,d,words[i]||0,7,-680876936); d=ff(d,a,b,c,words[i+1]||0,12,-389564586);
    c=ff(c,d,a,b,words[i+2]||0,17,606105819); b=ff(b,c,d,a,words[i+3]||0,22,-1044525330);
    a=ff(a,b,c,d,words[i+4]||0,7,-176418897); d=ff(d,a,b,c,words[i+5]||0,12,1200080426);
    c=ff(c,d,a,b,words[i+6]||0,17,-1473231341); b=ff(b,c,d,a,words[i+7]||0,22,-45705983);
    a=ff(a,b,c,d,words[i+8]||0,7,1770035416); d=ff(d,a,b,c,words[i+9]||0,12,-1958414417);
    c=ff(c,d,a,b,words[i+10]||0,17,-42063); b=ff(b,c,d,a,words[i+11]||0,22,-1990404162);
    a=ff(a,b,c,d,words[i+12]||0,7,1804603682); d=ff(d,a,b,c,words[i+13]||0,12,-40341101);
    c=ff(c,d,a,b,words[i+14]||0,17,-1502002290); b=ff(b,c,d,a,words[i+15]||0,22,1236535329);

    a=gg(a,b,c,d,words[i+1]||0,5,-165796510); d=gg(d,a,b,c,words[i+6]||0,9,-1069501632);
    c=gg(c,d,a,b,words[i+11]||0,14,643717713); b=gg(b,c,d,a,words[i]||0,20,-373897302);
    a=gg(a,b,c,d,words[i+5]||0,5,-701558691); d=gg(d,a,b,c,words[i+10]||0,9,38016083);
    c=gg(c,d,a,b,words[i+15]||0,14,-660478335); b=gg(b,c,d,a,words[i+4]||0,20,-405537848);
    a=gg(a,b,c,d,words[i+9]||0,5,568446438); d=gg(d,a,b,c,words[i+14]||0,9,-1019803690);
    c=gg(c,d,a,b,words[i+3]||0,14,-187363961); b=gg(b,c,d,a,words[i+8]||0,20,1163531501);
    a=gg(a,b,c,d,words[i+13]||0,5,-1444681467); d=gg(d,a,b,c,words[i+2]||0,9,-51403784);
    c=gg(c,d,a,b,words[i+7]||0,14,1735328473); b=gg(b,c,d,a,words[i+12]||0,20,-1926607734);

    a=hh(a,b,c,d,words[i+5]||0,4,-378558); d=hh(d,a,b,c,words[i+8]||0,11,-2022574463);
    c=hh(c,d,a,b,words[i+11]||0,16,1839030562); b=hh(b,c,d,a,words[i+14]||0,23,-35309556);
    a=hh(a,b,c,d,words[i+1]||0,4,-1530992060); d=hh(d,a,b,c,words[i+4]||0,11,1272893353);
    c=hh(c,d,a,b,words[i+7]||0,16,-155497632); b=hh(b,c,d,a,words[i+10]||0,23,-1094730640);
    a=hh(a,b,c,d,words[i+13]||0,4,681279174); d=hh(d,a,b,c,words[i]||0,11,-358537222);
    c=hh(c,d,a,b,words[i+3]||0,16,-722521979); b=hh(b,c,d,a,words[i+6]||0,23,76029189);
    a=hh(a,b,c,d,words[i+9]||0,4,-640364487); d=hh(d,a,b,c,words[i+12]||0,11,-421815835);
    c=hh(c,d,a,b,words[i+15]||0,16,530742520); b=hh(b,c,d,a,words[i+2]||0,23,-995338651);

    a=ii(a,b,c,d,words[i]||0,6,-198630844); d=ii(d,a,b,c,words[i+7]||0,10,1126891415);
    c=ii(c,d,a,b,words[i+14]||0,15,-1416354905); b=ii(b,c,d,a,words[i+5]||0,21,-57434055);
    a=ii(a,b,c,d,words[i+12]||0,6,1700485571); d=ii(d,a,b,c,words[i+3]||0,10,-1894986606);
    c=ii(c,d,a,b,words[i+10]||0,15,-1051523); b=ii(b,c,d,a,words[i+1]||0,21,-2054922799);
    a=ii(a,b,c,d,words[i+8]||0,6,1873313359); d=ii(d,a,b,c,words[i+15]||0,10,-30611744);
    c=ii(c,d,a,b,words[i+6]||0,15,-1560198380); b=ii(b,c,d,a,words[i+13]||0,21,1309151649);
    a=ii(a,b,c,d,words[i+4]||0,6,-145523070); d=ii(d,a,b,c,words[i+11]||0,10,-1120210379);
    c=ii(c,d,a,b,words[i+2]||0,15,718787259); b=ii(b,c,d,a,words[i+9]||0,21,-343485551);

    a=(a+oa)|0; b=(b+ob)|0; c=(c+oc)|0; d=(d+od)|0;
  }

  function hex(n){
    let s="";
    for(let i=0;i<4;i++) s += ((n >>> (i*8)) & 255).toString(16).padStart(2,"0");
    return s;
  }
  return hex(a)+hex(b)+hex(c)+hex(d);
}
