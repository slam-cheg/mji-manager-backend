export const Health = (_req, res) => {
  res.status(200).json({ status: "ok", service: "mji-manager-backend" });
};
