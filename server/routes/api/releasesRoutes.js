import multer from "multer";
import {
  activateRelease,
  getReleaseMeta,
  listAllReleases,
  streamActiveInstaller,
  uploadRelease,
} from "../../releases/releases.service.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

export function ReleasesMeta(req, res) {
  getReleaseMeta()
    .then((meta) => res.json(meta))
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function ReleasesInstaller(req, res) {
  streamActiveInstaller(res);
}

export function AdminListReleases(req, res) {
  listAllReleases()
    .then((rows) => res.json(rows))
    .catch((err) => res.status(500).json({ error: err.message }));
}

export const AdminUploadRelease = [
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }
    const activate = req.body.activate !== "false" && req.body.activate !== false;
    uploadRelease({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      appVersion: req.body.appVersion,
      uploadedByEmail: req.user?.login,
      activate,
    })
      .then((release) => res.status(201).json(release))
      .catch((err) => res.status(err.status || 500).json({ error: err.message }));
  },
];

export function AdminActivateRelease(req, res) {
  activateRelease(req.params.id)
    .then((release) => res.json(release))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
}
