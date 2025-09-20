import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { statusesAPI, usersAPI } from "../services/api";
import './Dashboard.css';

const STATUS_COLORS = {
  Working: "#1a6bddff",
  "Working Remotely": "#abc8e0ff",
  "On Vacation": "rgba(232, 255, 27, 1)",
  "Business Trip": "#f9ffa4ff",
};

const getStatusColor = (statusName) => STATUS_COLORS[statusName] || "#757575";

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
  const [teamMembers, setTeamMembers] = useState([]);
  const [myStatus, setMyStatus] = useState("Working");
  const [filterStatus, setFilterStatus] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, statusesRes] = await Promise.all([
        usersAPI.getAllUsers(),
        statusesAPI.getAllStatuses(),
      ]);

      const rawUsers = usersRes.data?.users ?? [];
      const normUsers = rawUsers.map(normalizeMember);
      setTeamMembers(normUsers);

      const sts = statusesRes.data?.statuses ?? [];
      setStatuses(sts);

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

      console.log("res");
      const srvUser = res.data?.user;
      console.log("srvUser", srvUser);
      if (srvUser) {
        console.log("this is srvUser");
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
          <h2>My Status</h2>
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
            <h2>Team Members</h2>
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
