const AuditLog = require('../models/AuditLog');

module.exports = (action, entityType) => {
  return async (req, res, next) => {
    // Log after the response
    const originalSend = res.json;
    res.json = function(data) {
      // Async logging
      if (req.user) {
        AuditLog.create({
          userId: req.user._id,
          userName: req.user.name,
          action,
          entityType,
          entityId: req.params.id || req.body._id,
          changes: req.body,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }).catch(err => console.error('Audit log error:', err));
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

