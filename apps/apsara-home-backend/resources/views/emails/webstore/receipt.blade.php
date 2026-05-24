<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Webstore Receipt - AF Home</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:28px 30px;text-align:center;">
              <img src="{{ $message->embed(public_path('Image/af_home_logo.png')) }}" alt="AF Home" width="120" style="display:block;margin:0 auto 16px;border:0;">
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">Webstore Receipt</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#dbeafe;">Your payment record has been received and saved to your account.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 30px 10px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1e293b;">Hi <strong>{{ $payload['customer_name'] ?? 'Valued Customer' }}</strong>,</p>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#64748b;">
                Here is your webstore payment receipt for the record. You can also view the same subscription details inside your profile and the admin inquiry record.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 30px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Receipt Details</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;width:42%;">Reference No.</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;font-weight:600;">{{ $payload['reference_no'] ?? '-' }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;font-size:12px;color:#94a3b8;">Plan</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;font-size:13px;color:#1e293b;font-weight:600;">{{ $payload['plan_label'] ?? '-' }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;">Billing Option</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;font-weight:600;">{{ $payload['billing_label'] ?? '-' }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;font-size:12px;color:#94a3b8;">Payment Method</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;font-size:13px;color:#1e293b;font-weight:600;">{{ $payload['payment_method'] ?? '-' }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;">Payment Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;font-weight:600;">{{ $payload['submitted_at_label'] ?? '-' }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;font-size:12px;color:#94a3b8;">Receipt Count</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fafafa;font-size:13px;color:#1e293b;font-weight:600;">{{ $payload['receipt_count'] ?? 0 }}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:12px;color:#94a3b8;">Remaining Balance</td>
                  <td style="padding:12px 16px;font-size:13px;color:#1e293b;font-weight:700;">₱{{ number_format((float) ($payload['remaining_balance'] ?? 0), 2) }}</td>
                </tr>
              </table>
            </td>
          </tr>

          @if(!empty($payload['receipt_urls']) && is_array($payload['receipt_urls']))
          <tr>
            <td style="padding:0 30px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.6px;">Receipt Files</p>
                    @foreach($payload['receipt_urls'] as $url)
                      <p style="margin:0 0 8px;font-size:13px;line-height:1.5;word-break:break-all;">
                        <a href="{{ $url }}" style="color:#2563eb;text-decoration:none;">{{ $url }}</a>
                      </p>
                    @endforeach
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          @endif

          <tr>
            <td style="padding:0 30px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">
                If you need any help, reply to this email and our team will assist you.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
