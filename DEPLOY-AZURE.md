# Azure Deployment Guide

Covers deploying the full stack on **Azure VM** (single-server, same as the existing docker-compose approach) with optional swap-outs to **Azure managed services** for production data.

---

## Option A — Azure Virtual Machine (single server)

### 1. Create a VM

1. Go to **Azure Portal → Virtual Machines → Create**
2. Choose:
   - **Image**: Ubuntu Server 22.04 LTS (x64)
   - **Size** — minimum for this stack (7 services + MongoDB + RabbitMQ):

   | Size | RAM | vCPU | Cost | Verdict |
   |---|---|---|---|---|
   | Standard_B2s | 4 GB | 2 | ~$30/mo | Dev/staging only |
   | Standard_B4ms | 16 GB | 4 | ~$140/mo | Recommended for production |
   | Standard_D2s_v3 | 8 GB | 2 | ~$70/mo | Balanced alternative |

3. **Authentication**: choose **SSH public key** — paste your existing public key or let Azure generate one (download the `.pem` file)
4. **OS Disk**: increase to at least **64 GB** (Docker images fill up fast)
5. Click **Review + Create → Create**

### 2. Configure the Network Security Group

While the VM is creating (or after), go to its **Networking** tab and add inbound port rules:

| Priority | Name | Port | Protocol | Source | Action |
|---|---|---|---|---|---|
| 300 | SSH | 22 | TCP | Your IP only | Allow |
| 310 | HTTP | 80 | TCP | Any | Allow |
| 320 | HTTPS | 443 | TCP | Any | Allow |

Do **not** open ports 3001–3006, 27017, or 5672 publicly — only port 3000 flows through Nginx.

### 3. Assign a Static Public IP

By default Azure VMs get a dynamic IP that changes on restart.

1. Go to your VM → **Networking → IP configuration**
2. Click the public IP name → change **Assignment** from Dynamic to **Static**
3. Save

### 4. SSH into the VM

```bash
chmod 400 your-key.pem
ssh -i your-key.pem azureuser@YOUR_STATIC_IP
```

### 5. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker azureuser   # avoid needing sudo for docker commands
newgrp docker                        # apply group change in current session
docker --version
docker compose version
```

### 6. Get your code on the server

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /app
cd /app
```

For a private repo, use a GitHub fine-grained personal access token (read-only, repo contents):

```bash
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git /app
```

### 7. Set up environment variables

```bash
cp .env.example .env
nano .env
```

