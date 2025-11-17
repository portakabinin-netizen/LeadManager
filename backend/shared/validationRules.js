// Shared regex rules — used in both backend and frontend
const regex = {
  name: /^[A-Za-z.@ ]+$/,
  mobile: /^[6-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  aadhar: /^\d{12}$/,
  pin: /^\d{6}$/
};

module.exports = { regex };
