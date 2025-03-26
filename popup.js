// Get the buttons and input field
const copyButton = document.getElementById('copy');
const pasteButton = document.getElementById('paste');
const clearButton = document.getElementById('clear');
const clearStorageButton = document.getElementById('clearStorage');
const importSacsNgnButton = document.getElementById('importSacsNgn');
const checkEntitlementButton = document.getElementById('checkEntitlement');
const sacsNgnInput = document.getElementById('sacsNgnInput');

// Provide visual feedback for button clicks
function buttonFeedback(button) {
    const originalBackgroundColor = button.style.backgroundColor;
    button.style.backgroundColor = '#4CAF50';
    setTimeout(() => {
        button.style.backgroundColor = originalBackgroundColor;
    }, 500);
}

// Show a popup with copied cookies
function showCookiePopup(acs_ngn_value, cpn_value) {
    alert(`Cookies copied!\n\nCPN:\n${cpn_value}\n\nACS_NGN:\n ${acs_ngn_value}`);
}

// Get cookies from the content script
function getCookies(tabId, callback) {
    chrome.tabs.sendMessage(tabId, {action: 'getCookies'}, callback);
}

async function handleCopy() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const cookieValues = await new Promise((resolve) => getCookies(tab.id, resolve));

        if (cookieValues.acs_ngn && cookieValues.cpn) {
            // Store cookies in chrome.storage.local
            await chrome.storage.local.set({
                acs_ngn: cookieValues.acs_ngn,
                cpn: cookieValues.cpn
            });

            // Log the cookies being stored
            console.log("Cookies stored in chrome.storage.local:");
            console.log("acs_ngn:", cookieValues.acs_ngn);
            console.log("cpn:", cookieValues.cpn);

            // Show the popup with copied cookies
            showCookiePopup(cookieValues.acs_ngn, cookieValues.cpn);
            buttonFeedback(copyButton);
        } else {
            alert('Cookies not found! Make sure acs_ngn and cpn cookies are present.');
        }
    } catch (error) {
        console.error(error);
        alert('Error while copying cookies:', error.message);
    }
}