Fill in all values — see the [Pre-deployment Checklist](#pre-deployment-checklist) below.

### 8. Build and start the stack

```bash
cd /app
docker compose up -d --build
```

First build takes 5–10 minutes. Verify:

```bash
docker compose ps            # all services should show "Up"
curl http://localhost:3000/docs    # gateway Swagger
```

### 9. Point your domain to the static IP

Add a DNS **A record** at your domain registrar (or in **Azure DNS** if you manage your domain there):

```
Type:  A
Name:  api          (results in api.yourdomain.com)
Value: YOUR_STATIC_IP
TTL:   300
```

DNS propagates in a few minutes to a few hours.

### 10. Add Nginx + free SSL

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

# Issue free SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

Certbot auto-renews the certificate. Your API is now live at `https://api.yourdomain.com`.

### 11. Update the deployment

```bash
ssh -i your-key.pem azureuser@YOUR_STATIC_IP
cd /app
git pull
docker compose up -d --build
```

---

## Option B — Azure Container Instances (lighter alternative)

If you want containers without managing a VM OS, **Azure Container Instances (ACI)** via **Docker's ACI integration** can deploy your compose file directly:

```bash
# One-time setup on your local machine
docker login azure
docker context create aci myacicontext
docker context use myacicontext

# Deploy — Azure provisions containers in the cloud
docker compose up
```

**Caveats:** ACI has no persistent volumes suitable for MongoDB in production, no built-in Nginx/SSL, and costs more per vCPU-hour than a VM at scale. Use it for short-lived staging environments only.

---

## Managed Services (replace compose MongoDB / RabbitMQ in production)

The `docker-compose.yml` runs MongoDB and RabbitMQ as containers with local volumes — a disk failure loses everything. Replace them with managed services before going to production.

### MongoDB — Azure Cosmos DB for MongoDB

Azure's managed MongoDB-compatible service with automatic backups and global replication.

1. Go to **Azure Portal → Azure Cosmos DB → Create → Azure Cosmos DB for MongoDB**
2. Choose **Serverless** capacity mode for low-traffic workloads (pay per request, no minimum)
3. After creation, go to **Connection String** tab → copy the **Primary Connection String**
4. Create one database per service (Cosmos DB supports multiple databases per account):

```
AUTH_MONGO_URI=mongodb://user:pass@account.mongo.cosmos.azure.com:10255/auth_db?ssl=true&retrywrites=false
USER_MONGO_URI=mongodb://user:pass@account.mongo.cosmos.azure.com:10255/user_db?ssl=true&retrywrites=false
PAYMENT_MONGO_URI=mongodb://user:pass@account.mongo.cosmos.azure.com:10255/payment_db?ssl=true&retrywrites=false
NOTIFICATION_MONGO_URI=mongodb://user:pass@account.mongo.cosmos.azure.com:10255/notification_db?ssl=true&retrywrites=false
EPIDIET_MONGO_URI=mongodb://user:pass@account.mongo.cosmos.azure.com:10255/epidiet_db?ssl=true&retrywrites=false
ECOM_MONGO_URI=mongodb://user:pass@account.mongo.cosmos.azure.com:10255/ecom_db?ssl=true&retrywrites=false
```

> **Note:** Cosmos DB's MongoDB compatibility is not 100%. Aggregation pipelines, transactions, and some operators may behave differently. Test your queries before cutting over. **MongoDB Atlas** (see DEPLOY.md) remains the safer drop-in option.

Once set in `.env`, remove the `mongodb` service from `docker-compose.yml` and its `depends_on` references.

### RabbitMQ — Azure Service Bus

Azure Service Bus is AMQP 1.0 compliant. The `amqplib` client used by NestJS's `@nestjs/microservices` works against it, but the connection string format differs from CloudAMQP's AMQP 0-9-1.

1. Go to **Azure Portal → Service Bus → Create namespace** (Standard tier minimum for topics)
2. Under the namespace → **Queues** or **Topics**, create queues matching the names your services publish to (`user_created`, `user_login`, etc.)
3. Go to **Shared access policies → RootManageSharedAccessKey** → copy the **Primary Connection String**

Update `RABBITMQ_URL` in `.env`:

```
RABBITMQ_URL=amqp://RootManageSharedAccessKey:YOUR_KEY@YOUR_NAMESPACE.servicebus.windows.net
```

> **Simpler alternative:** Keep using **CloudAMQP** (see DEPLOY.md) even when your server is on Azure — the two services are independent, and CloudAMQP's free tier is easier to set up.

Once set in `.env`, remove the `rabbitmq` service from `docker-compose.yml`.

---

## Azure DNS (optional — if your domain registrar is Azure)

If you registered your domain through Azure or transferred it there:

1. Go to **Azure Portal → DNS zones → Create**
2. Enter your domain name → Create
3. Add an **A record set**:
   - Name: `api`
   - Type: A
   - TTL: 300
   - IP: your VM's static public IP
4. Update your domain's nameservers at the registrar to point to the Azure nameservers shown in the DNS zone overview

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
| `*_MONGO_URI` | Cosmos DB or Atlas connection strings (one per service) |
| `RABBITMQ_URL` | Azure Service Bus or CloudAMQP AMQP URL |
| `SMS_PROVIDER` | `console` for dev, `msg91`/`twilio` for real SMS |
| `AI_PROVIDER` | `claude` or `openai` |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | From Anthropic / OpenAI console |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard |
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

If `SMS_PROVIDER` is `console`, the OTP is printed in the `api-gateway` container logs:

```bash
docker compose logs api-gateway | grep OTP
```

---

## Cost summary (approximate monthly)

| Component | Option | Cost |
|---|---|---|
| VM (Standard_B4ms) | Azure VM | ~$140/mo |
| VM (Standard_D2s_v3) | Azure VM | ~$70/mo |
| MongoDB | Cosmos DB Serverless | ~$0–$25/mo depending on requests |
| MongoDB | Atlas M0 (free) | $0 |
| RabbitMQ | Azure Service Bus Standard | ~$10/mo base |
| RabbitMQ | CloudAMQP Little Lemur (free) | $0 |
| SSL certificate | Let's Encrypt via Certbot | Free |
| Static IP | Azure public IP (attached to running VM) | Free |

> Cheapest production path: **Standard_D2s_v3 VM + MongoDB Atlas M0 + CloudAMQP free tier** — approximately **$70/mo** all-in.
