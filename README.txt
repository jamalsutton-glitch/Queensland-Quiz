Queensland Itinerary Recommendation Quiz

Open index.html to preview. Eight preference questions rank eight Marketing-supplied itinerary result categories; top three are shown. Buttons are above results.

IMPORTANT: The named results are itinerary CONCEPTS, not approved/bookable itinerary products. Add Marketing-approved itinerary links in destinations[].itineraryUrl when supplied.

Cloudflare: deploy index.html, favicon.png, worker.js and wrangler.toml using a separate project. Configure MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, MAILCHIMP_AUDIENCE_ID, optional GOOGLE_SHEET_WEBHOOK. Existing Mailchimp audience must have QUIZRESULT, TRAVELPRO, ABTA merge fields if using worker.js. Check Mailchimp automation trigger on Queensland Quiz Result - <result name>.

Netlify: the bundled legacy Netlify function is an alternative and needs Mailchimp credentials, a function route/rewrite for /api/mailchimp-signup, and updating to map result tags/consent before production use. Do not deploy it unreviewed.

Previewing locally does NOT send leads. Do not replace the live Canada quiz; deploy to a separate project.

The original six supplied right/wrong questions are not used: this version follows the original eight-itinerary recommendation brief.

PHOTO UPDATE: All eight Marketing-provided question photos are optimised in images/question-1.jpg to question-8.jpg. Question screens show their matching photos; landing uses photo 1 and results photo 8.


LEAD-FIRST FLOW UPDATE:
After Question 8, visitors see the Tell Me More lead form before any itinerary name
or result is displayed. On a successful /api/mailchimp-signup response, their top
three recommendations are revealed. On failure, the form stays visible for retry.
Retake Quiz remains available. Consent is a separate optional marketing opt-in.

LAUNCH WARNING: The lead form requires a deployed and configured backend. Opening
index.html locally or hosting it as static files without the API will NOT capture
leads or unlock results. Test a real submission and verify the Mailchimp audience,
consent status and automation before putting the URL in print.
