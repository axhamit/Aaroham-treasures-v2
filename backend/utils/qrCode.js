const QRCode = require('qrcode');

// Generate QR code as data URL (base64 image)
const generateQRCode = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

// Generate QR code as buffer
const generateQRCodeBuffer = async (data) => {
  try {
    const qrCodeBuffer = await QRCode.toBuffer(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeBuffer;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

module.exports = {
  generateQRCode,
  generateQRCodeBuffer,
};
