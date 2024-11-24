export async function getModels(preURL, apikey) {
    if(!preURL.startsWith("https://")) {
        preURL = "https://" + preURL;
    }
    const reqString = preURL + "/v1/models";
    const response = await fetch(reqString, {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${apikey}`
        }
    });
    if (!response.ok) {
        const errorDetails = await response.text();
        throw new Error(`Request failed: ${response.status} ${errorDetails}`);
    }
    const data = await response.json();
    const models = [];
    for (const dict of data.data) {
        models.push(dict.id);
    }
    return models;
}