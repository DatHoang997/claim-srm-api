const multer = require('multer');
const uniqueFilename = require('unique-filename')
const UPLOAD_FILES_DIR = "./public/images/website";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_FILES_DIR);
  },
  // change the names of your files)
  filename(req, file = {}, cb) {
    file.mimetype = "image/jpeg";
    const {originalname} = file;
    const fileExtension = (originalname.match(/\.+[\S]+$/) || [])[0];
    const fileName = uniqueFilename('')
    cb(null, `${fileName}${fileExtension}`);
  }
});
const upload = multer({storage});

module.exports = upload
