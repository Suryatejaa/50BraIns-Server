-- Add cron leader election table for Railway deployment
CREATE TABLE IF NOT EXISTS cron_leader (
    id VARCHAR(50) PRIMARY KEY,
    instance_id VARCHAR(100) NOT NULL,
    last_heartbeat TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Create indexes separately for PostgreSQL compatibility
CREATE INDEX IF NOT EXISTS idx_cron_leader_heartbeat ON cron_leader (last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_cron_leader_instance ON cron_leader (instance_id);