async function handleCheckEntitlement() {
    const checkButton = document.getElementById('checkEntitlement');
    buttonFeedback(checkButton);

    try {
        const checkboxes = document.querySelectorAll('.env-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('Please select at least one environment');
            return;
        }

        // *** VERSION 36 - USER INSTRUCTION ALERT - IMPORTANT! (KEPT in Final Version) ***
        alert("For best results, click 'Copy Cookie' button first before 'Check Entitlement'."); // VERSION 36 - User instruction alert (KEPT)
        // *** END VERSION 36 - USER INSTRUCTION ALERT (KEPT) ***

        // Get cookies from chrome.storage.local
        const { acs_ngn: acs_ngn_value } = await chrome.storage.local.get('acs_ngn'); // VERSION 57 - Get acs_ngn from chrome.storage.local (KEPT)
        if (!acs_ngn_value) { // VERSION 57 - Check only for acs_ngn (KEPT)
            alert('Required cookie not found (acs_ngn). Please copy cookies first.'); // VERSION 57 - Updated alert message (KEPT)
            return;
        }

        const results = [];
        for (const checkbox of checkboxes) {
            const url = checkbox.dataset.url;
            const envName = checkbox.parentElement.textContent.trim(); // VERSION 41 - Fixed envName extraction (KEPT)
            const domain = new URL(url).hostname;

            // *** VERSION 40 - CORRECTED ENVIRONMENT SELECTION LOGIC (KEPT) ***
            console.log(`${envName} Environment Selected. Setting targetDomainForCookies to: ${domain} and currentApiDomainURL to: ${url}`); // VERSION 40 - Corrected Log (KEPT)
            // *** END VERSION 40 - CORRECTED ENVIRONMENT SELECTION LOGIC (KEPT) ***

            // *** VERSION 57 - SET COOKIE WITH FULL URL AND EXPLICIT DOMAIN (KEPT) ***
            console.log("Attempting to set acs_ngn cookie programmatically for Entitlement Check..."); // VERSION 57 - Updated Log Message (KEPT)
            await chrome.cookies.set({
                url: `https://${domain}`, // VERSION 57 - Use full URL for cookie setting (KEPT)
                name: 'acs_ngn',
                value: acs_ngn_value,
                domain: domain, // VERSION 57 - Use exact domain (KEPT)
                path: '/', // VERSION 57 - Explicitly set path (KEPT)
                secure: true,
                httpOnly: true
            });
            console.log("acs_ngn cookie set programmatically for Entitlement Check."); // VERSION 57 - Updated Log Message (KEPT)

            // *** VERSION 57 - INCREASE DELAY TO 2000ms FOR PROD (KEPT) ***
            const delayMilliseconds = envName === "Prod" ? 2000 : 500; // VERSION 57 - Longer delay for PROD (KEPT)
            console.log(`VERSION 57: Delaying fetch by ${delayMilliseconds}ms...`); // VERSION 57 - Log message (KEPT)
            await new Promise(resolve => setTimeout(resolve, delayMilliseconds)); // Introduce delay
            console.log("VERSION 57: Delay completed. Proceeding with fetch."); // VERSION 57 - Log message (KEPT)
            // *** END VERSION 57 - INCREASE DELAY TO 2000ms FOR PROD (KEPT) ***

            const fetchOptions = { // Define fetch options to match curl request
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `acs_ngn=${acs_ngn_value}` // VERSION 57 - Use exact cookie format (KEPT)
                },
                body: JSON.stringify({
                    query: `query User {
                        user {
                            email
                            subscriptions {
                                isActive
                                packName
                            }
                        }
                    }`
                })
            };

            // *** VERSION 57 - LOG REQUEST DETAILS (KEPT) ***
            console.log("Request URL:", url); // VERSION 57 - Log request URL (KEPT)
            console.log("Request Headers:", fetchOptions.headers); // VERSION 57 - Log request headers (KEPT)
            console.log("Request Body:", fetchOptions.body); // VERSION 57 - Log request body (KEPT)

            const response = await fetch(url, fetchOptions);
            const responseText = await response.text();

            // *** VERSION 57 - LOG RESPONSE DETAILS (KEPT) ***
            console.log("Response Status:", response.status); // VERSION 57 - Log response status (KEPT)
            console.log("Response Text:", responseText); // VERSION 57 - Log response text (KEPT)

            try {
                const data = JSON.parse(responseText);
                if (data.errors) {
                    results.push(
                        `${url}\n` +
                        `Cookies sent: acs_ngn=${acs_ngn_value}\n` + // VERSION 57 - Updated log message (KEPT)
                        `Status: ${response.status}\n` +
                        `Error: ${data.errors[0].message}`
                    );
                    continue;
                }

                if (data.data?.user) {
                    const user = data.data.user;
                    const subs = user.subscriptions?.map(sub =>
                        `• ${sub.packName} (${sub.isActive ? 'Active' : 'Inactive'})`
                    ).join('\n') || 'No subscriptions';

                    results.push(
                        `Environment: ${envName}\n\n` +
                        `Email: ${user.email}\n\n` +
                        `Subscriptions:\n\n${subs}\n\n`
                    );
                }
            } catch (parseError) {
                results.push(
                    `${url}\n` +
                    `Status: ${response.status}\n` +
                    `Raw Response: ${responseText}\n` +
                    `Parse Error: ${parseError.message}`
                );
            }
        }

        alert(results.join('\n'));

    } catch (error) {
        console.error('Entitlement check failed:', error);
        alert(`Error checking entitlements: ${error.message}`);
    }
}

