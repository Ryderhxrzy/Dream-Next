<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Webstore Subscription Expiry Reminder - AF Home</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;">

          {{-- Header --}}
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:28px 30px;text-align:center;">
              <img src="{{ $message->embed(public_path('Image/af_home_logo.png')) }}" alt="AF Home" width="120" style="display:block;margin:0 auto 16px;border:0;">
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">Subscription Expiry Notice</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#fecaca;">
                @if(($payload['days_left'] ?? 0) === 1)
                  Your webstore subscription expires <strong>tomorrow</strong>.
                @else
                  Your webstore subscription expires in <strong>{{ $payload['days_left'] ?? 0 }} days</strong>.
                @endif
              </p>
            </td>
          </tr>

          {{-- Greeting --}}
          <tr>
            <td style="padding:28px 30px 10px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1e293b;">Hi <strong>{{ $payload['admin_name'] ?? 'Partner' }}</strong>,</p>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#64748b;">
                This is a reminder that your webstore subscription for
                <strong>{{ $payload['storefront_name'] ?? 'your storefront' }}</strong>
                is expiring soon. Please renew before the expiry date to keep your webstore active and avoid any service interruption.
              </p>
            </td>
          </tr>

          {{-- Subscription Details --}}
          <tr>
            <td style="padding:0 30px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Subscription Details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;width:42%;">Storefront</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;font-weight:600;">{{ $payload['storefront_name'] ?? '-' }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;font-size:12px;color:#94a3b8;">Plan</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;font-size:13px;color:#1e293b;font-weight:600;">{{ ucfirst($payload['plan'] ?? '-') }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;">Billing</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;font-weight:600;">{{ ucfirst($payload['billing_option'] ?? '-') }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:12px;color:#94a3b8;">Expiry Date</td>
                  <td style="padding:12px 16px;font-size:13px;color:#dc2626;font-weight:700;">{{ $payload['end_date_label'] ?? '-' }}</td>
                </tr>
              </table>
            </td>
          </tr>

          {{-- Alert Banner --}}
          <tr>
            <td style="padding:0 30px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#fff7ed 0%,#fef3c7 100%);border:1px solid #fcd34d;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;text-align:center;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#92400e;">
                      @if(($payload['days_left'] ?? 0) === 1)
                        &#9888; Last day to renew!
                      @else
                        &#9888; {{ $payload['days_left'] ?? 0 }} days remaining
                      @endif
                    </p>
                    <p style="margin:8px 0 0;font-size:13px;color:#78350f;line-height:1.5;">
                      Log in to your account and go to <strong>Profile &rarr; My Webstore</strong> to submit a renewal request before your subscription expires.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td style="padding:0 30px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">
                If you have already submitted a renewal or need assistance, please reply to this email and our team will help you right away.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
