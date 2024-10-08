// Get the buttons and input field
const copyButton = document.getElementById('copy');
const pasteButton = document.getElementById('paste');
const clearButton = document.getElementById('clear');
const clearStorageButton = document.getElementById('clearStorage');
const importSacsNgnButton = document.getElementById('importSacsNgn');
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

// Handle cookie copying
async function handleCopy() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        const cookieValues = await new Promise((resolve) => getCookies(tab.id, resolve));

        if (cookieValues.acs_ngn && cookieValues.cpn) {
            localStorage.setItem('acs_ngn', cookieValues.acs_ngn);
            localStorage.setItem('cpn', cookieValues.cpn);
            showCookiePopup(cookieValues.acs_ngn, cookieValues.cpn);
            buttonFeedback(copyButton);
        } else {
            alert('Cookies not found!');
        }
    } catch (error) {
        console.error(error);
        alert('Error while copying cookies:', error.message);
    }
}

// Handle cookie pasting
async function handlePaste() {
    try {
        const acs_ngn_value = localStorage.getItem('acs_ngn');
        if (acs_ngn_value) {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            const {url} = tab;
            const newCookie = {
                url,
                name: 'acs_ngn',
                value: acs_ngn_value,
                path: '/',
            };
            const cookie = await new Promise((resolve) => chrome.cookies.set(newCookie, resolve));

            if (cookie) {
                alert('Cookie pasted!');
                buttonFeedback(pasteButton);
                chrome.tabs.reload(tab.id);
            } else {
                alert('Failed to paste cookie!');
            }
        } else {
            alert('No cookie found in local storage!');
        }
    } catch (error) {
        console.error(error);
        alert('Error while pasting cookies:', error.message);
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