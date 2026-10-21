import jwt from "jsonwebtoken";

export function requireUser(req, res, next) {
  const header = req.headers.authorization ?? "";
  const token = header.replace(/^Bearer /, "");
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: claims.sub, orgId: claims.org_id };
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}
