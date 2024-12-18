const { verifyToken } = require("../../config/jwtconfig");

const checkUserAuthenticated = (req, res, next) => {
  // const token = req.headers.authorization?.split(" ")[1];

  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const decoded = verifyToken(token);
  console.log(decoded);

  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    username: decoded.username,
  };
  next();
};

const checkUserRole = (allowedRoles) => {
  return (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json({ error: "Invalid token" });
      }

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error("Error verifying token:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  };
};

module.exports = { checkUserAuthenticated, checkUserRole };
