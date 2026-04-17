const Certificate = require("../../model/masters/certificate_model");

const getCertificates = async (req, res) => {
  try {
    const data = await Certificate.getAll();
    res.json(data);
    
  } catch (err) {
    console.error("Get certificates error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const createCertificate = async (req, res) => {
  try {
    const { training_id } = req.body;
    const status = Number(req.body.status) === 0 ? 0 : 1;

    if (!training_id) {
      return res.status(400).json({ message: "training_id is required" });
    }

    const existing = await Certificate.findByTraining(training_id);
    if (existing) {
      return res
        .status(400)
        .json({ message: "A certificate for this training already exists" });
    }

    // file info from multer
    const file = req.file;

    const payload = {
      training_id,
      template_name: file ? file.originalname : null,
      template_path: file ? `/uploads/certificates/${file.filename}` : null,
      status,
      created_by: req.body.created_by || 1,
    };

    const id = await Certificate.create(payload);

    res.json({ message: "Certificate created", id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

const updateCertificate = async (req, res) => {
  try {
    const { training_id } = req.body;
    const status =
      req.body.status === undefined || req.body.status === null || req.body.status === ""
        ? undefined
        : Number(req.body.status) === 0
          ? 0
          : 1;
    const certId = req.params.id;

    if (!training_id) {
      return res.status(400).json({ message: "training_id is required" });
    }

    // ensure updating to a training that isn't already used by another cert
    const existing = await Certificate.findByTraining(training_id);
    if (existing && existing.id !== Number(certId)) {
      return res
        .status(400)
        .json({ message: "Another certificate for this training already exists" });
    }

    // If a new file was uploaded, include its info; otherwise only update training_id
    const file = req.file;
    const payload = { training_id };
    if (status !== undefined) {
      payload.status = status;
    }
    if (file) {
      payload.template_name = file.originalname;
      payload.template_path = `/uploads/certificates/${file.filename}`;
    }

    await Certificate.update(certId, payload);
    res.json({ message: "Certificate updated" });
  } catch (err) {
    console.error("Update certificate error:", err);
    const msg = err.message || "Server error";
    res.status(500).json({ message: msg });
  }
};

const deleteCertificate = async (req, res) => {
  try {
    await Certificate.delete(req.params.id);
    res.json({ message: "Certificate deleted" });
  } catch (err) {
    console.error("Delete certificate error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCertificates,
  createCertificate,
  updateCertificate,
  deleteCertificate,
};