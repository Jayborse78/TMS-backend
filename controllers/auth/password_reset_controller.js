const PasswordResetModel = require("../../model/auth/password_reset_model");
const {
  sendEmail,
  isEmailConfigured,
  getMissingEmailConfigKeys,
} = require("../../services/email_service");

const isAdmin = (req) => Number(req?.user?.role) === 2;

const generateSimplePassword = () => {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let generated = "";

  for (let index = 0; index < 6; index += 1) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    generated += characters[randomIndex];
  }

  return generated;
};

const isValidSimplePassword = (value) => {
  return /^[A-Z2-9]{6}$/.test(String(value || ""));
};

const getEmailFailureResponse = (emailStatus, defaultMessage) => {
  if (emailStatus?.reason === "smtp-placeholder-password") {
    return {
      message: "SMTP_PASS is not configured. Use a real Gmail App Password in Backend .env",
      reason: emailStatus.reason,
    };
  }

  if (emailStatus?.reason === "smtp-send-failed") {
    const rawError = String(emailStatus.error || "");

    if (rawError.toLowerCase().includes("badcredentials") || rawError.toLowerCase().includes("username and password not accepted")) {
      return {
        message: "SMTP authentication failed. Set correct Gmail App Password in Backend .env",
        reason: emailStatus.reason,
      };
    }
  }

  return {
    message: defaultMessage,
    reason: emailStatus?.reason,
  };
};

const getAdminRecipientList = async () => {
  const adminRows = await PasswordResetModel.getAdminEmails();
  const adminEmails = adminRows.map((row) => row.email).filter(Boolean);

  if (process.env.ADMIN_EMAIL) {
    adminEmails.push(process.env.ADMIN_EMAIL);
  }

  return [...new Set(adminEmails)];
};

const requestPasswordReset = async (req, res) => {
  const { usernameOrEmail } = req.body;

  if (!usernameOrEmail) {
    return res.status(400).json({ message: "Username or email is required" });
  }

  try {
    const user = await PasswordResetModel.findUserByUsernameOrEmail(usernameOrEmail.trim());

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const pendingRequest = await PasswordResetModel.hasPendingRequest(user.id);

    if (pendingRequest) {
      if (!isEmailConfigured()) {
        return res.status(500).json({
          message: "Email service is not configured on server",
          missingConfig: getMissingEmailConfigKeys(),
        });
      }

      const uniqueAdminEmails = await getAdminRecipientList();

      if (uniqueAdminEmails.length === 0) {
        return res.status(400).json({
          message: "No admin email is configured. Please contact system admin.",
        });
      }

      const reminderStatus = await sendEmail({
        to: uniqueAdminEmails.join(","),
        subject: "Password reset approval reminder",
        text: `Reminder: User ${user.name || user.username} (${user.username}) still has a pending password reset approval request.`,
        html: `<p>Reminder: User <strong>${user.name || user.username}</strong> (${user.username}) still has a pending password reset approval request.</p>`,
      });

      if (!reminderStatus.sent) {
        const failureResponse = getEmailFailureResponse(
          reminderStatus,
          "Unable to send reminder email to admin",
        );
        return res.status(500).json({
          ...failureResponse,
        });
      }

      return res.status(200).json({
        message: "Reset request is already pending. Reminder sent to admin.",
        emailSent: true,
        alreadyPending: true,
      });
    }

    if (!isEmailConfigured()) {
      return res.status(500).json({
        message: "Email service is not configured on server",
        missingConfig: getMissingEmailConfigKeys(),
      });
    }

    const now = new Date();

    const inserted = await PasswordResetModel.createRequest({
      user_id: user.id,
      status: "pending",
      requested_at: now,
      created_by: user.id,
      updated_by: user.id,
      created_date: now,
      updated_date: now,
      is_deleted: 0,
    });

    const requestId = Array.isArray(inserted) ? inserted[0] : inserted;

    const uniqueAdminEmails = await getAdminRecipientList();

    if (uniqueAdminEmails.length === 0) {
      await PasswordResetModel.markRequestDeleted(requestId, user.id);
      return res.status(400).json({
        message: "No admin email is configured. Please contact system admin.",
      });
    }

    const emailStatus = await sendEmail({
      to: uniqueAdminEmails.join(","),
      subject: "Password reset approval request",
      text: `User ${user.name || user.username} (${user.username}) requested password reset approval.`,
      html: `<p>User <strong>${user.name || user.username}</strong> (${user.username}) requested password reset approval.</p>`,
    });

    if (!emailStatus.sent) {
      await PasswordResetModel.markRequestDeleted(requestId, user.id);
      const failureResponse = getEmailFailureResponse(
        emailStatus,
        "Unable to send request email to admin",
      );
      return res.status(500).json({
        ...failureResponse,
      });
    }

    return res.status(200).json({
      message: "Password reset request sent to admin for approval",
      emailSent: true,
    });
  } catch (error) {
    console.error("Error in password reset request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getPendingResetRequests = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Only admin can view reset requests" });
  }

  try {
    const rows = await PasswordResetModel.getPendingRequests();
    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching pending reset requests:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const approveResetRequest = async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: "Only admin can approve reset requests" });
  }

  const { id } = req.params;
  const requestedPassword = req.body?.tempPassword;

  try {
    const requestRow = await PasswordResetModel.getRequestById(id);

    if (!requestRow) {
      return res.status(404).json({ message: "Reset request not found" });
    }

    if (requestRow.status !== "pending") {
      return res.status(400).json({ message: "Reset request already processed" });
    }

    if (!isEmailConfigured()) {
      return res.status(500).json({
        message: "Email service is not configured on server",
        missingConfig: getMissingEmailConfigKeys(),
      });
    }

    if (!requestRow.email) {
      return res.status(400).json({ message: "User email is missing" });
    }

    const existingUser = await PasswordResetModel.getUserPasswordById(requestRow.user_id);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const tempPassword = isValidSimplePassword(requestedPassword)
      ? requestedPassword
      : generateSimplePassword();
    const now = new Date();

    await PasswordResetModel.updateUserPassword(requestRow.user_id, tempPassword);

    const emailStatus = await sendEmail({
      to: requestRow.email,
      subject: "Your new TMS password",
      text: `Hi ${requestRow.name || requestRow.username}, your password reset request is approved. Your new password is: ${tempPassword}`,
      html: `<p>Hi <strong>${requestRow.name || requestRow.username}</strong>,</p><p>Your password reset request is approved.</p><p>Your new password is: <strong>${tempPassword}</strong></p>`,
    });

    if (!emailStatus.sent) {
      await PasswordResetModel.updateUserPassword(requestRow.user_id, existingUser.password);
      const failureResponse = getEmailFailureResponse(
        emailStatus,
        "Unable to send new password email to user",
      );
      return res.status(500).json({
        ...failureResponse,
      });
    }

    await PasswordResetModel.approveRequest(id, {
      status: "approved",
      approved_at: now,
      approved_by: req.user.id,
      temp_password: tempPassword,
      updated_by: req.user.id,
      updated_date: now,
    });

    return res.status(200).json({
      message: "Request approved and new password generated",
      emailSent: true,
    });
  } catch (error) {
    console.error("Error approving reset request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  requestPasswordReset,
  getPendingResetRequests,
  approveResetRequest,
};
