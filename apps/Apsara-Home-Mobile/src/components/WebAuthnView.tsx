import React, { useRef, useState } from 'react';
import { WebView } from 'react-native';

interface WebAuthnViewProps {
  challengeToken: string;
  isDarkMode: boolean;
  onCredentialCreated: (credential: any) => void;
  colors: any;
}

export function WebAuthnView({ challengeToken, isDarkMode, onCredentialCreated, colors }: WebAuthnViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          padding: 20px;
          margin: 0;
          background-color: ${isDarkMode ? '#0f172a' : '#f0f9ff'};
          color: ${isDarkMode ? '#f8fafc' : '#1a1a1a'};
        }
        .container {
          max-width: 500px;
          margin: 40px auto;
          padding: 20px;
          background-color: ${isDarkMode ? '#1f2937' : '#ffffff'};
          border-radius: 12px;
          border: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
        }
        .info {
          margin: 20px 0;
          padding: 12px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.6;
        }
        button {
          width: 100%;
          padding: 12px;
          margin: 10px 0;
          background-color: #0ea5e9;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        button:hover {
          background-color: #0284c7;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error {
          color: #ef4444;
          margin: 10px 0;
          padding: 10px;
          background-color: #fecaca;
          border-radius: 6px;
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Create Your Passkey</h2>
        <div class="info">
          You'll be asked to verify your identity using your device's biometric or PIN.
        </div>
        <div class="error" id="error"></div>
        <button id="registerBtn">Create Passkey</button>
        <div class="info" style="font-size: 12px; opacity: 0.7;">
          Passkeys use the WebAuthn standard for secure authentication.
        </div>
      </div>

      <script>
        const challengeToken = '${challengeToken}';
        const registerBtn = document.getElementById('registerBtn');
        const errorDiv = document.getElementById('error');

        function showError(msg) {
          errorDiv.textContent = msg;
          errorDiv.style.display = 'block';
        }

        function base64urlEncode(buffer) {
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '');
        }

        registerBtn.addEventListener('click', async () => {
          registerBtn.disabled = true;
          errorDiv.style.display = 'none';

          try {
            if (!window.PublicKeyCredential) {
              throw new Error('WebAuthn is not supported on this device');
            }

            // Create credential registration options
            const options = {
              challenge: new Uint8Array(32), // Dummy challenge, will be replaced by server
              rp: {
                name: "Apsara",
                id: window.location.hostname
              },
              user: {
                id: new Uint8Array(16),
                name: "user@example.com",
                displayName: "User"
              },
              pubKeyCredParams: [
                { alg: -7, type: "public-key" },
                { alg: -257, type: "public-key" }
              ],
              timeout: 60000,
              attestation: "direct",
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                residentKey: "preferred",
                userVerification: "preferred"
              }
            };

            // Create credential
            const credential = await navigator.credentials.create({ publicKey: options });

            if (!credential) {
              throw new Error('Failed to create credential');
            }

            // Extract data from credential
            const attestationObject = base64urlEncode(credential.response.attestationObject);
            const clientDataJSON = base64urlEncode(credential.response.clientDataJSON);
            const credentialId = base64urlEncode(credential.id);

            // Get public key if available
            let publicKey = null;
            if (credential.response.getPublicKey) {
              publicKey = base64urlEncode(credential.response.getPublicKey());
            }

            const credentialData = {
              id: credentialId,
              type: credential.type,
              response: {
                clientDataJSON: clientDataJSON,
                attestationObject: attestationObject,
                publicKey: publicKey,
                publicKeyAlgorithm: -7,
                transports: ['internal', 'platform']
              }
            };

            // Send back to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'credential-created',
              data: credentialData
            }));

          } catch (error) {
            showError(error.message || 'Failed to create passkey');
            registerBtn.disabled = false;
          }
        });
      </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'credential-created') {
        onCredentialCreated(message.data);
      }
    } catch (error) {
      console.error('WebView message error:', error);
    }
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: htmlContent }}
      onMessage={handleWebViewMessage}
      onLoad={() => setLoading(false)}
      javaScriptEnabled={true}
      style={{ flex: 1 }}
    />
  );
}
