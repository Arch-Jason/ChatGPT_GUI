export async function sendRequest(currentURL, model, apikey, chatMessages) {
    if(!currentURL.startsWith("https://")) {
        currentURL = "https://" + currentURL;
    }
    let payload = "";
    let reqURL = "";
    if(model === "dall-e-2" || model === "dall-e-3") {
        reqURL = currentURL + "/v1/images/generations";
        payload = JSON.stringify({
            "prompt": chatMessages[chatMessages.length - 1].content,
            "n": 1,
            "model":  model,
            "size": "1024x1792",
            "quality": "hd"
        });
    } else {
        reqURL = currentURL + "/v1/chat/completions";
        payload = JSON.stringify({
            "model": model,
            "messages": chatMessages
        });
    }

    const response = await fetch(reqURL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apikey}`,
            'Content-Type': 'application/json'
        },
        body:payload
    });
    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`Request failed: ${response.status} ${errorDetails}`);
    }
    let data = response.json();
    return data
}