// This is server-side code that runs on Netlify
exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the user's input from the request sent by the extension
    const { pinContent } = JSON.parse(event.body);

    if (!pinContent) {
      return { statusCode: 400, body: 'Bad Request: pinContent is required.' };
    }

    // --- SECURITY ---
    // Get the SECRET API key from Netlify's environment variables
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
      // This error will only show up in Netlify's logs, not to the user.
      return { statusCode: 500, body: 'Server error: API key not configured.' };
    }

    const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
    
    const userPrompt = `Generate a compelling Pinterest title and a detailed, SEO-friendly description for a pin about the following content: "${pinContent}". At the very end of the description, add a new line and then include 3 relevant hashtags.`;

    const requestBody = {
        model: "openrouter/auto", 
        messages: [
            { role: "system", content: "You are a helpful assistant that ONLY responds in a single, valid JSON object format. Your entire response must be a JSON object and nothing else. The JSON object must contain two keys: 'title' and 'description'." },
            { role: "user", content: userPrompt }
        ]
    };
    
    // Call the REAL OpenRouter API from the server
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`, // Add the secret key here
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("OpenRouter API Error:", errorBody);
        return { statusCode: response.status, body: `Upstream API Error: ${errorBody}` };
    }

    const data = await response.json();
    
    // Send the AI's response back to the Chrome extension
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allows your extension to call this function
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};