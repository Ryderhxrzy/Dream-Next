# Local CA bundle (`cacert.pem`)

The ZQ Global Supplier client (`App\Services\Zq\ZqApiService`) verifies the
ZQ API's TLS certificate against `config('services.zq.ca_bundle')`, which
defaults to **`storage/certs/cacert.pem`** (this folder). If that file is
absent, the client falls back to the system trust store. **TLS verification
is always ON.**

You only need a file here if HTTPS to `system.zqdropshipping.com` fails with:

```
cURL error 60: SSL certificate ... unable to get local issuer certificate
```

## Why this happens

Some antivirus products (e.g. **Norton**) intercept HTTPS ("encrypted
connection / SSL-TLS scanning"). They re-sign every certificate with a local
root such as `CN=Norton Web/Mail Shield Root` and serve an incomplete chain.
The OS trusts that root, but PHP/cURL uses a *file-based* Mozilla bundle that
does not — so verification fails for every public CA bundle.

Two fixes:

1. **Cleanest:** turn off the antivirus's encrypted-connection / SSL-TLS
   scanning. The real public chain is then presented and the system store
   verifies it. No file needed here.

2. **Keep the antivirus on:** build a bundle that contains the standard
   Mozilla roots **plus** your AV's local root, and drop it here as
   `cacert.pem` (gitignored). On Windows + Norton, from PowerShell:

   ```powershell
   $out  = "storage/certs/cacert.pem"
   $base = Get-Content "C:\Program Files\Git\usr\ssl\certs\ca-bundle.crt" -Raw
   $av = ""
   Get-ChildItem Cert:\CurrentUser\Root, Cert:\LocalMachine\Root |
     Where-Object { $_.Subject -like "*Norton*" } |
     Select-Object -Unique Thumbprint -ExpandProperty Thumbprint | ForEach-Object {
       $c = Get-Item "Cert:\CurrentUser\Root\$_" -ErrorAction SilentlyContinue
       if (-not $c) { $c = Get-Item "Cert:\LocalMachine\Root\$_" }
       $b64 = [Convert]::ToBase64String($c.RawData, 'InsertLineBreaks')
       $av += "`n-----BEGIN CERTIFICATE-----`n$b64`n-----END CERTIFICATE-----`n"
     }
   Set-Content $out ($base + $av) -Encoding ascii
   php artisan config:clear
   ```

You can also point `ZQ_CA_BUNDLE` in `.env` at any bundle path to override the
default location.
