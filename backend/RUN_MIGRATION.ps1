# Windows PowerShell Commands for Database Migration

# Step 1: Set the database URL (Windows PowerShell syntax)
$env:DATABASE_URL="postgresql://postgres:8520894522@database-1.ca7woeg2wmuh.us-east-1.rds.amazonaws.com:5432/database"

# Step 2: Navigate to backend directory
cd d:\offer_market\backend

# Step 3: Run the migration
npx prisma migrate deploy

# Step 4: Verify migration status
npx prisma migrate status

# Step 5: Check if table was created
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM offer_leads;"
