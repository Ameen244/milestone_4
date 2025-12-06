const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const process = require('process')
require("dotenv").config();

const SECRET = process.env.JWT_SECRET;

const logAuthEvent = (req, email, success) => {
  const ip = req.ip;
  const timestamp = new Date().toISOString();

  let successValue;
  if (success) {
    successValue = 1;
  } else {
    successValue = 0;
  }

  db.run(
    `INSERT INTO auth_logs (email, ip, success, timestamp) VALUES (?, ?, ?, ?)`,
    [email, ip, successValue, timestamp]
  );
};

const signup = (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "please fill all fields" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "password too short" });
  }

  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
    [name, email.toLowerCase(), hashed],
    function (err) {
      if (err) {
        return res.status(400).json({ error: "email already registered" });
      }

      const token = jwt.sign({ id: this.lastID }, SECRET, { expiresIn: "1h" });

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "Strict",
        maxAge: 3600000,
      });

      logAuthEvent(req, email, true);
      res.json({ message: "user created successfully" });
    }
  );
};

const login = (req, res) => {
  const { email, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email.toLowerCase()],
    (err, user) => {
      if (!user) {
        logAuthEvent(req, email, false);
        return res.status(401).json({ error: "incorrect email or password" });
      }

      const match = bcrypt.compareSync(password, user.password_hash);

      if (!match) {
        logAuthEvent(req, email, false);
        return res.status(401).json({ error: "incorrect email or password" });
      }

      const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: "1h" });

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "Strict",
        maxAge: 3600000,
      });

      logAuthEvent(req, email, true);

      res.json({ message: "login successful" });
    }
  );
};

const logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "user logged out" });
};

const createTask = (req, res) => {
  const { title, desc, date, isDone } = req.body;

  const userId = req.user.id;

  if (!title || !desc || !date) {
    return res.status(400).json({ error: "missing fields" });
  }

  let overDueValue;
  if (date && new Date(date) < new Date()) {
    overDueValue = 1;
  } else {
    overDueValue = 0;
  }

  let doneValue;
  if (isDone) {
    doneValue = 1;
  } else {
    doneValue = 0;
  }

  const sql = `
    INSERT INTO tasks (user_id, title, description, due_date, isDone, isOverDue)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [userId, title, desc, date, doneValue, overDueValue],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to create task" });
      }

      res.json({
        task_id: this.lastID,
        title,
        description: desc,
        due_date: date,
        isDone,
        message: "task created successfully",
      });
    }
  );
};

const removeTask = (req, res) => {
  const { task_id } = req.body;

  db.run(`DELETE FROM tasks WHERE task_id = ?`, [task_id], () => {
    res.json({
      task_id,
      message: "task removed successfully",
    });
  });
};

const viewTasks = (req, res) => {
  db.all(
    `SELECT task_id, title, description, due_date, isDone FROM tasks`,
    [],
    (err, rows) => {
      const out = {};
      rows.forEach((r) => {
        out[r.task_id] = [
          r.title,
          r.description,
          r.due_date,
          r.isDone ? true : false,
        ];
      });
      res.json(out);
    }
  );
};

const editTask = (req, res) => {
  const { task_id, title, desc, date, isDone } = req.body;

  let overDueValue;
  if (date && new Date(date) < new Date()) {
    overDueValue = 1;
  } else {
    overDueValue = 0;
  }

  let doneValue;
  if (isDone) {
    doneValue = 1;
  } else {
    doneValue = 0;
  }

  db.run(
    `UPDATE tasks SET title=?, description=?, due_date=?, isDone=?, isOverDue=? WHERE task_id=?`,
    [title, desc, date, doneValue, overDueValue, task_id],
    () => {
      res.json({
        task_id,
        title,
        description: desc,
        due_date: date,
        isDone,
        message: "task edited successfully",
      });
    }
  );
};

const finishTask = (req, res) => {
  const { task_id } = req.body;

  db.run(
    `UPDATE tasks SET isDone = 1, isOverDue = 0 WHERE task_id = ?`,
    [task_id],
    () => {
      res.json({
        task_id,
        message: `task with id=${task_id} has been marked complete`,
      });
    }
  );
};

const changeUserPassword = (req, res) => {
  const { email, changedPassword } = req.body;

  const hashed = bcrypt.hashSync(changedPassword, 10);

  db.run(
    `UPDATE users SET password_hash = ? WHERE email = ?`,
    [hashed, email.toLowerCase()],
    () => {
      res.json({ message: "password has been successfully changed" });
    }
  );
};

const deactivateUser = (req, res) => {
  const { email } = req.body;

  db.run(
    `UPDATE users SET is_active = 0 WHERE email = ?`,
    [email.toLowerCase()],
    () => {
      res.json({
        message: `user with email: ${email} has been deactivated`,
      });
    }
  );
};

const viewUsers = (req, res) => {
  db.all(`SELECT id, email FROM users`, [], (err, rows) => {
    const out = {};
    rows.forEach((u) => {
      out[u.id] = u.email;
    });
    res.json(out);
  });
};

const updateApp = (req, res) => {
  res.json({ message: "update v1.1 <url_for_update>" });
};

const viewLogs = (req, res) => {
  db.all(
    `SELECT email, ip, success, timestamp FROM auth_logs ORDER BY id DESC`,
    [],
    (err, rows) => {
      res.json({
        logs: rows.map((log) => {
          let status;
          if (log.success) {
            status = "LOGIN SUCCESS";
          } else {
            status = "LOGIN FAIL";
          }

          return `${status} - ${new Date(
            log.timestamp
          ).toLocaleTimeString()} (${log.ip})`;
        }),
      });
    }
  );
};

const sendOverdueTasks = (req, res) => {
  db.all(`SELECT task_id FROM tasks WHERE isOverDue = 1`, [], (err, rows) => {
    const tasks = rows.map((r) => r.task_id);
    res.json({ tasks });
  });
};

const sendReminderTasks = (req, res) => {
  const now = new Date();
  const next24 = new Date(now.getTime() + 86400000);

  db.all(
    `SELECT task_id, due_date FROM tasks WHERE isDone = 0 AND due_date IS NOT NULL`,
    [],
    (err, rows) => {
      const tasks = rows
        .filter((t) => {
          const d = new Date(t.due_date);
          return d > now && d <= next24;
        })
        .map((t) => t.task_id);

      res.json({ tasks });
    }
  );
};

const decPoints = (req, res) => {
  const { points, user_id } = req.body;

  db.run(
    `UPDATE users SET points = points - ? WHERE id = ?`,
    [points, user_id],
    () => {
      res.json({
        message: `decreased ${points} points from user with id=${user_id}`,
      });
    }
  );
};

const incPoints = (req, res) => {
  const { points, user_id } = req.body;

  db.run(
    `UPDATE users SET points = points + ? WHERE id = ?`,
    [points, user_id],
    () => {
      res.json({
        message: `increased ${points} points from user with id=${user_id}`,
      });
    }
  );
};

const getPoints = (req, res) => {
  const { user_id } = req.body.user_id;

  db.get(`SELECT points FROM users WHERE id = ?`, [user_id], (err, row) => {
    let value;
    if (row) {
      value = row.points;
    } else {
      value = 0;
    }

    res.json({ points: value });
  });
};

module.exports = {
  signup,
  login,
  logout,
  createTask,
  removeTask,
  viewTasks,
  editTask,
  finishTask,
  changeUserPassword,
  updateApp,
  deactivateUser,
  viewUsers,
  viewLogs,
  sendOverdueTasks,
  sendReminderTasks,
  decPoints,
  incPoints,
  getPoints,
};
