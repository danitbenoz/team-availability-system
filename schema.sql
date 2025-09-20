-- Team Availability System Database Schema

-- Create the database (run this if the database doesn't exist)
CREATE DATABASE team_availability;

-- Connect to the database
 \c team_availability;

-- Create statuses table
CREATE TABLE IF NOT EXISTS statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    current_status_id INTEGER REFERENCES statuses(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default statuses
INSERT INTO statuses (name) VALUES
    ('Working'),
    ('Working Remotely'),
    ('On Vacation'),
    ('Bussiness Trip')
ON CONFLICT (name) DO NOTHING;

-- Insert sample users (passwords are hashed for 'password123')
INSERT INTO users (username, email, password, full_name, current_status_id) VALUES
    ('jon.snow', 'jon.snow@example.com', '$2b$12$hG/Nj/Y4307lnnDN9k8.zObw6nZdA/zPPsDAdTxWmQYW0NkECjwcW','Jon Snow', 1),
    ('sansa.stark', 'sansa.stark@example.com','$2b$12$hG/Nj/Y4307lnnDN9k8.zObw6nZdA/zPPsDAdTxWmQYW0NkECjwcW', 'Sansa Stark', 2),
    ('bran.stark', 'bran.stark@example.com', '$2b$12$hG/Nj/Y4307lnnDN9k8.zObw6nZdA/zPPsDAdTxWmQYW0NkECjwcW', 'Bran Stark', 3),
    ('arya.stark','arya.stark@example.com' ,'$2b$12$hG/Nj/Y4307lnnDN9k8.zObw6nZdA/zPPsDAdTxWmQYW0NkECjwcW', 'Arya Strak', 4)
ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(current_status_id);