// Handle cookie pasting
async function handlePaste() {
    try {
        // Get acs_ngn from chrome.storage.local instead of localStorage
        const { acs_ngn: acs_ngn_value } = await chrome.storage.local.get('acs_ngn');
        
        if (acs_ngn_value) {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            const {url} = tab;
            const domain = new URL(url).hostname;
            
            const newCookie = {
                url: url,
                name: 'acs_ngn',
                value: acs_ngn_value,
                path: '/',
                domain: domain,
                secure: true
            };
            
            console.log('Attempting to set cookie:', newCookie);
            
            const cookie = await new Promise((resolve) => chrome.cookies.set(newCookie, resolve));

            if (cookie) {
                alert('Cookie pasted!');
                buttonFeedback(pasteButton);
                chrome.tabs.reload(tab.id);
            } else {
                alert('Failed to paste cookie!');
                console.error('Failed to set cookie:', chrome.runtime.lastError);
            }
        } else {
            alert('No cookie found! Please copy cookies first.');
        }
    } catch (error) {
        console.error('Error while pasting cookies:', error);
        alert('Error while pasting cookies: ' + error.message);
    }
}

// Handle cookie clearing
async function handleClear() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        const url = new URL(tab.url);

        // Function to remove a cookie by name
        async function removeCookieByName(name) {
            const cookie = await new Promise((resolve) => chrome.cookies.get({url: tab.url, name}, resolve));
            if (cookie) {
                await new Promise((resolve) => chrome.cookies.remove({
                    url: url.protocol + "//" + url.hostname + cookie.path,
                    name: cookie.name
                }, resolve));
                console.log(`${name} cookie deleted!`);
            } else {
                console.log(`${name} cookie not found for this domain!`);
            }
        }

        // Remove both acs_ngn and sacs_ngn cookies
        await removeCookieByName('acs_ngn');
        await removeCookieByName('sacs_ngn');

        alert('acs_ngn and sacs_ngn cookies deleted!');
        buttonFeedback(clearButton);
        chrome.tabs.reload(tab.id);
    } catch (error) {
        console.error(error);
        alert('Error while clearing cookies:', error.message);
    }
}

// Handle storage clearing
async function handleClearStorage() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

        // Clear local and session storage
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            function: () => {
                localStorage.clear();
                sessionStorage.clear();
            }
        }).then(() => {
            alert('Storage cleared!');
            buttonFeedback(clearStorageButton);
            chrome.tabs.reload(tab.id);
        }).catch((error) => {
            console.error(error);
            alert('Error while clearing storage:', error.message);
        });
    } catch (error) {
        console.error(error);
        alert('Error while clearing storage:', error.message);
    }
}

// Handle sacs_ngn cookie import
async function handleImportSacsNgn() {
    try {
        const sacsNgnValue = sacsNgnInput.value.trim();
        if (!sacsNgnValue) {
            alert('Please enter a sacs_ngn cookie value.');
            return;
        }

        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        const {url} = tab;
        const newCookie = {
            url,
            name: 'sacs_ngn',
            value: sacsNgnValue,
            path: '/',
            secure: true,
            httpOnly: true,
        };

        console.log('Attempting to set cookie:', newCookie);

        const cookie = await new Promise((resolve) => chrome.cookies.set(newCookie, resolve));
        if (cookie) {
            alert('sacs_ngn cookie imported!');
            buttonFeedback(importSacsNgnButton);
            chrome.tabs.reload(tab.id);
        } else {
            alert('Failed to import sacs_ngn cookie!');
        }
    } catch (error) {
        console.error('Error while importing sacs_ngn cookie:', error);
        alert('Error while importing sacs_ngn cookie: ' + error.message);
    }
}

// Add event listeners
copyButton.addEventListener('click', handleCopy);
pasteButton.addEventListener('click', handlePaste);
clearButton.addEventListener('click', handleClear);
clearStorageButton.addEventListener('click', handleClearStorage);
importSacsNgnButton.addEventListener('click', handleImportSacsNgn);
checkEntitlementButton.addEventListener('click', handleCheckEntitlement);