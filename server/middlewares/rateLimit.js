// const requests = new Map();

// export const rateLimit = (options = {}) => {
//   const {
//     windowMs = 15 * 60 * 1000, // 15 minutes
//     max = 100, // limit each IP to 100 requests per windowMs
//     message = 'Too many requests, please try again later.',
//   } = options;

//   return (req, res, next) => {
//     const ip = req.ip || req.connection.remoteAddress;
//     const now = Date.now();
//     const windowStart = now - windowMs;

//     if (!requests.has(ip)) {
//       requests.set(ip, []);
//     }

//     const requestTimes = requests.get(ip);
//     const filteredTimes = requestTimes.filter(time => time > windowStart);
//     filteredTimes.push(now);
//     requests.set(ip, filteredTimes);

//     if (filteredTimes.length > max) {
//       return res.status(429).json({ message });
//     }

//     next();
//   };
// };
// middlewares/rateLimit.js - UPDATED for development

const requests = new Map();

export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 3000, // ⭐ Increased for development
    message = 'Too many requests, please try again later.',
  } = options;

  return (req, res, next) => {
    // ⭐ Skip rate limiting in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const requestTimes = requests.get(ip);
    const filteredTimes = requestTimes.filter(time => time > windowStart);
    filteredTimes.push(now);
    requests.set(ip, filteredTimes);

    // Now and then, drop addresses that have been quiet for a whole window
    if (requests.size > 5000) {
      for (const [address, times] of requests) {
        if (times[times.length - 1] <= windowStart) requests.delete(address);
      }
    }

    if (filteredTimes.length > max) {
      return res.status(429).json({ message });
    }

    next();
  };
};