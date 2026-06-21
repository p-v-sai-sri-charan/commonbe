# Deployment Guide

Two options covered: **Hostinger VPS** (budget-friendly) and **AWS EC2** (scalable). Both use the existing `docker-compose.yml` to run the full stack on a single server.

---

## Option A — Hostinger VPS

### 1. Pick a plan

Go to [hostinger.com/vps-hosting](https://www.hostinger.com/vps-hosting). Minimum spec for this stack (7 services + MongoDB + RabbitMQ):

| Plan | RAM | vCPU | Cost | Verdict |
|---|---|---|---|---|
| KVM 2 | 8 GB | 2 | ~$8/mo | Minimum — works for dev/staging |
| KVM 4 | 16 GB | 4 | ~$13/mo | Recommended for production |

Select **Ubuntu 22.04** as the OS.

### 2. Connect to your server

Hostinger gives you an IP and root password after provisioning. SSH in:

```bash
ssh root@YOUR_SERVER_IP
```

Change your root password if prompted, or set up an SSH key in the Hostinger panel (recommended).

### 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```

### 4. Get your code on the server

```bash
# From GitHub (recommended — easier to update later)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /app
cd /app
```

If the repo is private, either use a GitHub personal access token or add the server's SSH key (`ssh-keygen -t ed25519`) to your GitHub account.

### 5. Set up environment variables

```bash
cp .env.example .env
nano .env
```

Fill in all values — see the [Pre-deployment Checklist](#pre-deployment-checklist) below.

### 6. Build and start the stack

```bash
docker compose up -d --build
```

First build takes 5–10 minutes. After that:

```bash
docker compose ps          # all services should show "Up"
curl http://localhost:3000/docs    # gateway Swagger
```

### 7. Point your domain to the server

In Hostinger's hPanel (or your domain registrar's DNS panel), add an **A record**:

```
Type: A
Name: api          (results in api.yourdomain.com)
Value: YOUR_SERVER_IP
TTL: 300
```

DNS propagates in a few minutes to a few hours.

### 8. Add Nginx + free SSL

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Issue free SSL certificate
certbot --nginx -d api.yourdomain.com
```

Certbot auto-renews the certificate. Your API is now live at `https://api.yourdomain.com`.

### 9. Update the deployment

```bash
ssh root@YOUR_SERVER_IP
cd /app
git pull
docker compose up -d --build
```

---

## Option B — AWS EC2

### 1. Launch an EC2 instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose **Ubuntu Server 22.04 LTS (64-bit x86)**
3. Instance type — minimum for this stack:

   | Type | RAM | vCPU | Cost | Verdict |
   |---|---|---|---|---|
   | t3.medium | 4 GB | 2 | ~$30/mo | Dev/staging only |
   | t3.large | 8 GB | 2 | ~$60/mo | Recommended for production |

4. **Key pair** — create or select an existing `.pem` key
5. **Storage** — increase to at least **20 GB** (default 8 GB fills up fast with Docker images)
6. Click **Launch Instance**

### 2. Configure the Security Group

In your instance's **Security Group**, add inbound rules:

| Type | Protocol | Port | Source |
|---|---|---|---|
| SSH | TCP | 22 | Your IP only |
| HTTP | TCP | 80 | 0.0.0.0/0 |
| HTTPS | TCP | 443 | 0.0.0.0/0 |

Do **not** expose ports 3001–3006, 27017, 5672 publicly — only port 3000 flows through Nginx.

### 3. Assign an Elastic IP

Without an Elastic IP, your instance's public IP changes every restart.

1. Go to **EC2 → Elastic IPs → Allocate Elastic IP**
2. Click **Associate** → select your instance

This IP is free as long as it's attached to a running instance.

### 4. SSH into the instance

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

### 5. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu   # so you don't need sudo for docker commands
newgrp docker                    # apply group change in current session
docker --version
docker compose version
```

### 6. Get your code on the server

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /app
cd /app
```

For a private repo, create a GitHub **fine-grained personal access token** (read-only, repo contents) and use it in the clone URL:

```bash
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git /app
```

### 7. Set up environment variables

```bash
cp .env.example .env
nano .env
```

Fill in all values — see [Pre-deployment Checklist](#pre-deployment-checklist).

### 8. Build and start the stack

```bash
cd /app
docker compose up -d --build
```

```bash
docker compose ps
curl http://localhost:3000/docs
```

### 9. Point your domain to the Elastic IP

Add a DNS A record at your domain registrar (or in **Route 53** if your domain is managed there):

```
Type: A
Name: api
Value: YOUR_ELASTIC_IP
```

### 10. Add Nginx + SSL

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/api`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 11. Update the deployment

```bash
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
cd /app
git pull
docker compose up -d --build
```

---

## Managed Services (use these instead of the compose MongoDB/RabbitMQ in production)

The `docker-compose.yml` runs MongoDB and RabbitMQ as containers with local volumes. This is fine for dev but risky for production data — a disk failure loses everything. Replace them with managed services.

### MongoDB — MongoDB Atlas (free tier available)

1. Create a free account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free **M0 cluster** (512 MB, enough for early stage)
3. Under **Database Access** → add a user with read/write access
4. Under **Network Access** → add `0.0.0.0/0` (or your server IP for tighter security)
5. Click **Connect → Drivers** → copy the connection string

You need one URI per service (different database name suffix):

```
AUTH_MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/auth_db
USER_MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/user_db
PAYMENT_MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/payment_db
NOTIFICATION_MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/notification_db
EPIDIET_MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/epidiet_db
ECOM_MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/ecom_db
```

Once set in `.env`, remove the `mongodb` service from `docker-compose.yml` and its `depends_on` references.

### RabbitMQ — CloudAMQP (free tier available)

1. Sign up at [cloudamqp.com](https://www.cloudamqp.com)
2. Create a **Little Lemur** instance (free — 1M messages/month)
3. Copy the AMQP URL from the instance dashboard

```
RABBITMQ_URL=amqps://user:pass@hostname.cloudamqp.com/vhost
```

Once set in `.env`, remove the `rabbitmq` service from `docker-compose.yml`.

> **AWS alternative:** Use **Amazon DocumentDB** (MongoDB-compatible) and **Amazon MQ** for RabbitMQ if you want everything within AWS. Both are significantly more expensive than Atlas + CloudAMQP for small workloads.

---

## Pre-deployment Checklist

Do this before running `docker compose up` on any server.

### Replace all placeholder secrets

```bash
# Generate a secret — run this 3 times, use each output for one var
openssl rand -hex 32
```

```env
JWT_SECRET=<generated>
OTP_HASH_SECRET=<generated>
REFRESH_TOKEN_HASH_SECRET=<generated>
BYOK_ENCRYPTION_KEY=<generated>
```

### Required environment variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` — disables OTP echo in API response |
| `JWT_SECRET` | Random 64-char string |
| `OTP_HASH_SECRET` | Random 64-char string |
| `REFRESH_TOKEN_HASH_SECRET` | Random 64-char string |
| `BYOK_ENCRYPTION_KEY` | Random 32-char string |
| `*_MONGO_URI` | Atlas connection strings (one per service) |
| `RABBITMQ_URL` | CloudAMQP AMQP URL |
| `SMS_PROVIDER` | `console` for dev, `msg91`/`twilio` for real SMS |
| `AI_PROVIDER` | `claude` or `openai` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | From Anthropic / OpenAI console |
| `CLOUDINARY_CLOUD_NAME` | [cloudinary.com](https://cloudinary.com) dashboard |
| `CLOUDINARY_API_KEY` | Same |
| `CLOUDINARY_API_SECRET` | Same |

---

## Verify the deployment

```bash
BASE=https://api.yourdomain.com

# Gateway is up
curl $BASE/docs

# Request OTP
curl -X POST $BASE/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210"}'

# Verify OTP
curl -X POST $BASE/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210","otp":"123456"}'
```

If SMS_PROVIDER is `console`, the OTP is printed in the `api-gateway` container logs:

```bash
docker compose logs api-gateway | grep OTP
```
