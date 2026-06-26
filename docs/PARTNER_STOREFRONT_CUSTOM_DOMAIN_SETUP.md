# Partner Storefront Custom Domain Setup

Guide ito kapag ang partner/client ang may sariling domain, halimbawa:

```txt
condesynergy.com
```

Goal:

```txt
https://condesynergy.com
```

or, sa current supported route:

```txt
https://condesynergy.com/shop
```

mapunta sa tamang partner storefront.

## Quick Summary

Three places ang kailangan tama:

1. **Partner Storefront Studio**
   - Save the partner's domain in `Domain Link`.
2. **DNS provider ng client**
   - Point the domain to our VPS IP.
3. **Dokploy**
   - Add the domain to the frontend service, usually port `3000`.

Hindi sapat ang Dokploy lang. Hindi rin sapat ang Domain Link lang. Kailangan both DNS and Dokploy routing.

## Required Info

Before setup, collect these:

```txt
Client domain: condesynergy.com
Our VPS public IP: <VPS_PUBLIC_IP>
Frontend service in Dokploy: frontend
Frontend container port: 3000
Partner storefront slug: condesynergy or the actual slug
```

The storefront slug is usually generated from the storefront name. Example:

```txt
CondE Synergy -> conde-synergy
Rafhael Store -> rafhael-store
```

## Step 1: Save Domain Link In Partner Storefront Studio

Open:

```txt
Partner Storefront Studio
```

Select the partner storefront, then set:

```txt
Domain Link: https://condesynergy.com
```

Click:

```txt
Save Domain Link
```

Expected result:

```txt
Public storefront URL
```

should start using the custom domain.

Example:

```txt
https://condesynergy.com/shop?ref=username
```

## Step 2: DNS Setup

This depends on who controls the domain DNS.

### Case A: Client Keeps DNS Access

Send the client these DNS records:

```txt
Type: A
Name: @
Value: <VPS_PUBLIC_IP>
TTL: Auto
Proxy: DNS only or Proxied, depending on their provider
```

```txt
Type: CNAME
Name: www
Value: condesynergy.com
TTL: Auto
Proxy: DNS only or Proxied, depending on their provider
```

Alternative for `www`:

```txt
Type: A
Name: www
Value: <VPS_PUBLIC_IP>
TTL: Auto
```

Ask them to send a screenshot after saving.

### Case B: We Manage DNS In Our Cloudflare

Only do this if the client changes their nameservers to our Cloudflare account.

Steps:

1. Add site in Cloudflare:

```txt
condesynergy.com
```

2. Cloudflare gives nameservers.
3. Client updates nameservers at their registrar.
4. After Cloudflare is active, add DNS records:

```txt
A      @      <VPS_PUBLIC_IP>
CNAME  www    condesynergy.com
```

Recommended while testing:

```txt
Proxy status: DNS only
```

After SSL and routing are confirmed, Cloudflare proxy can be enabled if needed.

## Step 3: Add Domain In Dokploy

Open Dokploy:

```txt
Project -> Production -> DREAM NEXT APP -> Domains
```

Click:

```txt
Add Domain
```

Add root domain:

```txt
Service Name: frontend
Host: condesynergy.com
Path: /
Internal Path: /
Strip Path: OFF
Container Port: 3000
HTTPS: ON
Certificate Provider: Let's Encrypt
```

Click:

```txt
Create
```

Then add `www` domain:

```txt
Service Name: frontend
Host: www.condesynergy.com
Path: /
Internal Path: /
Strip Path: OFF
Container Port: 3000
HTTPS: ON
Certificate Provider: Let's Encrypt
```

Click:

```txt
Create
```

If Dokploy shows:

```txt
Whenever you make changes to domains, remember to redeploy your compose to apply the changes.
```

redeploy the compose/app after adding the domains.

## Step 4: Validate

In Dokploy, click:

```txt
Validate DNS
```

for each domain if available.

Then test in browser:

```txt
https://condesynergy.com/shop
```

Expected current behavior:

```txt
https://condesynergy.com/shop
```

should detect the custom domain and redirect to:

```txt
https://condesynergy.com/shop/<partner-slug>
```

Example:

```txt
https://condesynergy.com/shop/conde-synergy
```

Also test:

```txt
https://www.condesynergy.com/shop
```

## Current System Behavior

The app already supports custom domain matching through the saved `Domain Link`.

Important detail:

```txt
/shop
```

is currently the safest custom-domain entry point.

This works because `/shop` checks the request host and finds the matching `storefront_domain`.

Current expected path:

```txt
condesynergy.com/shop
```

The app then redirects to the matching storefront slug.

## Root Domain Behavior

At the moment, direct root domain behavior may not be fully wired:

```txt
https://condesynergy.com
```

may not automatically show the partner storefront unless the app has root-domain host detection or Dokploy/Cloudflare rewrites `/` to `/shop`.

Recommended production improvement:

```txt
condesynergy.com -> /shop/<partner-slug>
```

This can be implemented in the app by adding host detection on the root `/` page.

## Troubleshooting

### 404 Page Not Found

Likely cause:

```txt
DNS points to the VPS, but Dokploy does not have the domain attached to the frontend service.
```

Check:

1. Is the domain added in Dokploy Domains?
2. Is Service Name set to `frontend`?
3. Is Container Port set to `3000`?
4. Did you redeploy compose/app after adding the domain?
5. Does the domain DNS point to the correct VPS IP?

### SSL Error

Likely causes:

1. DNS not propagated yet.
2. Dokploy could not issue Let's Encrypt certificate.
3. Cloudflare proxy is interfering while certificate is being issued.

Try:

1. Temporarily set Cloudflare DNS record to `DNS only`.
2. Wait a few minutes.
3. Revalidate/redeploy in Dokploy.
4. Re-enable proxy only after HTTPS works.

### Domain Opens AF Home Instead Of Partner Storefront

Likely cause:

```txt
You opened the root domain `/`, but current custom-domain detection is strongest on `/shop`.
```

Test:

```txt
https://condesynergy.com/shop
```

If `/shop` works but `/` does not, the system needs root-domain redirect support.

### Domain Does Not Match Any Storefront

Check the Partner Storefront Studio:

```txt
Domain Link: https://condesynergy.com
```

Avoid putting paths in the domain link unless intentionally needed:

Good:

```txt
https://condesynergy.com
```

Avoid:

```txt
https://condesynergy.com/shop/conde-synergy
```

## Client Message Template

Use this if the client controls DNS:

```txt
Hi <Client Name>,

Please add these DNS records to your domain:

A record:
Name: @
Value: <VPS_PUBLIC_IP>
TTL: Auto

CNAME record:
Name: www
Value: <yourdomain.com>
TTL: Auto

After saving, please send us a screenshot. We will attach the domain to your storefront from our deployment side.

Thank you.
```

## Internal Checklist

Use this before saying the custom domain is ready:

- [ ] Domain Link saved in Partner Storefront Studio.
- [ ] DNS `@` points to our VPS IP.
- [ ] DNS `www` points to root domain or VPS IP.
- [ ] Root domain added in Dokploy frontend service.
- [ ] `www` domain added in Dokploy frontend service.
- [ ] Port is `3000`.
- [ ] Path is `/`.
- [ ] HTTPS is enabled.
- [ ] Let's Encrypt certificate issued.
- [ ] Compose/app redeployed if Dokploy asks for it.
- [ ] `https://domain.com/shop` works.
- [ ] `https://www.domain.com/shop` works.
- [ ] Partner Storefront Studio `Public storefront URL` uses the custom domain.
