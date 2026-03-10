# Crypto Tracker Privacy Policy

Crypto Tracker (the "Extension") is a Chrome extension that displays a real-time cryptocurrency price widget in your browser. We value your privacy. This page explains how the Extension handles your data.

---

## Data We Do Not Collect

The Extension **does not** collect, upload, or transmit the following to the extension developer or any third-party servers:

- Your personally identifiable information (e.g., name, email, account credentials)
- Your browsing behavior on the web (e.g., clicks, scrolling, keystrokes)
- The content of pages you visit (e.g., text, images, links)
- Any data used to identify or track you

We do not sell or rent your data, and we do not use your data for credit assessment, lending, or any purpose unrelated to the Extension’s single purpose.

---

## Data Stored Only on Your Device

To provide the Extension’s features, the following data is stored only in **your device’s browser local storage** (Chrome’s `chrome.storage.local`) and **is not sent to our servers**:

| Data | Purpose |
|------|---------|
| Watchlist (selected coins) | Display the coins you follow in the widget and popup |
| Price alert settings | Notify you when prices hit your upper or lower limits |
| Data source preference | Remember your chosen market data source (e.g., OKX) |

You can uninstall the Extension at any time; the data above is removed from your device with it.

---

## Communication with Third-Party Services

The Extension communicates with the following **public APIs** to provide market data and network detection:

- **OKX** (`okx.com`, `wspri.okx.com`): Used to fetch real-time market data for your selected coins (WebSocket and REST API). Requests do not include information that identifies you.
- **ipapi.co**: Used to infer your general network environment (e.g., region) to optimize features such as token validation. We only use the public information returned by this service and do not submit your personal data to it.

This communication is used only for the Extension’s single purpose (showing real-time prices and alerts). We do not use the data obtained from it for other purposes or share it with third parties.

---

## Use of Permissions

The browser permissions declared by the Extension are used only to provide the features described above, for example:

- **Storage**: Save your watchlist and alert settings.
- **Active tab / Scripting**: Show the floating widget on the pages you browse.
- **Notifications**: Show system notifications when prices trigger the alerts you set.
- **Host access (okx.com, ipapi.co, etc.)**: Request market data and network/region information.

We do not use these permissions to collect data unrelated to the Extension’s purpose.

---

## Policy Updates

We may update this privacy policy when we update the Extension. Any material changes will be noted on this page or in the Extension’s release notes. Continued use of the Extension constitutes acceptance of the current policy.

---

## Contact and Feedback

If you have questions about this privacy policy or how the Extension handles data, you can reach us via the project repository’s Issues or the channel through which you obtained the Extension.

**Last updated**: As of the last modification date of this file in the repository.
