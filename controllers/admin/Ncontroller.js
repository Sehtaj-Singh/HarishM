const fs = require('fs');
const path = require('path');
const newModel = require(`../../models/newMobileDB`);

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
exports.postNaddMobile = async (req, res, next) => {
  try {
    console.log("===== [N ADD][POST] RAW REQ.BODY =====");
    console.log("Keys:", Object.keys(req.body));
    console.log(JSON.stringify(req.body, null, 2));

    const { Nname, Nprice, Ndiscount, Nmrp,Nrating } = req.body;
    const Nimage = req.file ? req.file.filename : null;

    // rebuild nested specs
    const nestedSpecs = nestSpecs(req.body || {});
    console.log("[N ADD] Nested specs to save:", JSON.stringify(nestedSpecs, null, 2));

    const Nmobile = new newModel({
      Nname,
      Nprice,
      Nimage,
      Ndiscount,
      Nmrp,
      Nrating,
      specs: nestedSpecs,
    });

    console.log("[N ADD] Document preview:", JSON.stringify(Nmobile, null, 2));
    await Nmobile.save();

    console.log("[N ADD] Saved new mobile successfully.");
    return res.render(`admin/mobileAdded`);
  } catch (err) {
    console.error("===== [N ADD][POST] ERROR =====");
    console.error(err);
    return res.status(500).send("Failed to add new mobile.");
  }
};



exports.postDeleteNmobile = (req, res, next) => {
  const NmobileId = req.params.NmobileId;

  
  newModel.findByIdAndDelete(NmobileId)
      .then(deletedMobile => {
        if (!deletedMobile) {
          throw new Error('Mobile not found');
        }
  
        // Delete the associated image
        const imagePath = path.join(__dirname, '../../public/uploads', deletedMobile.Nimage);
        fs.unlink(imagePath, err => {
          if (err) {
            console.error('Failed to delete image file:', err);
            // Not fatal, we proceed
          }
        });
  
        res.redirect('/Admin/mobileList');
      })
      .catch(err => {
        console.error('Error during mobile delete:', err);
        res.status(500).send('Failed to delete mobile.');
      });
};

/** ========== EDIT: GET (prefilled form) ========== */
exports.getNeditMobile = async (req, res) => {
  const { NmobileId } = req.params;
  try {
    const mobile = await newModel.findById(NmobileId).lean();
    if (!mobile) {
      console.log(`[N EDIT][GET] mobile ${NmobileId} not found`);
      return res.status(404).send("Mobile not found");
    }

    console.log("===== [N EDIT][GET] mobile from DB =====");
    console.log("mobile._id:", mobile._id);
    console.log({
      Nname: mobile.Nname,
      Nprice: mobile.Nprice,
      Nimage: mobile.Nimage,
      Ndiscount: mobile.Ndiscount,
      Nmrp: mobile.Nmrp,
    });
    console.log("[N EDIT][GET] mobile.specs (raw):", JSON.stringify(mobile.specs || {}, null, 2));

    // Flatten with prefix "specs" so keys match form input names like "specs.general.model"
    const specsMap = flatten({ specs: mobile.specs || {} });
    console.log("[N EDIT][GET] specsMap keys (sample):", Object.keys(specsMap).slice(0, 50));

    const sampleKeys = [
      "specs.general.model",
      "specs.general.countryOfOrigin",
      "specs.display.type",
      "specs.battery.capacity",
      "specs.sound.jack",
    ];
    sampleKeys.forEach((k) => console.log(k, "=>", specsMap[k]));

    return res.render("admin/form/addNewMobile", {
      isEdit: true,
      mobile,
      specsMap,
    });
  } catch (err) {
    console.error("[N EDIT][GET] error", err);
    return res.status(500).send("Failed to load edit page.");
  }
};

/** ========== EDIT: POST (persist changes) ========== */
exports.postNeditMobile = async (req, res) => {
  const { NmobileId } = req.params;
  try {
    console.log("===== [N EDIT][POST] RAW REQ.BODY =====");
    console.log("Keys:", Object.keys(req.body));
    console.log(JSON.stringify(req.body, null, 2));

    const mobile = await newModel.findById(NmobileId);
    if (!mobile) {
      console.log(`[N EDIT][POST] mobile ${NmobileId} not found`);
      return res.status(404).send("Mobile not found");
    }

    // simpler fields
    const { Nname, Nprice, Ndiscount, Nmrp,Nrating} = req.body;

    // Rebuild nested specs object from flat keys like "specs.general.model"
    const nestedSpecs = nestSpecs(req.body || {});
    console.log("[N EDIT][POST] Nested specs rebuilt:", JSON.stringify(nestedSpecs, null, 2));

    // Assign updated fields
    mobile.Nname = Nname;
    mobile.Nprice = Nprice;
    mobile.Ndiscount = Ndiscount;
    mobile.Nmrp = Nmrp;
    mobile.Nrating = Nrating
    mobile.specs = nestedSpecs;

    // Handle image replace
    if (req.file && req.file.filename) {
      if (mobile.Nimage) {
        const oldPath = path.join(__dirname, "../../public/uploads", mobile.Nimage);
        fs.unlink(oldPath, (err) => {
          if (err) console.error("[N EDIT][POST] unlink old image error", err);
        });
      }
      mobile.Nimage = req.file.filename;
    }

    console.log("[N EDIT][POST] About to save updated mobile:", {
      id: mobile._id,
      Nname: mobile.Nname,
      // preview of a few spec fields
      specs_preview: {
        general_model: mobile.specs?.general?.model,
        battery_capacity: mobile.specs?.battery?.capacity,
        sound_jack: mobile.specs?.sound?.jack,
      },
    });

    await mobile.save();
    console.log("[N EDIT][POST] Saved updated mobile:", mobile._id);
    return res.redirect("/Admin/mobileList");
  } catch (err) {
    console.error("[N EDIT][POST] error", err);
    return res.status(500).send("Failed to update mobile.");
  }
};

