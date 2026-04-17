// const express = require("express");
// const router = express.Router();
// const ctrl = require("../../controllers/masters/certificate_controller");
// const upload = require("../../Middleware/upload");

// router.get("/", ctrl.getCertificates);
// router.post("/", ctrl.createCertificate);
// router.put("/:id", ctrl.updateCertificate);
// router.delete("/:id", ctrl.deleteCertificate);

// module.exports = router;

const express = require("express");
const router = express.Router();
const ctrl = require("../../controllers/masters/certificate_controller");
const upload = require("../../Middleware/upload");

router.get("/", ctrl.getCertificates);

// file field name = template
router.post("/", upload.single("template"), ctrl.createCertificate);
router.put("/:id", upload.single("template"), ctrl.updateCertificate);

router.delete("/:id", ctrl.deleteCertificate);

module.exports = router;