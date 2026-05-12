const multer = require('multer');
const fs = require('fs');

// Kreiranje foldera za slike ako ne postoji
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Konfiguracija Multer za slike računa
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
