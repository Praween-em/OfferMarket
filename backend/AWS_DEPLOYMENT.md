# AWS App Runner - Manual Database Migration Guide

## 🎯 Quick Migration Steps

Since you're using **AWS App Runner**, migrations need to be run manually against your RDS database.

### Option 1: Run from Local Machine (Recommended)

```bash
# 1. Set your AWS RDS database URL
export DATABASE_URL="postgresql://username:password@your-rds-endpoint.rds.amazonaws.com:5432/database"

# 2. Navigate to backend directory
cd d:\offer_market\backend

# 3. Run the migration
npx prisma migrate deploy

# 4. Verify migration
npx prisma migrate status
```

### Option 2: Using AWS Systems Manager (SSM)

If you have an EC2 bastion host or can access via SSM:

```bash
# Connect to your instance
aws ssm start-session --target i-your-instance-id

# Run migration
cd /app
DATABASE_URL="your-connection-string" npx prisma migrate deploy
```

### Option 3: Direct SQL Execution

Connect to your RDS database and run the migration SQL directly:

```sql
-- File: backend/prisma/migrations/20260126_add_offer_leads/migration.sql

-- CreateEnum for lead status
CREATE TYPE "lead_status_enum" AS ENUM ('new', 'contacted', 'converted');

-- CreateTable for offer_leads
CREATE TABLE "offer_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "user_id" UUID,
    "user_phone" VARCHAR(20) NOT NULL,
    "user_name" VARCHAR(255),
    "status" "lead_status_enum" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contacted_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    CONSTRAINT "offer_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "idx_offer_leads_offer_id" ON "offer_leads"("offer_id");
CREATE INDEX "idx_offer_leads_user_id" ON "offer_leads"("user_id");
CREATE INDEX "idx_offer_leads_status" ON "offer_leads"("status");
CREATE INDEX "idx_offer_leads_created_at" ON "offer_leads"("created_at" DESC);

-- AddForeignKeys
ALTER TABLE "offer_leads" ADD CONSTRAINT "offer_leads_offer_id_fkey" 
    FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    
ALTER TABLE "offer_leads" ADD CONSTRAINT "offer_leads_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
```

---

## 🔍 Verify Migration Success

After running the migration:

```bash
# Check if table exists
psql $DATABASE_URL -c "\d offer_leads"

# Check enum
psql $DATABASE_URL -c "\dT lead_status_enum"

# Test insert
psql $DATABASE_URL -c "SELECT COUNT(*) FROM offer_leads;"
```

---

## � App Runner Auto-Deploy

Your App Runner service will automatically:
1. ✅ Pull latest code from GitHub
2. ✅ Run `npm install`
3. ✅ Run `npx prisma generate` (from build script)
4. ✅ Build the application
5. ✅ Deploy new version

**Note**: App Runner does NOT run `prisma migrate deploy` automatically. You must run migrations manually.

---

## 📋 Connection String Format

Your DATABASE_URL should look like:
```
postgresql://username:password@your-db.rds.amazonaws.com:5432/dbname?schema=public
```

Get it from:
- AWS RDS Console → Your Database → Connectivity & security
- Or AWS Secrets Manager if you stored it there

---

## ⚠️ Important Notes

1. **Run migrations BEFORE deploying** to avoid API errors
2. **Backup your database** before running migrations
3. **Test on staging** environment first if available
4. App Runner will auto-deploy after GitHub push (build should succeed now!)

---

## 🎉 After Migration

Once migration is complete:
1. App Runner will deploy the new code automatically
2. New API endpoints will be active:
   - `POST /offers/:id/leads`
   - `GET /offers/leads/business/:businessId`
   - `PATCH /offers/leads/:id/status`
   - `GET /offers/leads/recent/:businessId`
3. Owner app WhatsApp Leads screen will start showing real data
4. Call button will work immediately

---

## 🆘 Troubleshooting

**Migration fails with "permission denied"**:
```sql
-- Grant permissions to your database user
GRANT CREATE ON SCHEMA public TO your_username;
```

**"relation already exists"**:
- Migration may have already run (safe to ignore)
- Or run: `DROP TABLE IF EXISTS offer_leads CASCADE;` then retry

**App Runner build fails**:
- Check build logs in App Runner console
- Verify `package.json` has correct build script
- Ensure Prisma is in dependencies (not devDependencies)
