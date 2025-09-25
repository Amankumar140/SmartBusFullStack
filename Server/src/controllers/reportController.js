const db = require('../config/db');

exports.submitReport = async (req, res) => {
  const { reportType, busId, locationLat, locationLon, description } = req.body;
  const userId = req.user.id; // From authMiddleware

  // req.file is added by multer. It contains info about the uploaded file.
  const mediaUrl = req.file ? req.file.path : null;

  try {
    // UPDATED FOR NEW SCHEMA - using new field names and structure
    const sql = 'INSERT INTO reports (user_id, bus_id, report_type, location_lat, location_lon, description, media_url) VALUES (?, ?, ?, ?, ?, ?, ?)';
    await db.query(sql, [userId, busId || null, reportType, locationLat || null, locationLon || null, description, mediaUrl]);

    res.status(201).json({ 
      success: true,
      message: 'Report submitted successfully!' 
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get all reports for admin - NEW FUNCTION
exports.getAllReports = async (req, res) => {
  try {
    const query = `
      SELECT 
        r.report_id,
        r.user_id,
        u.name as user_name,
        u.mobile as user_mobile,
        r.bus_id,
        b.bus_number,
        r.report_type,
        r.location_lat,
        r.location_lon,
        r.description,
        r.media_url,
        r.created_at
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN buses b ON r.bus_id = b.bus_id
      ORDER BY r.created_at DESC
      LIMIT 50
    `;
    
    const [reports] = await db.query(query);
    
    res.json({
      success: true,
      reports: reports
    });
    
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get user's own reports
exports.getUserReports = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const query = `
      SELECT 
        r.report_id,
        r.bus_id,
        b.bus_number,
        r.report_type,
        r.location_lat,
        r.location_lon,
        r.description,
        r.media_url,
        r.created_at
      FROM reports r
      LEFT JOIN buses b ON r.bus_id = b.bus_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;
    
    const [reports] = await db.query(query, [userId]);
    
    res.json({
      success: true,
      reports: reports
    });
    
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
};
