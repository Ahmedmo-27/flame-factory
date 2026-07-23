require("dotenv").config();
const mongoose = require("mongoose");
const Member = require("../models/Member");
const { generateBarcode } = require("../utils/barcodeHelper");

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const members = await Member.find({
        memberId: { $ne: null },
        $or: [{ barcode: null }, { barcode: { $exists: false } }],
    });

    console.log(`Found ${members.length} member(s) missing barcodes`);

    let updated = 0;
    for (const m of members) {
        const barcode = generateBarcode(m.memberId);
        try {
            await Member.updateOne({ _id: m._id }, { $set: { barcode } });
            console.log(`  ✓ ${m.name} (memberId: ${m.memberId}) → ${barcode}`);
            updated++;
        } catch (err) {
            console.error(`  ✗ ${m.name} — ${err.message}`);
        }
    }

    console.log(`\nDone. Updated ${updated} / ${members.length} members.`);
    await mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
