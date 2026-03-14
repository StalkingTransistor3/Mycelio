#!/bin/bash
# Mycelio database backup script
# Usage: ./backup.sh
# Requires: DATABASE_URL environment variable, pg_dump, and optionally AWS CLI for S3 upload

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_FILE="$BACKUP_DIR/mycelio_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up database..."
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
echo "Backup saved to $BACKUP_FILE"

# Optional: Upload to S3/R2
if [ -n "${S3_BUCKET:-}" ]; then
  echo "Uploading to s3://$S3_BUCKET/backups/..."
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/mycelio_$TIMESTAMP.sql.gz"
  echo "Upload complete."
fi

# Clean up old local backups (keep last 7)
ls -t "$BACKUP_DIR"/mycelio_*.sql.gz | tail -n +8 | xargs -r rm
echo "Done."
