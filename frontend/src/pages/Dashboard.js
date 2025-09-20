import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { statusesAPI, usersAPI } from "../services/api";
import './Dashboard.css';

// Color scheme for different status types

const STATUS_COLORS = {
  Working: "#1a6bddff",
  "Working Remotely": "#16174aff",
  "On Vacation": "rgba(177, 177, 174, 1)",
  "Business Trip": "#f7d541",
};

// Helper to get color for a status, with fallback
const getStatusColor = (statusName) => STATUS_COLORS[statusName] || "#757575";

// Helper to normalize user data since it might come in different formats
const normalizeMember = (raw) => {
  const statusName =
    raw.status ??
    (typeof raw.currentStatus === "string"
      ? raw.currentStatus
      : raw.currentStatus?.name) ??
    "Working";

  return {
    ...raw,
    status: statusName,
  };
};

const DashboardPage = () => {
  const { user, logout, updateUser } = useAuth();
  // State for all the data we need
  const [teamMembers, setTeamMembers] = useState([]);    // List of all team members
  const [myStatus, setMyStatus] = useState("Working");   // Current user's status
  const [filterStatus, setFilterStatus] = useState([]); // Which statuses to show
  const [statuses, setStatuses] = useState([]);         // Available status options
  const [isLoading, setIsLoading] = useState(true);     // Loading initial data
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Updating status
  const [error, setError] = useState(null);             // Any errors

  // Function to load all data when page starts
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get users and available statuses at the same time
      const [usersRes, statusesRes] = await Promise.all([
        usersAPI.getAllUsers(),
        statusesAPI.getAllStatuses(),
      ]);

      // Process user data to make sure status format is consistent
      const rawUsers = usersRes.data?.users ?? [];
      const normUsers = rawUsers.map(normalizeMember);
      setTeamMembers(normUsers);

      // Set available status options
      const sts = statusesRes.data?.statuses ?? [];
      setStatuses(sts);

      // Find current user's status
      if (user) {
      const me = normUsers.find(u => u.id === user.id || u.username === user.username);
      if (me) setMyStatus(me.status ?? null);
    }


    } catch (e) {
      console.error("Error loading data:", e?.response?.data || e.message);
      setError(e?.response?.data?.error || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleFilter = (statusName) => {
    setFilterStatus((prev) =>
      prev.includes(statusName)
        ? prev.filter((s) => s !== statusName)
        : [...prev, statusName]
    );
  };

  const filteredMembers = useMemo(() => {
    if (!filterStatus.length) return teamMembers;
    return teamMembers.filter((m) => filterStatus.includes(m.status));
  }, [teamMembers, filterStatus]);

  const handleStatusUpdate = async (statusName) => {
    
    setIsUpdatingStatus(true);
    setError(null);
    try {
      const statusObj = statuses.find((s) => s.name === statusName);
      if (!statusObj) throw new Error("Status not found");

      const res = await usersAPI.updateUserStatus(statusObj.id);

      const srvUser = res.data?.user;
      if (srvUser) {
        updateUser({
          currentStatus:
            typeof srvUser.currentStatus === "string"
              ? srvUser.currentStatus
              : statusObj.name,
          statusId: srvUser.statusId ?? statusObj.id,
        });
      }

      setMyStatus(statusName);
      await loadData();
    } catch (e) {
      console.error("Error updating status:", e?.response?.data || e.message);
      setError(e?.response?.data?.error || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <div className="status-container">
      <header className="status-header">
        <h1>Team Availability System</h1>
        <div className="header-actions">
          <span className="welcome-message">
            Welcome, {user?.fullName || user?.username}
          </span>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>

      <div className="status-content">
        {error && <div className="error-banner">{error}</div>}

        <div className="my-status-section">
          <h2>Update my current status:</h2>
          <div className="status-selector">
            {statuses.map((status) => {
              const active = myStatus === status.name;
              const color = getStatusColor(status.name);
              return (
                <button
                  key={status.id}
                  className={`status-option ${active ? "active" : ""}`}
                  onClick={() => handleStatusUpdate(status.name)}
                  disabled={isUpdatingStatus}
                  style={{
                    backgroundColor: active ? color : "transparent",
                    borderColor: color,
                    color: active ? "white" : color,
                    cursor: isUpdatingStatus ? "not-allowed" : "pointer",
                  }}
                >
                  {status.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Team Members Section */}
        <div className="team-status-section">
          <div className="section-header">
            <h2>List of employees:</h2>
            <div className="filter-section">
              <span className="filter-label">Filter by status:</span>
              <div className="filter-chips">
                {statuses.map((status) => {
                  const active = filterStatus.includes(status.name);
                  const color = getStatusColor(status.name);
                  return (
                    <button
                      key={status.id}
                      className={`filter-chip ${active ? "active" : ""}`}
                      onClick={() => toggleFilter(status.name)}
                      style={{
                        backgroundColor: active ? color : "transparent",
                        borderColor: color,
                        color: active ? "white" : color,
                      }}
                    >
                      {status.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="team-members-grid">
            {filteredMembers.map((member) => {
              const color = getStatusColor(member.status);
              const isMe =
                user &&
                (member.id === user.id || member.username === user.username);
              return (
                <div
                  key={member.id}
                  className={`member-card ${isMe ? "current-user" : ""}`}
                  style={{ borderLeftColor: color }}
                >
                  <div className="member-info">
                    <h3>{member.fullName || member.username}</h3>
                    {isMe && <span className="you-badge">You</span>}
                  </div>
                  <div className="member-status" style={{ color }}>
                    {member.status}
                  </div>
                  <div className="member-updated">
                    Updated:{" "}
                    {member.updatedAt
                      ? new Date(member.updatedAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
              );
            })}
            {!filteredMembers.length && (
              <div className="empty-state">
                No team members match the selected filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
