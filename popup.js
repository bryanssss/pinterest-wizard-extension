document.addEventListener('DOMContentLoaded', function () {
    // Get references to all the HTML elements
    const generateContainer = document.getElementById('generate-container');
    const resultsContainer = document.getElementById('results-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    const generateButton = document.getElementById('generate-button');
    const pinContentInput = document.getElementById('pin-content-input');
    
    const generatedTitle = document.getElementById('generated-title');
    const generatedDescription = document.getElementById('generated-description');
    
    const copyTitleButton = document.getElementById('copy-title-button');
    const copyDescriptionButton = document.getElementById('copy-description-button');
    const clearButton = document.getElementById('clear-button');

    // When the popup opens, check if there are saved results
    chrome.storage.local.get(['savedTitle', 'savedDescription'], (result) => {
        if (result.savedTitle && result.savedDescription) {
            displayResults(result.savedTitle, result.savedDescription);
        }
    });

    // Main function to display results and hide the input form
    function displayResults(title, description) {
        generatedTitle.textContent = title;
        generatedDescription.textContent = description;
        generateContainer.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
    }

    // Event listener for the "Generate" button
    generateButton.addEventListener('click', async () => {
        const pinContent = pinContentInput.value;
        if (!pinContent.trim()) {
            alert('Please enter some content for your pin!');
            return;
        }

        generateContainer.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
        generateButton.disabled = true;

        try {
            const responseData = await callAI(pinContent);
            displayResults(responseData.title, responseData.description);
            chrome.storage.local.set({
                savedTitle: responseData.title,
                savedDescription: responseData.description
            });
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to generate content. The AI model might be busy or unavailable. Please try again in a moment.');
            generateContainer.classList.remove('hidden');
            loadingIndicator.classList.add('hidden');
        } finally {
            generateButton.disabled = false;
        }
    });

    // Event listener for the "Copy Title" button
    copyTitleButton.addEventListener('click', () => {
        navigator.clipboard.writeText(generatedTitle.textContent);
        copyTitleButton.textContent = 'Copied!';
        setTimeout(() => { copyTitleButton.textContent = 'Copy'; }, 1000);
    });

    // Event listener for the "Copy Description" button
    copyDescriptionButton.addEventListener('click', () => {
        navigator.clipboard.writeText(generatedDescription.textContent);
        copyDescriptionButton.textContent = 'Copied!';
        setTimeout(() => { copyDescriptionButton.textContent = 'Copy'; }, 1000);
    });

    // Event listener for the "Clear" button
    clearButton.addEventListener('click', () => {
        pinContentInput.value = '';
        resultsContainer.classList.add('hidden');
        generateContainer.classList.remove('hidden');
        chrome.storage.local.remove(['savedTitle', 'savedDescription']);
    });
});

async function callAI(pinContent) {
    // ⚠️ IMPORTANT: Replace this with your REAL Netlify function URL after deployment
    const API_ENDPOINT = 'https://YOUR_NETLIFY_SITE_NAME.netlify.app/api/generate'; 

    // The API key is GONE from the extension. It's now secure!
    
    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        // No Authorization header needed here!
        headers: {
            'Content-Type': 'application/json'
        },
        // We only send the user's content
        body: JSON.stringify({ pinContent: pinContent })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();

    // The rest of the parsing logic remains the same
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
        console.error("Invalid response structure from AI:", data);
        throw new Error("AI response was in an unexpected format.");
    }
    
    try {
        const rawResponse = data.choices[0].message.content;
        const match = rawResponse.match(/{[\s\S]*}/);

        if (!match) {
            console.error("No JSON object found in AI response:", rawResponse);
            throw new Error("The AI did not return a valid JSON object.");
        }
        
        return JSON.parse(match[0]);
    } catch (e) {
        console.error("Failed to parse the extracted JSON. Raw AI response was:", data.choices[0].message.content);
        throw new Error("The AI returned an invalid format.");
    }
}