@php
    $customerName = trim((string) ($payload['customer_name'] ?? '')) ?: 'there';
    $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
    $currency = (string) ($payload['currency'] ?? 'PHP');
    $total = (float) ($payload['total'] ?? 0);
    $resumeUrl = (string) ($payload['resume_url'] ?? '#');
    $note = trim((string) ($payload['note'] ?? ''));
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete your order</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#0f172a;padding:24px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;">AF Home</h1>
            </div>

            <div style="padding:28px 24px;">
                <h2 style="margin:0 0 12px;font-size:18px;">Hi {{ $customerName }}, you left something behind</h2>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;">
                    Your order is reserved but not paid yet. Complete your payment to secure your items
                    before they sell out.
                </p>

                @if ($note !== '')
                    <div style="margin:0 0 20px;padding:12px 14px;border-left:3px solid #0284c7;background:#f0f9ff;border-radius:6px;">
                        <p style="margin:0;font-size:13px;line-height:1.6;color:#0c4a6e;white-space:pre-line;">{{ $note }}</p>
                    </div>
                @endif

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
                    @foreach ($items as $item)
                        <tr>
                            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#111827;">
                                {{ (string) ($item['name'] ?? 'Item') }}
                                <span style="color:#6b7280;">&times; {{ (int) ($item['quantity'] ?? 1) }}</span>
                            </td>
                            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;text-align:right;color:#111827;">
                                {{ $currency }} {{ number_format((float) ($item['amount'] ?? 0), 2) }}
                            </td>
                        </tr>
                    @endforeach
                    <tr>
                        <td style="padding:12px 0;font-size:15px;font-weight:bold;">Total</td>
                        <td style="padding:12px 0;font-size:15px;font-weight:bold;text-align:right;">
                            {{ $currency }} {{ number_format($total, 2) }}
                        </td>
                    </tr>
                </table>

                <div style="text-align:center;margin:8px 0 4px;">
                    <a href="{{ $resumeUrl }}"
                       style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:8px;">
                        Complete my payment
                    </a>
                </div>

                <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;">
                    If you already paid or no longer want these items, you can ignore this email.
                </p>
            </div>
        </div>

        <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
            &copy; {{ date('Y') }} AF Home. All rights reserved.
        </p>
    </div>
</body>
</html>
