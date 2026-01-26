# AWS Deployment Guide - Database Migration

## ✅ Changes Pushed to GitHub

**Repository**: https://github.com/Praween-em/backend_offera
**Commit**: `e213e23`
**Branch**: `main`

---

## 🚀 Running Migrations on AWS

### Option 1: SSH into AWS Instance (Recommended)

```bash
# 1. SSH into your AWS EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# 2. Navigate to backend directory
cd /path/to/backend

# 3. Pull latest changes
git pull origin main

# 4. Install dependencies (if needed)
npm install

# 5. Run Prisma migration
npx prisma migrate deploy

# 6. Restart your application
pm2 restart all
# OR
sudo systemctl restart your-app-service
```

### Option 2: Using CI/CD Pipeline

If you have GitHub Actions or similar:

```yaml
# Add to your deployment workflow
- name: Run Database Migrations
  run: |
    cd backend
    npx prisma migrate deploy
```

### Option 3: Manual Migration via Prisma Studio

```bash
# On your local machine
DATABASE_URL="your-aws-postgres-url" npx prisma migrate deploy
```

---

## 📋 Migration Details

**Migration File**: `20260126_add_offer_leads/migration.sql`

**Changes**:
- Creates `lead_status_enum` (new, contacted, converted)
- Creates `offer_leads` table
- Adds foreign keys to `offers` and `users`
- Creates indexes for performance

**Tables Affected**:
- ✅ New table: `offer_leads`
- ✅ New enum: `lead_status_enum`

---

## ✅ Verification Steps

After deployment, verify the migration:

```bash
# Check migration status
npx prisma migrate status

# Verify table exists
psql $DATABASE_URL -c "\d offer_leads"

# Test API endpoint
curl https://your-api-url/offers/leads/business/{businessId}
```

---

## 🔧 Troubleshooting

**If migration fails**:
1. Check database connection: `npx prisma db pull`
2. View migration history: `npx prisma migrate status`
3. Reset if needed (⚠️ CAUTION): `npx prisma migrate reset`

**Common Issues**:
- **Permission denied**: Ensure database user has CREATE TABLE privileges
- **Connection timeout**: Check security group rules and database firewall
- **Already exists**: Migration may have already run (safe to ignore)

---

## 📱 Testing the New Features

Once deployed:

1. **Owner App**: Open WhatsApp Leads screen
2. **User App**: Click "Contact on WhatsApp" on any offer
3. **Verify**: Lead should appear in owner app
4. **Test Call**: Click call button on lead card
5. **Check Metrics**: Verify lead count increments

---

## 🔐 Environment Variables

Ensure these are set on AWS:

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
JWT_SECRET="your-secret-key"
```
