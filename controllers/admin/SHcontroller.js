// SHcontroller.js (debug-enabled)
const fs = require("fs");
const path = require("path");
const secondHandModel = require(`../../models/secondHandMobileDB`);

/**
 * Build nested specs from dot-notation keys like "specs.general.model"
 * - ignores empty strings
 */
function nestSpecs(flatObj) {
  const nested = {};
  for (const key in flatObj) {
    if (!Object.prototype.hasOwnProperty.call(flatObj, key)) continue;
    if (!key.startsWith("specs.")) continue;

    const val = flatObj[key];
    if (val === "") continue; // skip empty string entries

    const parts = key.split(".");
    parts.shift(); // remove "specs"
    let current = nested;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        current[part] = val;
      } else {
        if (!current[part] || typeof current[part] !== "object") current[part] = {};
        current = current[part];
      }
    }
  }
  return nested;
}

/**
 * Flatten nested object into dot-notation keys.
 * Example: flatten({ specs: { general: { model: 'x' }}}) => { 'specs.general.model': 'x' }
 */
function flatten(obj, prefix = "") {
  const out = {};
  function step(o, pfx) {
    if (o === undefined || o === null) return;
    Object.keys(o).forEach((k) => {
      const v = o[k];
      const key = pfx ? `${pfx}.${k}` : k;
      if (
        v !== null &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        !(v instanceof Date)
      ) {
        step(v, key);
      } else {
        out[key] = v;
      }
    });
  }
  step(obj, prefix);
  return out;
}

/** ========== ADD: POST (create) ========== */
exports.postSHaddMobile = async (req, res, next) => {
  try {
    console.log("===== POST ADD: RAW REQ.BODY =====");
    console.log("Keys:", Object.keys(req.body));
    // show a trimmed JSON (avoid very long dumps) but useful for debugging
    console.log(JSON.stringify(req.body, null, 2));

    const { SHname, SHprice, condition, SHdiscount, SHmrp } = req.body;
    const SHimage = req.file ? req.file.filename : null;

    // rebuild nested specs
    const nestedSpecs = nestSpecs(req.body || {});
    console.log("Nested specs to save:", JSON.stringify(nestedSpecs, null, 2));

    const SHmobile = new secondHandModel({
      SHname,
      SHprice,
      SHimage,
      condition,
      SHdiscount,
      SHmrp,
      specs: nestedSpecs,
    });

    console.log("Document (mongoose model) preview:", JSON.stringify(SHmobile, null, 2));
    await SHmobile.save();
    console.log("Saved new second-hand mobile successfully.");
    res.render(`admin/mobileAdded`);
  } catch (err) {
    console.error("===== POST ADD ERROR =====");
    console.error(err);
    res.status(500).send("Failed to add second-hand mobile.");
  }
};

/** ========== DELETE ========== */
exports.postDeleteSHmobile = (req, res, next) => {
  const SHmobileId = req.params.SHmobileId;

  secondHandModel
    .findByIdAndDelete(SHmobileId)
    .then((deletedMobile) => {
      if (!deletedMobile) {
        throw new Error("Mobile not found");
      }

      const imagePath = path.join(__dirname, "../../public/uploads", deletedMobile.SHimage);
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Failed to delete image file:", err);
        }
      });

      res.redirect("/Admin/mobileList");
    })
    .catch((err) => {
      console.error("Error during mobile delete:", err);
      res.status(500).send("Failed to delete mobile.");
    });
};

/** ========== EDIT: GET (prefilled form) ========== */
exports.getSHeditMobile = async (req, res) => {
  const { SHmobileId } = req.params;
  try {
    const mobile = await secondHandModel.findById(SHmobileId).lean();
    if (!mobile) {
      console.log(`[GET EDIT] mobile ${SHmobileId} not found`);
      return res.status(404).send("Mobile not found");
    }

    console.log("===== GET EDIT: mobile from DB =====");
    console.log("mobile._id:", mobile._id);
    // show basic fields
    console.log({
      SHname: mobile.SHname,
      SHprice: mobile.SHprice,
      SHimage: mobile.SHimage,
      condition: mobile.condition,
      SHdiscount: mobile.SHdiscount,
      SHmrp: mobile.SHmrp,
    });

    console.log("mobile.specs (raw):", JSON.stringify(mobile.specs || {}, null, 2));
    // Flatten with prefix "specs" so keys match form input names like "specs.general.model"
    const specsMap = flatten({ specs: mobile.specs || {} });
    console.log("specsMap (flattened keys sent to view):", Object.keys(specsMap).slice(0, 50));
    // show a few sample keys values (if present)
    const sampleKeys = [
      "specs.general.model",
      "specs.general.countryOfOrigin",
      "specs.display.type",
      "specs.battery.capacity",
      "specs.sound.jack",
    ];
    sampleKeys.forEach((k) => console.log(k, "=>", specsMap[k]));

    return res.render("admin/form/addSecondHandMobile", {
      isEdit: true,
      mobile,
      specsMap,
    });
  } catch (err) {
    console.error("[SH EDIT][GET] error", err);
    return res.status(500).send("Failed to load edit page.");
  }
};

/** ========== EDIT: POST (persist changes) ========== */
exports.postSHeditMobile = async (req, res) => {
  const { SHmobileId } = req.params;
  try {
    console.log("===== POST EDIT: RAW REQ.BODY =====");
    console.log("Keys:", Object.keys(req.body));
    console.log(JSON.stringify(req.body, null, 2));

    const mobile = await secondHandModel.findById(SHmobileId);
    if (!mobile) {
      console.log(`[POST EDIT] mobile ${SHmobileId} not found`);
      return res.status(404).send("Mobile not found");
    }

    // simpler fields
    const { SHname, SHprice, condition, SHdiscount, SHmrp } = req.body;

    // Rebuild nested specs object from flat keys like "specs.general.model"
    const nestedSpecs = nestSpecs(req.body || {});
    console.log("Nested specs rebuilt from POST:", JSON.stringify(nestedSpecs, null, 2));

    // Assign updated fields
    mobile.SHname = SHname;
    mobile.SHprice = SHprice;
    mobile.condition = condition;
    mobile.SHdiscount = SHdiscount;
    mobile.SHmrp = SHmrp;
    mobile.specs = nestedSpecs;

    // Handle image replace
    if (req.file && req.file.filename) {
      if (mobile.SHimage) {
        const oldPath = path.join(__dirname, "../../public/uploads", mobile.SHimage);
        fs.unlink(oldPath, (err) => {
          if (err) console.error("[SH EDIT][POST] unlink old image error", err);
        });
      }
      mobile.SHimage = req.file.filename;
    }

    console.log("About to save updated mobile:", {
      id: mobile._id,
      SHname: mobile.SHname,
      // don't dump very large specs here, but show some fields:
      specs_preview: {
        general_model: mobile.specs?.general?.model,
        battery_capacity: mobile.specs?.battery?.capacity,
        sound_jack: mobile.specs?.sound?.jack,
      },
    });

    await mobile.save();
    console.log("Saved updated mobile:", mobile._id);
    return res.redirect("/Admin/mobileList");
  } catch (err) {
    console.error("[SH EDIT][POST] error", err);
    return res.status(500).send("Failed to update second-hand mobile.");
  }
};